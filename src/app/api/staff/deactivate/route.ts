export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody, apiError } from '@/lib/validators/api'
import { staffDeactivateSchema } from '@/lib/validators/schemas'

export async function POST(request: Request) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, staffDeactivateSchema)
  if (!validation.success) return validation.response

  const { staffId } = validation.data

  try {
    const adminClient = createAdminClient()

    // 1. Obtener al trabajador para saber su auth_user_id
    const { data: staff, error: fetchError } = await adminClient
      .from('staff')
      .select('auth_user_id')
      .eq('id', staffId)
      .single()

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // 2. Desactivar en tabla staff y marcar end_date
    const today = new Date().toISOString().split('T')[0]
    const { error: staffError } = await adminClient
      .from('staff')
      .update({ is_active: false, end_date: today })
      .eq('id', staffId)

    if (staffError) throw staffError

    // 3. Banear al usuario en Supabase Auth
    if (staff.auth_user_id) {
      const { error: banError } = await adminClient.auth.admin.updateUserById(
        staff.auth_user_id,
        { ban_duration: '876000h' }
      )
      if (banError) {
        console.error("Error baneando auth user:", banError)
      }
    }

    // 4. Eliminar guard_assignments activas y futuras (semana en curso incluida)
    const { data: activePeriods, error: periodsError } = await adminClient
      .from('guard_periods')
      .select('id')
      .gte('end_date', today)   // incluye la semana activa (start_date puede ser pasado)

    let cleanedAssignments = 0
    if (!periodsError && activePeriods && activePeriods.length > 0) {
      const periodIds = activePeriods.map(p => p.id)
      const { count, error: deleteGuardsError } = await adminClient
        .from('guard_assignments')
        .delete({ count: 'exact' })
        .eq('staff_id', staffId)
        .in('guard_period_id', periodIds)

      if (deleteGuardsError) {
        console.error("Error borrando asignaciones activas/futuras:", deleteGuardsError)
      } else {
        cleanedAssignments = count ?? 0
      }
    }

    const message = cleanedAssignments > 0
      ? `Trabajador dado de baja. Se han eliminado ${cleanedAssignments} guardia(s) activa(s)/futura(s).`
      : 'Trabajador dado de baja'

    return NextResponse.json({ success: true, message })
  } catch (error: unknown) {
    return apiError(error)
  }
}
