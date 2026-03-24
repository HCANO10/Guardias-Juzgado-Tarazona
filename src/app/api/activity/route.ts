import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody, validateQuery } from '@/lib/validators/api'
import { activityCreateSchema, activityQuerySchema } from '@/lib/validators/schemas'

export async function GET(request: NextRequest) {
  // FIX: This route previously had NO authentication check
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const queryValidation = validateQuery(searchParams, activityQuerySchema)
  if (!queryValidation.success) return queryValidation.response

  const { limit, offset, type, from, to } = queryValidation.data

  try {
    const adminClient = createAdminClient()

    let query = adminClient
      .from('activity_log')
      .select(`
        *,
        staff:performed_by(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) query = query.eq('entity_type', type)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // FIX: This route previously had NO authentication check
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, activityCreateSchema)
  if (!validation.success) return validation.response

  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('activity_log')
      .insert(validation.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
