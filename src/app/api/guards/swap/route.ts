export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody, apiError } from '@/lib/validators/api'
import { guardSwapSchema } from '@/lib/validators/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, guardSwapSchema)
  if (!validation.success) return validation.response

  const { periodId1, staffId1, periodId2, staffId2, swapperStaffId } = validation.data

  try {
    const adminClient = createAdminClient()

    // Verificar que ambas asignaciones existen
    const { data: assign1, error: err1 } = await adminClient
      .from('guard_assignments')
      .select('id, staff_id, guard_period_id')
      .eq('guard_period_id', periodId1)
      .eq('staff_id', staffId1)
      .single()

    const { data: assign2, error: err2 } = await adminClient
      .from('guard_assignments')
      .select('id, staff_id, guard_period_id')
      .eq('guard_period_id', periodId2)
      .eq('staff_id', staffId2)
      .single()

    if (err1 || !assign1 || err2 || !assign2) {
      return NextResponse.json({ error: 'No se encontraron las asignaciones a intercambiar' }, { status: 404 })
    }

    // Intercambiar
    const { error: upd1 } = await adminClient
      .from('guard_assignments')
      .update({ staff_id: staffId2, assigned_by: 'manual' })
      .eq('id', assign1.id)

    const { error: upd2 } = await adminClient
      .from('guard_assignments')
      .update({ staff_id: staffId1, assigned_by: 'manual' })
      .eq('id', assign2.id)

    if (upd1 || upd2) {
      throw new Error('Error al actualizar las asignaciones')
    }

    // Registrar en activity_log (no bloquea la operación principal)
    try {
      const { error: logError } = await adminClient.from('activity_log').insert({
        action: 'guard_swapped',
        entity_type: 'guard_assignment',
        details: { periodId1, staffId1, periodId2, staffId2 },
        performed_by: swapperStaffId || null,
      })
      if (logError) console.warn('activity_log insert failed:', logError.message)
    } catch (logErr) {
      console.warn('activity_log error:', logErr)
    }

    return NextResponse.json({ success: true, message: 'Guardia intercambiada correctamente' })
  } catch (error: unknown) {
    console.error('Error intercambiando guardias:', error)
    return apiError(error)
  }
}
