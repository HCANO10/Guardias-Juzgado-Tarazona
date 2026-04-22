export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody, apiError } from '@/lib/validators/api'
import { authChangePasswordSchema } from '@/lib/validators/schemas'
import { sendPasswordChangeNotification } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, authChangePasswordSchema)
  if (!validation.success) return validation.response

  const { password } = validation.data

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
      { password }
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

    // Registro de auditoría
    const { data: staffRow2 } = await adminClient
      .from('staff')
      .select('id')
      .eq('auth_user_id', auth.userId)
      .single()
    if (staffRow2?.id) {
      try {
        await adminClient.from('activity_log').insert({
          action: 'change_password',
          entity_type: 'staff',
          entity_id: staffRow2.id,
          details: { description: `${userName} cambió su contraseña` },
          performed_by: staffRow2.id,
        })
      } catch (logErr) {
        console.error('Error logging password change:', logErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return apiError(error)
  }
}
