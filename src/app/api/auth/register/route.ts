export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBody, apiError } from '@/lib/validators/api'
import { authRegisterSchema } from '@/lib/validators/schemas'
import { normalizeStaffData } from '@/lib/staff/normalize'

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, authRegisterSchema)
  if (!validation.success) return validation.response

  const { first_name, last_name, second_last_name, email, phone, password, position_id } = validation.data

  try {
    const adminClient = createAdminClient()

    // Verificar si existe un perfil pre-creado con este email (auth_user_id IS NULL)
    const { data: existingStaff } = await adminClient
      .from('staff')
      .select('id, auth_user_id')
      .ilike('email', email)
      .single()

    if (existingStaff?.auth_user_id !== null && existingStaff) {
      return NextResponse.json(
        { error: 'Ya existe un usuario registrado con ese email' },
        { status: 409 }
      )
    }

    // Si no hay coincidencia de email, comprobar si existen perfiles sin vincular.
    // En ese caso el usuario debe identificarse manualmente → devolver needs_linking.
    if (!existingStaff) {
      const { data: unlinked } = await adminClient
        .from('staff')
        .select('id')
        .is('auth_user_id', null)
        .eq('is_active', true)
        .limit(1)

      if (unlinked && unlinked.length > 0) {
        // Crear solo el usuario de Auth (sin staff) para que complete-profile haga el enlace
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            first_name, last_name,
            second_last_name: second_last_name || null,
            phone: phone || null,
            profile_completed: false,
          },
        })

        if (authError) {
          if (authError.message?.includes('already') || authError.message?.includes('exists')) {
            return NextResponse.json({ error: 'Ya existe un usuario con ese email en el sistema' }, { status: 409 })
          }
          throw authError
        }
        if (!authData.user) throw new Error('No se pudo crear el usuario')

        return NextResponse.json({ success: true, needs_linking: true })
      }
    }

    // Sin perfiles pre-creados pendientes → registro normal, position_id obligatorio
    if (!position_id) {
      return NextResponse.json({ error: 'Debes seleccionar un puesto de trabajo válido' }, { status: 400 })
    }

    const { data: position, error: posError } = await adminClient
      .from('positions')
      .select('id, name, guard_role')
      .eq('id', position_id)
      .single()

    if (posError || !position) {
      return NextResponse.json({ error: 'Debes seleccionar un puesto de trabajo válido' }, { status: 400 })
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

    if (existingStaff?.auth_user_id === null) {
      // Perfil pre-creado con mismo email → enlazar
      const { error: linkError } = await adminClient
        .from('staff')
        .update({
          auth_user_id: authData.user.id,
          first_name,
          last_name,
          second_last_name: second_last_name || null,
          phone: phone || null,
          position_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStaff.id)

      if (linkError) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        throw linkError
      }
    } else {
      // Email totalmente nuevo → insertar staff
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
    console.error('Error en registro:', error)
    return apiError(error)
  }
}
