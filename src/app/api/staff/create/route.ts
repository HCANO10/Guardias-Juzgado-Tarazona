/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Verificar sesión (solo usuarios autenticados pueden crear staff)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email, positionId, startDate, notes } = body

    if (!firstName || !lastName || !email || !positionId || !startDate) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const adminAuthClient = createAdminClient()

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email,
      // La contraseña real se establecerá por el usuario mediante invitación,
      // pero requerimos pasar algo momentáneo o dejar que Supabase se encargue
      // enviando un magic link / invite.
      // Usar inviteUserByEmail es la mejor opción.
    })

    if (authError) {
      // Si el usuario ya está registrado, podemos intentar recuperarlo
      console.error("Error Auth createUser:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Opcional: Enviar invitación oficial si createUser no lo hizo (dependiendo de la conf del proyecto)
    await adminAuthClient.auth.admin.inviteUserByEmail(email)

    // 2. Insertar en tabla staff
    const { data: staffData, error: staffError } = await adminAuthClient
      .from('staff')
      .insert({
        auth_user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        position_id: positionId,
        start_date: startDate,
        notes: notes || null,
        is_active: true
      })
      .select()
      .single()

    if (staffError) {
      console.error("Error Staff Insert:", staffError)
      // Rollback Auth user if staff insertion fails
      await adminAuthClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: staffData })
  } catch (error: any) {
    console.error("Internal Error POST /api/staff/create:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
