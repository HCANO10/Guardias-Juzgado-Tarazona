import { createClient } from "@/lib/supabase/server"
import VacationsPageClient from "./VacationsPageClient"

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
      .gte('guard_periods.start_date', new Date().toISOString().split('T')[0])
      .order('guard_periods.start_date')
      .limit(1)

    if (assignments && assignments.length > 0) {
      nextGuard = (assignments[0] as any).guard_periods
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
