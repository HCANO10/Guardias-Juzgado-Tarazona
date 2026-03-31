export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { sendPasswordChangeNotification } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await request.json() as { password?: string }
  if (!body.password || body.password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  try {
    const adminClient = createAdminClient()

    // Obtener email y nombre del usuario
    const { data: currentUser, error: getUserError } = await adminClient.auth.admin.getUserById(auth.userId)
    if (getUserError || !currentUser?.user) {
      return NextResponse.json({ error: 'No se pudo obtener el usuario' }, { status: 500 })
    }
    const userEmail = currentUser.user.email ?? ''

    const { data: staffRow } = await adminClient
      .from('staff')
      .select('first_name, last_name')
      .eq('auth_user_id', auth.userId)
      .single()
    const userName = staffRow
      ? `${staffRow.first_name} ${staffRow.last_name}`.trim()
      : userEmail

    // Actualizar contraseña
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      auth.userId,
      { password: body.password }
    )
    if (updateError) {
      return NextResponse.json({ error: 'Error al actualizar la contraseña' }, { status: 500 })
    }

    // Notificación por email
    if (userEmail) {
      await sendPasswordChangeNotification(userEmail, userName).catch(err =>
        console.error('Error sending password change notification:', err)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
