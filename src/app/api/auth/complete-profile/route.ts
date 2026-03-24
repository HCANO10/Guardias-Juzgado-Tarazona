import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { authCompleteProfileSchema } from '@/lib/validators/schemas'
import { normalizeStaffData } from '@/lib/staff/normalize'

export async function POST(request: NextRequest) {
  // Note: requireAuth expects a staff record, but during profile completion it might not exist yet.
  // So we do manual auth check here.
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

    const { data: existingStaff } = await adminClient
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const staffData = normalizeStaffData({
      auth_user_id: user.id,
      first_name, last_name, second_last_name,
      email: user.email!,
      phone, position_id, notes: null,
    })

    let result
    if (existingStaff) {
      const { data: updatedStaff, error: updateError } = await adminClient
        .from('staff')
        .update(staffData)
        .eq('id', existingStaff.id)
        .select('*, positions(name)')
        .single()

      if (updateError) throw updateError
      result = { success: true, staff: updatedStaff, updated: true }
    } else {
      const { data: insertedStaff, error: staffError } = await adminClient
        .from('staff')
        .insert(staffData)
        .select('*, positions(name)')
        .single()

      if (staffError) throw staffError
      result = { success: true, staff: insertedStaff, updated: false }
    }

    // Actualizar metadata de Auth
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, profile_completed: true },
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
