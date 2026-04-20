export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-role'
import { validateBody, apiError } from '@/lib/validators/api'
import { vacationValidateSchema } from '@/lib/validators/schemas'
import { checkVacationGuardConflict } from '@/lib/validators/vacation-guard'

export async function POST(request: NextRequest) {
  // FIX: This route previously had NO authentication check
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, vacationValidateSchema)
  if (!validation.success) return validation.response

  const { staff_id, start_date, end_date } = validation.data

  // Workers can only validate their own schedule; headmaster/admin can validate any
  if (staff_id !== auth.staffId && auth.role !== 'headmaster' && auth.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado para validar vacaciones de otro trabajador' }, { status: 403 })
  }

  try {
    const result = await checkVacationGuardConflict(auth.supabase, staff_id, start_date, end_date)
    return NextResponse.json(result)
  } catch (error: unknown) {
    return apiError(error)
  }
}
