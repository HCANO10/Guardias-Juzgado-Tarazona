export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBody, apiError } from '@/lib/validators/api'
import { authCompleteProfileSchema } from '@/lib/validators/schemas'
import { normalizeStaffData } from '@/lib/staff/normalize'

export async function POST(request: NextRequest) {
  // requireAuth no se usa aquí porque durante la completación del perfil
  // el registro en staff todavía puede no existir.
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const validation = await validateBody(request, authCompleteProfileSchema)
  if (!validation.success) return validation.response

  const { first_name, last_name, second_last_name, phone, position_id } = validation.data

  try {
    const adminClient = createAdminClient()

    // Verificar puesto válido
    const { data: position, error: posError } = await adminClient
      .from('positions')
      .select('id, name')
      .eq('id', position_id)
      .single()

    if (posError || !position) {
      return NextResponse.json({ error: 'Puesto no válido' }, { status: 400 })
    }

    // Reconciliación: busca por auth_user_id O por email (perfil pre-creado)
    // Evita crear un registro duplicado cuando el usuario ya tenía un placeholder manual.
    const { data: reconciliationRaw } = await adminClient
      .rpc('reconcile_staff_identity', {
        p_auth_user_id: user.id,
        p_email: user.email ?? '',
      })
      .single()

    const reconciliation = reconciliationRaw as { staff_id: string | null; was_linked: boolean } | null
    const existingStaffId: string | null = reconciliation?.staff_id ?? null

    const staffData = normalizeStaffData({
      auth_user_id: user.id,
      first_name, last_name, second_last_name,
      email: user.email!,
      phone, position_id, notes: null,
    })

    let result
    if (existingStaffId) {
      // Actualiza el registro existente (ya fue enlazado por reconcile_staff_identity)
      const { data: updatedStaff, error: updateError } = await adminClient
        .from('staff')
        .update(staffData)
        .eq('id', existingStaffId)
        .select('*, positions(name)')
        .single()

      if (updateError) throw updateError
      result = { success: true, staff: updatedStaff, updated: true, linked: reconciliation?.was_linked ?? false }
    } else {
      // Email totalmente nuevo → insertar
      const { data: insertedStaff, error: staffError } = await adminClient
        .from('staff')
        .insert(staffData)
        .select('*, positions(name)')
        .single()

      if (staffError) throw staffError
      result = { success: true, staff: insertedStaff, updated: false, linked: false }
    }

    // Actualizar metadata de Auth
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, profile_completed: true },
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    return apiError(error)
  }
}
