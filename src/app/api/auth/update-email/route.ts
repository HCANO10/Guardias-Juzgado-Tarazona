export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { authUpdateEmailSchema } from '@/lib/validators/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, authUpdateEmailSchema)
  if (!validation.success) return validation.response

  const { newEmail } = validation.data

  try {
    const adminClient = createAdminClient()

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
