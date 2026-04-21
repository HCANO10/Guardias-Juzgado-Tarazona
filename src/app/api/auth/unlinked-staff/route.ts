export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { apiError } from '@/lib/validators/api'

export async function GET() {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const adminClient = createAdminClient()

  const { data: staff, error } = await adminClient
    .from('staff')
    .select('id, first_name, last_name, second_last_name, email, positions(name)')
    .eq('is_active', true)
    .is('auth_user_id', null)
    .order('first_name')

  if (error) return apiError(error)

  return NextResponse.json({ staff: staff ?? [] })
}
