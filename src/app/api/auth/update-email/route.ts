export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { authUpdateEmailSchema } from '@/lib/validators/schemas'
import { sendEmailChangeNotification } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, authUpdateEmailSchema)
  if (!validation.success) return validation.response

  const { newEmail } = validation.data

  try {
    const adminClient = createAdminClient()

    // 0. Obtener el email actual del usuario para usarlo en las notificaciones
    const { data: currentUser, error: getUserError } = await adminClient.auth.admin.getUserById(auth.userId)
    if (getUserError || !currentUser?.user) {
      console.error('Error fetching current user:', getUserError)
      return NextResponse.json({ error: 'No se pudo obtener el usuario actual' }, { status: 500 })
    }
    const oldEmail = currentUser.user.email ?? ''

    // Obtener nombre del usuario desde la tabla staff
    const { data: staffRow } = await adminClient
      .from('staff')
      .select('first_name, last_name')
      .eq('auth_user_id', auth.userId)
      .single()
    const userName = staffRow
      ? `${staffRow.first_name} ${staffRow.last_name}`.trim()
      : oldEmail

    // 1. Actualizar el usuario en Supabase Auth
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      auth.userId,
      { email: newEmail, email_confirm: true }
    )

    if (updateAuthError) {
      console.error('Error updating auth email:', updateAuthError)
      return NextResponse.json(
        { error: 'Error al actualizar las credenciales de acceso' },
        { status: 500 }
      )
    }

    // 2. Actualizar el email en la tabla staff
    const { error: updateStaffError } = await adminClient
      .from('staff')
      .update({ email: newEmail })
      .eq('auth_user_id', auth.userId)

    if (updateStaffError) {
      console.error('Error updating staff email:', updateStaffError)
    }

    // 3. Enviar notificaciones por email (al nuevo y al antiguo correo)
    if (oldEmail) {
      await sendEmailChangeNotification(oldEmail, newEmail, userName).catch(err =>
        console.error('Error sending email change notification:', err)
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email actualizado correctamente. Por favor, usa tu nuevo email la próxima vez que inicies sesión.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('Unexpected error updating email:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
