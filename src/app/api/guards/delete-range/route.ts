import { NextRequest, NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { guardDeleteRangeSchema } from '@/lib/validators/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, guardDeleteRangeSchema)
  if (!validation.success) return validation.response

  const { year, startDate, endDate, deleteAssignmentsOnly } = validation.data

  try {
    // 1. Find periods matching the criteria
    let query = auth.supabase
      .from('guard_periods')
      .select('id, week_number, start_date, end_date')
      .eq('year', year)
      .order('week_number', { ascending: true })

    if (startDate) query = query.gte('start_date', startDate)
    if (endDate) query = query.lte('end_date', endDate)

    const { data: periods, error: findError } = await query
    if (findError) throw findError

    if (!periods || periods.length === 0) {
      return NextResponse.json({
        success: true,
        deletedAssignments: 0,
        deletedPeriods: 0,
        affectedWeeks: [],
        message: `No habia periodos para ${year}. Ya esta limpio.`,
      })
    }

    const periodIds = periods.map(p => p.id)

    // 2. Delete assignments for those periods
    const { error: delAssignError, count: assignCount } = await auth.supabase
      .from('guard_assignments')
      .delete()
      .in('guard_period_id', periodIds)

    if (delAssignError) throw delAssignError

    let periodCount = 0

    // 3. Optionally delete the periods themselves
    if (!deleteAssignmentsOnly) {
      const { error: delPeriodError, count } = await auth.supabase
        .from('guard_periods')
        .delete()
        .in('id', periodIds)

      if (delPeriodError) throw delPeriodError
      periodCount = count || 0
    }

    const rangeDesc = startDate || endDate
      ? `del ${startDate || 'inicio'} al ${endDate || 'fin'}`
      : `de todo ${year}`

    return NextResponse.json({
      success: true,
      deletedAssignments: assignCount || 0,
      deletedPeriods: periodCount,
      affectedWeeks: periods.map(p => p.week_number),
      message: deleteAssignmentsOnly
        ? `Eliminadas ${assignCount || 0} asignaciones ${rangeDesc} (periodos conservados).`
        : `Eliminados ${periodCount} periodos y ${assignCount || 0} asignaciones ${rangeDesc}.`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
