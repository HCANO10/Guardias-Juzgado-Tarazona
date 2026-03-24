import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { vacationValidateSchema } from '@/lib/validators/schemas'
import { checkVacationGuardConflict } from '@/lib/validators/vacation-guard'

export async function POST(request: NextRequest) {
  // FIX: This route previously had NO authentication check
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, vacationValidateSchema)
  if (!validation.success) return validation.response

  const { staff_id, start_date, end_date } = validation.data

  try {
    const result = await checkVacationGuardConflict(auth.supabase, staff_id, start_date, end_date)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
