// src/app/(app)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server"
import DashboardPageClient from "./DashboardPageClient"
import { differenceInDays, addDays, isWithinInterval } from "date-fns"

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
    .order('last_name')

  const currentStaff = allStaff?.find(s => s.email === user.email)
  const activeStaff = allStaff?.filter(s => s.is_active) || []

  // 3. Stats: Breakdown
  const staffBreakdown = {
    auxilio: activeStaff.filter(s => s.positions?.guard_role === 'auxilio').length,
    tramitador: activeStaff.filter(s => s.positions?.guard_role === 'tramitador').length,
    gestor: activeStaff.filter(s => s.positions?.guard_role === 'gestor').length,
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
      .gte('guard_periods.start_date', today)
      .order('guard_periods.start_date')
      .limit(1)

    if (myGuards && myGuards.length > 0) {
      nextGuard = (myGuards[0] as any).guard_periods
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
  const alerts: any[] = []

  const next30Days = addDays(todayDate, 30)

  periods?.forEach(p => {
    const assignments = p.guard_assignments || []
    const count = assignments.length
    
    if (count === 3) completeCount++
    else if (count > 0) partialCount++
    else missingCount++

    // Alertas próximas (30 días)
    const pDate = new Date(p.start_date)
    if (count < 3 && isWithinInterval(pDate, { start: todayDate, end: next30Days })) {
      alerts.push({ ...p, count })
    }
  })

  // 7. Data for Calendar (filters for current user already handled in DashboardPageClient or by passing filtered set)
  const { data: holidays } = await supabase.from('holidays').select('*')
  const { data: allVacations } = await supabase
    .from('vacations')
    .select('*, staff(id, first_name, last_name)')
    .eq('status', 'approved')

  const calendarGuards = periods?.map(p => {
    const assignments = p.guard_assignments || []
    return {
      id: p.id,
      week_number: p.week_number,
      start_date: p.start_date,
      end_date: p.end_date,
      auxilio: assignments.find((a: any) => a.staff?.positions?.guard_role === 'auxilio')?.staff,
      tramitador: assignments.find((a: any) => a.staff?.positions?.guard_role === 'tramitador')?.staff,
      gestor: assignments.find((a: any) => a.staff?.positions?.guard_role === 'gestor')?.staff
    }
  })

  // Only show events for current user in the mini calendar on dashboard?
  // User asked for "Solo mostrar eventos del usuario actual"
  const myCalendarGuards = calendarGuards?.filter(g => 
    g.auxilio?.id === currentStaff?.id || 
    g.tramitador?.id === currentStaff?.id || 
    g.gestor?.id === currentStaff?.id
  ) || []
  
  const myCalendarVacations = allVacations?.filter(v => v.staff_id === currentStaff?.id) || []

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
        guards: myCalendarGuards,
        vacations: myCalendarVacations,
        holidays: holidays || [], // Holidays are shown for everyone
        staff: activeStaff
      }}
      currentUserStaffId={currentStaff?.id || null}
    />
  )
}
