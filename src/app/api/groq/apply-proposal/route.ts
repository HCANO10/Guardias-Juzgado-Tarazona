export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { groqApplyProposalSchema } from '@/lib/validators/schemas'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, groqApplyProposalSchema)
  if (!validation.success) return validation.response

  const { assignments, respectExisting } = validation.data

  try {
    const adminClient = createAdminClient()

    // Collect all period IDs affected
    const periodIds = Array.from(new Set(assignments.map(a => a.guard_period_id)))

    // Build flat inserts from the AI proposal
    const inserts: { guard_period_id: string; staff_id: string; assigned_by: string }[] = []
    for (const a of assignments) {
      if (a.auxilio_staff_id) inserts.push({ guard_period_id: a.guard_period_id, staff_id: a.auxilio_staff_id, assigned_by: 'ai' })
      if (a.tramitador_staff_id) inserts.push({ guard_period_id: a.guard_period_id, staff_id: a.tramitador_staff_id, assigned_by: 'ai' })
      if (a.gestor_staff_id) inserts.push({ guard_period_id: a.guard_period_id, staff_id: a.gestor_staff_id, assigned_by: 'ai' })
    }

    if (inserts.length === 0) {
      return NextResponse.json({ error: 'No hay asignaciones para aplicar' }, { status: 400 })
    }

    // --- Backup existing assignments for rollback ---
    const { data: existingBackup, error: backupErr } = await adminClient
      .from('guard_assignments')
      .select('guard_period_id, staff_id, assigned_by')
      .in('guard_period_id', periodIds)

    if (backupErr) throw new Error('Error leyendo asignaciones actuales para backup')

    // --- Delete phase ---
    let deleteQuery = adminClient.from('guard_assignments').delete().in('guard_period_id', periodIds)
    if (respectExisting) {
      deleteQuery = deleteQuery.eq('assigned_by', 'ai')
    }

    const { error: delErr } = await deleteQuery
    if (delErr) throw new Error(`Error eliminando asignaciones previas: ${delErr.message}`)

    // --- Insert phase ---
    const { error: insErr } = await adminClient.from('guard_assignments').insert(inserts)

    if (insErr) {
      // ROLLBACK: re-insert the backup data
      console.error('Error insertando nuevas asignaciones, intentando rollback...', insErr)
      if (existingBackup && existingBackup.length > 0) {
        const { error: rollbackErr } = await adminClient.from('guard_assignments').insert(existingBackup)
        if (rollbackErr) {
          console.error('ROLLBACK TAMBIÉN FALLÓ:', rollbackErr)
          throw new Error(
            `Error al insertar nuevas asignaciones Y al restaurar las anteriores. ` +
            `Contacta al administrador. Error original: ${insErr.message}`
          )
        }
      }
      throw new Error(`Error al insertar nuevas asignaciones (se restauraron las anteriores): ${insErr.message}`)
    }

    // Log activity
    try {
      await adminClient.from('activity_log').insert({
        action: 'ai_proposal_applied',
        entity_type: 'guard_assignment',
        details: {
          weeks_count: assignments.length,
          total_assignments: inserts.length,
          respect_existing: respectExisting,
        },
        performed_by: null,
      })
    } catch {
      // Non-critical: don't fail the whole operation for activity logging
    }

    return NextResponse.json({
      success: true,
      message: `Se han aplicado ${assignments.length} semanas (${inserts.length} asignaciones) correctamente.`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno al aplicar propuesta'
    console.error('Error apply-proposal:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
