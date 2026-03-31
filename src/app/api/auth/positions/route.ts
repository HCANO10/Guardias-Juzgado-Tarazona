import { apiError } from '@/lib/validators/api'
export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('positions')
      .select('id, name, guard_role, requires_guard')
      .order('name')

    if (error) throw error

    return NextResponse.json({ positions: data })
  } catch (error: unknown) {
    return apiError(error)
  }
}
