import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBody } from '@/lib/validators/api'
import { authRegisterSchema } from '@/lib/validators/schemas'
import { normalizeStaffData } from '@/lib/staff/normalize'

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, authRegisterSchema)
  if (!validation.success) return validation.response

  const { first_name, last_name, second_last_name, email, phone, password, position_id } = validation.data

  try {
    const adminClient = createAdminClient()

    // Verificar puesto válido
    const { data: position, error: posError } = await adminClient
      .from('positions')
      .select('id, name, guard_role')
      .eq('id', position_id)
      .single()

    if (posError || !position) {
      return NextResponse.json({ error: 'Debes seleccionar un puesto de trabajo válido' }, { status: 400 })
    }

    // Verificar email duplicado
    const { data: existingStaff } = await adminClient
      .from('staff')
      .select('id')
      .eq('email', email)
      .single()

    if (existingStaff) {
      return NextResponse.json({ error: 'Ya existe un usuario registrado con ese email' }, { status: 409 })
    }

    // Crear usuario en Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name, last_name,
        second_last_name: second_last_name || null,
        phone: phone || null,
        profile_completed: true,
      },
    })

    if (authError) {
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        return NextResponse.json({ error: 'Ya existe un usuario con ese email en el sistema' }, { status: 409 })
      }
      throw authError
    }

    if (!authData.user) throw new Error('No se pudo crear el usuario')

    // Insertar staff con datos normalizados
    const staffData = normalizeStaffData({
      auth_user_id: authData.user.id,
      first_name, last_name, second_last_name,
      email, phone, position_id, notes: null,
    })

    const { error: staffError } = await adminClient
      .from('staff')
      .insert(staffData)

    if (staffError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw staffError
    }

    return NextResponse.json({
      success: true,
      message: `Cuenta creada correctamente. Ya puedes iniciar sesión con ${email}`,
      staff: {
        name: [first_name, last_name, second_last_name].filter(Boolean).join(' '),
        position: position.name,
        email,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear la cuenta'
    console.error('Error en registro:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
