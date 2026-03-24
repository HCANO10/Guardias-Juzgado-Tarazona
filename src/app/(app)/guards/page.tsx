import { createClient } from "@/lib/supabase/server"
import { getActiveStaffByCategory } from "@/lib/guards/staff-by-category"
import { getSetting } from "@/lib/settings"
import { GuardWeekView } from "@/types/guards"
import GuardsPageClient from "./GuardsPageClient"
import { buildFullName } from "@/lib/staff/normalize"

interface StaffWithPosition {
  id: string
  first_name: string
  last_name: string
  positions: { guard_role: string | null }
}

export default async function GuardsPage() {
  const supabase = await createClient()

  const activeYearStr = await getSetting(supabase, 'current_year', '2026')
  const activeYear = parseInt(activeYearStr) || 2026

  const staffByCategory = await getActiveStaffByCategory(supabase)

  const { data: periods, error: periodsError } = await supabase
    .from('guard_periods')
    .select('id, year, week_number, start_date, end_date')
    .eq('year', activeYear)
    .order('week_number', { ascending: true })

  const { data: assignments, error: assignmentsError } = await supabase
    .from('guard_assignments')
    .select(`
      id,
      guard_period_id,
      staff_id,
      staff ( id, first_name, last_name, positions ( guard_role ) )
    `)

  if (periodsError || assignmentsError) {
    console.error("Error fetching guards metrics:", periodsError, assignmentsError)
  }

  const guardsView: GuardWeekView[] = (periods || []).map(p => {
    const periodAssignments = (assignments || []).filter(a => a.guard_period_id === p.id)

    let auxilio = null
    let tramitador = null
    let gestor = null
    let coverage: 0 | 1 | 2 | 3 = 0

    for (const a of periodAssignments) {
        const pInfo = a.staff as unknown as StaffWithPosition
        const role = pInfo?.positions?.guard_role
        const formatted = { id: pInfo.id, name: buildFullName(pInfo) }

        if (role === 'auxilio') {
            auxilio = formatted
            coverage++
        } else if (role === 'tramitador') {
            tramitador = formatted
            coverage++
        } else if (role === 'gestor') {
            gestor = formatted
            coverage++
        }
    }

    return {
      period_id: p.id,
      week_number: p.week_number,
      start_date: p.start_date,
      end_date: p.end_date,
      auxilio,
      tramitador,
      gestor,
      coverage: coverage as 0 | 1 | 2 | 3
    }
  })

  return <GuardsPageClient initialGuards={guardsView} staffByCategory={staffByCategory} activeYear={activeYear} />
}
