export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { guardManualAssignSchema } from '@/lib/validators/schemas'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, guardManualAssignSchema)
  if (!validation.success) return validation.response

  const { periodId, assignments } = validation.data

  try {
    const adminClient = createAdminClient()

    // 1. Get period dates for vacation check
    const { data: period, error: periodError } = await adminClient
      .from('guard_periods')
      .select('id, start_date, end_date')
      .eq('id', periodId)
      .single()

    if (periodError || !period) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })
    }

    // 2. Collect staff IDs to validate
    const staffIds = [assignments.auxilio, assignments.tramitador, assignments.gestor].filter(Boolean) as string[]

    if (staffIds.length > 0) {
      // 3. Check staff are active and guard-eligible
      const { data: staffData, error: staffError } = await adminClient
        .from('staff')
        .select('id, first_name, last_name, is_active, is_guard_eligible')
        .in('id', staffIds)

      if (staffError) throw staffError

      const warnings: string[] = []
      for (const sid of staffIds) {
        const s = staffData?.find(x => x.id === sid)
        if (!s) {
          return NextResponse.json({ error: `Personal con ID ${sid} no encontrado.` }, { status: 400 })
        }
        if (!s.is_active) {
          return NextResponse.json({ error: `${s.first_name} ${s.last_name} esta desactivado/a.` }, { status: 400 })
        }
        if (!s.is_guard_eligible) {
          warnings.push(`${s.first_name} ${s.last_name} no esta marcado/a como elegible para guardias.`)
        }
      }

      // 4. Check vacation conflicts
      const { data: vacations } = await adminClient
        .from('vacations')
        .select('staff_id, start_date, end_date, staff(first_name, last_name)')
        .in('staff_id', staffIds)
        .eq('status', 'approved')
        .lte('start_date', period.end_date)
        .gte('end_date', period.start_date)

      if (vacations && vacations.length > 0) {
        const conflicts = vacations.map(v => {
          const staffInfo = v.staff as unknown as { first_name: string; last_name: string } | null
          const name = staffInfo?.first_name || v.staff_id
          return `${name} tiene vacaciones del ${v.start_date} al ${v.end_date}`
        })
        return NextResponse.json({
          error: 'Conflicto con vacaciones aprobadas',
          conflicts,
        }, { status: 409 })
      }
    }

    // 5. Delete + Insert atómico con backup para rollback
    const { data: existingBackup } = await adminClient
      .from('guard_assignments')
      .select('guard_period_id, staff_id, assigned_by')
      .eq('guard_period_id', periodId)

    const { error: deleteError } = await adminClient
      .from('guard_assignments')
      .delete()
      .eq('guard_period_id', periodId)

    if (deleteError) throw deleteError

    // 6. Insert new assignments
    const inserts = []
    if (assignments.auxilio) {
      inserts.push({ guard_period_id: periodId, staff_id: assignments.auxilio, assigned_by: 'manual' })
    }
    if (assignments.tramitador) {
      inserts.push({ guard_period_id: periodId, staff_id: assignments.tramitador, assigned_by: 'manual' })
    }
    if (assignments.gestor) {
      inserts.push({ guard_period_id: periodId, staff_id: assignments.gestor, assigned_by: 'manual' })
    }

    if (inserts.length > 0) {
      const { error: insertError } = await adminClient
        .from('guard_assignments')
        .insert(inserts)

      if (insertError) {
        // Rollback: restaurar asignaciones previas
        if (existingBackup && existingBackup.length > 0) {
          await adminClient.from('guard_assignments').insert(existingBackup)
        }
        throw insertError
      }
    }

    // 7. Log de actividad (no bloquea la operación)
    try {
      await adminClient.from('activity_log').insert({
        action: 'manual_assign',
        entity_type: 'guard_assignment',
        entity_id: periodId,
        details: { assignments, inserts_count: inserts.length },
        performed_by: null,
      })
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, message: 'Guardia actualizada correctamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
