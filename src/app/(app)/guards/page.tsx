/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server"
import { getActiveStaffByCategory } from "@/lib/guards/staff-by-category"
import { GuardWeekView } from "@/types/guards"
import GuardsPageClient from "./GuardsPageClient"
import { buildFullName } from "@/lib/staff/normalize"

export default async function GuardsPage() {
  const supabase = createClient()

  // 1. Obtener settings para saber el año activo
  const { data: settings } = await supabase.from('app_settings').select('active_year').eq('id', 1).single()
  const activeYear = settings?.active_year || 2026

  // 2. Obtener personal activo por categoría
  const staffByCategory = await getActiveStaffByCategory(supabase)

  // 3. Obtener periodos del año activo
  const { data: periods, error: periodsError } = await supabase
    .from('guard_periods')
    .select('id, year, week_number, start_date, end_date')
    .eq('year', activeYear)
    .order('week_number', { ascending: true })

  // 4. Obtener asignaciones existentes limitadas a esos periodos
  const { data: assignments, error: assignmentsError } = await supabase
    .from('guard_assignments')
    .select(`
      id,
      guard_period_id,
      staff_id,
      staff ( id, first_name, last_name, positions ( guard_role ) )
    `)
  // As in standard procedure, this could be filtered via inner join or fetched, but given small sizes, we can filter in JS
  
  if (periodsError || assignmentsError) {
    console.error("Error fetching guards metrics:", periodsError, assignmentsError)
  }

  // 5. Ensamblar la vista GuardWeekView
  const guardsView: GuardWeekView[] = (periods || []).map(p => {
    const periodAssignments = (assignments || []).filter(a => a.guard_period_id === p.id)
    
    let auxilio = null
    let tramitador = null
    let gestor = null
    let coverage: 0 | 1 | 2 | 3 = 0

    for (const a of periodAssignments) {
        const pInfo: any = a.staff
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
