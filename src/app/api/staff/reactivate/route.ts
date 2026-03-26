export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { staffReactivateSchema } from '@/lib/validators/schemas'

export async function POST(request: Request) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, staffReactivateSchema)
  if (!validation.success) return validation.response

  const { staffId } = validation.data

  try {
    const adminClient = createAdminClient()

    // 1. Obtener al trabajador
    const { data: staff, error: fetchError } = await adminClient
      .from('staff')
      .select('auth_user_id')
      .eq('id', staffId)
      .single()

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // 2. Reactivar en tabla staff
    const { error: staffError } = await adminClient
      .from('staff')
      .update({ is_active: true, end_date: null })
      .eq('id', staffId)

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    // 3. Desbanear al usuario en Supabase Auth
    if (staff.auth_user_id) {
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(
        staff.auth_user_id,
        { ban_duration: 'none' }
      )
      if (unbanError) {
        console.error("Error retirando el ban de auth user:", unbanError)
      }
    }

    return NextResponse.json({ success: true, message: 'Trabajador reactivado' })
  } catch (error: unknown) {
    console.error("Internal Error POST /api/staff/reactivate:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
