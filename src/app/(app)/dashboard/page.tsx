// src/app/(app)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server"
import DashboardPageClient from "./DashboardPageClient"
import { differenceInDays, addDays, isWithinInterval } from "date-fns"

interface GuardPeriodInfo {
  week_number: number;
  start_date: string;
  end_date: string;
}

interface StaffPosition {
  guard_role: string | null;
}

interface AssignmentStaff {
  id: string;
  first_name: string;
  last_name: string;
  positions: StaffPosition | null;
}

interface GuardAssignment {
  staff_id: string;
  staff: AssignmentStaff | null;
}

interface PeriodWithAssignments {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  guard_assignments: GuardAssignment[];
}

interface AlertItem extends PeriodWithAssignments {
  count: number;
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const todayDate = new Date()
  const currentYear = todayDate.getFullYear()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 2. Get staff records
  const { data: allStaff } = await supabase
    .from('staff')
    .select('*, positions(name, guard_role)')
    .neq('role', 'admin')
    .order('last_name')

  const currentStaff = allStaff?.find(s => s.email === user.email)
  const activeStaff = allStaff?.filter(s => s.is_active) || []

  // 3. Stats: Breakdown
  const staffBreakdown = {
    auxilio: activeStaff.filter(s => (s as unknown as { positions: StaffPosition | null }).positions?.guard_role === 'auxilio').length,
    tramitador: activeStaff.filter(s => (s as unknown as { positions: StaffPosition | null }).positions?.guard_role === 'tramitador').length,
    gestor: activeStaff.filter(s => (s as unknown as { positions: StaffPosition | null }).positions?.guard_role === 'gestor').length,
  }

  // 4. Stats: Mi próxima guardia
  let nextGuard = null
  if (currentStaff) {
    const { data: myGuards } = await supabase
      .from('guard_assignments')
      .select(`
        guard_period_id,
        guard_periods!inner(week_number, start_date, end_date)
      `)
      .eq('staff_id', currentStaff.id)
      .order('guard_period_id', { ascending: true })

    if (myGuards && myGuards.length > 0) {
      const future = (myGuards as unknown as { guard_periods: GuardPeriodInfo }[])
        .filter(g => g.guard_periods?.start_date >= today)
        .sort((a, b) => a.guard_periods.start_date.localeCompare(b.guard_periods.start_date))
      if (future.length > 0) nextGuard = future[0].guard_periods
    }
  }

  // 5. Stats: Mis vacaciones este año
  let vacationDays = 0
  if (currentStaff) {
    const { data: myVacations } = await supabase
      .from('vacations')
      .select('*')
      .eq('staff_id', currentStaff.id)
      .eq('status', 'approved')
      .gte('start_date', `${currentYear}-01-01`)
      .lte('start_date', `${currentYear}-12-31`)

    vacationDays = myVacations?.reduce((acc, v) => {
      return acc + (differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1)
    }, 0) || 0
  }

  // 6. Stats: Cobertura y Alertas
  const { data: periods } = await supabase
    .from('guard_periods')
    .select(`
      *,
      guard_assignments(
        staff_id,
        staff(id, first_name, last_name, positions(guard_role))
      )
    `)
    .gte('start_date', `${currentYear}-01-01`)
    .lte('start_date', `${currentYear}-12-31`)
    .order('start_date')

  const totalPeriods = periods?.length || 0
  let completeCount = 0
  let partialCount = 0
  let missingCount = 0
  const alerts: AlertItem[] = []

  const next30Days = addDays(todayDate, 30)

  periods?.forEach(p => {
    const typedPeriod = p as unknown as PeriodWithAssignments
    const assignments = typedPeriod.guard_assignments || []
    const count = assignments.length

    if (count === 3) completeCount++
    else if (count > 0) partialCount++
    else missingCount++

    // Alertas próximas (30 días)
    const pDate = new Date(typedPeriod.start_date)
    if (count < 3 && isWithinInterval(pDate, { start: todayDate, end: next30Days })) {
      alerts.push({ ...typedPeriod, count })
    }
  })

  // 7. Data for Calendar (filters for current user already handled in DashboardPageClient or by passing filtered set)
  const { data: holidays } = await supabase.from('holidays').select('*')
  const { data: allVacations } = await supabase
    .from('vacations')
    .select('*, staff(id, first_name, last_name)')
    .eq('status', 'approved')

  const calendarGuards = periods?.map(p => {
    const typedPeriod = p as unknown as PeriodWithAssignments
    const assignments = typedPeriod.guard_assignments || []
    return {
      id: typedPeriod.id,
      week_number: typedPeriod.week_number,
      start_date: typedPeriod.start_date,
      end_date: typedPeriod.end_date,
      auxilio: assignments.find(a => a.staff?.positions?.guard_role === 'auxilio')?.staff ?? null,
      tramitador: assignments.find(a => a.staff?.positions?.guard_role === 'tramitador')?.staff ?? null,
      gestor: assignments.find(a => a.staff?.positions?.guard_role === 'gestor')?.staff ?? null,
    }
  })

  return (
    <DashboardPageClient
      stats={{
        nextGuard,
        vacationDays,
        activeStaffCount: activeStaff.length,
        staffBreakdown,
        coverage: {
          total: totalPeriods,
          complete: completeCount,
          partial: partialCount,
          missing: missingCount
        },
        alerts
      }}
      calendarData={{
        guards: calendarGuards || [],
        vacations: allVacations || [],
        holidays: holidays || [],
        staff: activeStaff
      }}
      currentUserStaffId={currentStaff?.id || null}
    />
  )
}
