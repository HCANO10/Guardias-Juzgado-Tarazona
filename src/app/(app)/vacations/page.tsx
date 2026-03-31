import { createClient } from "@/lib/supabase/server"
import VacationsPageClient from "./VacationsPageClient"

interface GuardPeriodInfo {
  week_number: number;
  start_date: string;
  end_date: string;
}

export default async function VacationsPage() {
  const supabase = await createClient()

  // 1. Obtener personal activo
  const { data: staff } = await supabase
    .from('staff')
    .select('id, first_name, last_name, email')
    .eq('is_active', true)
    .order('last_name')

  // 2. Obtener usuario actual para pre-seleccionar
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserStaff = staff?.find(s => s.email === user?.email)

  // 3. Obtener todas las vacaciones
  const { data: vacations } = await supabase
    .from('vacations')
    .select('*')
    .order('start_date', { ascending: false })

  // 4. Obtener próxima guardia del usuario actual
  let nextGuard = null
  if (currentUserStaff) {
    const { data: assignments } = await supabase
      .from('guard_assignments')
      .select(`
        guard_period_id,
        guard_periods!inner(week_number, start_date, end_date)
      `)
      .eq('staff_id', currentUserStaff.id)
      .order('guard_period_id', { ascending: true })

    const today = new Date().toISOString().split('T')[0]
    if (assignments && assignments.length > 0) {
      const future = (assignments as unknown as { guard_periods: GuardPeriodInfo }[])
        .filter(a => a.guard_periods?.start_date >= today)
        .sort((a, b) => a.guard_periods.start_date.localeCompare(b.guard_periods.start_date))
      if (future.length > 0) nextGuard = future[0].guard_periods
    }
  }

  return (
    <VacationsPageClient
      staff={staff || []}
      vacations={vacations || []}
      currentStaffId={currentUserStaff?.id || null}
      nextGuard={nextGuard}
    />
  )
}
