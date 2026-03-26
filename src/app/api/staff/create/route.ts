export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { staffCreateSchema } from '@/lib/validators/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, staffCreateSchema)
  if (!validation.success) return validation.response

  const { first_name, last_name, email, position_id, start_date, notes, password, is_guard_eligible } = validation.data

  try {
    const adminClient = createAdminClient()
    const userPassword = password || 'Tarazona123456'

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    })

    if (authError) {
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        return NextResponse.json(
          { error: `Ya existe un usuario con el email ${email}` },
          { status: 409 }
        )
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario en Auth')
    }

    // 2. Insertar en tabla staff
    const { data: staffData, error: staffError } = await adminClient
      .from('staff')
      .insert({
        auth_user_id: authData.user.id,
        first_name,
        last_name,
        email,
        position_id,
        is_active: true,
        start_date: start_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        is_guard_eligible: is_guard_eligible ?? true,
      })
      .select('*, positions(name, guard_role)')
      .single()

    if (staffError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw staffError
    }

    return NextResponse.json({
      success: true,
      staff: staffData,
      message: `Usuario creado: ${first_name} ${last_name} (${email}). Contraseña: ${userPassword}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno al crear usuario'
    console.error('Error creando usuario:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
