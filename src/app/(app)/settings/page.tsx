/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server"
import SettingsPageClient from "./SettingsPageClient"

export default async function SettingsPage() {
  const supabase = createClient()
  
  // Obtenemos los settings del año activo
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const activeYear = settings?.active_year || 2026

  // Obtenemos los periodos ya generados para pasárselos al cliente
  const { data: periods } = await supabase
    .from('guard_periods')
    .select('*')
    .eq('year', activeYear)
    .order('week_number', { ascending: true })

  // 3. System Stats
  const { data: staff } = await supabase.from('staff').select('id, positions(guard_role)')
  const { data: holidays } = await supabase.from('holidays').select('id').eq('year', activeYear)
  const { data: vacations } = await supabase.from('vacations').select('id').gte('start_date', `${activeYear}-01-01`).lte('start_date', `${activeYear}-12-31`)
  
  // Calculate completed periods (those with 3 assignments)
  const { data: periodAssignments } = await supabase
    .from('guard_periods')
    .select('id, guard_assignments(id)')
    .eq('year', activeYear)

  const completeAssignments = periodAssignments?.filter(p => (p.guard_assignments as any[]).length === 3).length || 0

  const systemStats = {
    staff: {
      total: staff?.length || 0,
      aux: staff?.filter((s: any) => s.positions?.guard_role === 'auxilio').length || 0,
      tra: staff?.filter((s: any) => s.positions?.guard_role === 'tramitador').length || 0,
      ges: staff?.filter((s: any) => s.positions?.guard_role === 'gestor').length || 0,
    },
    periods: periods?.length || 0,
    assignments: {
      complete: completeAssignments,
      total: periods?.length || 0
    },
    holidays: holidays?.length || 0,
    vacations: vacations?.length || 0
  }

  return (
    <SettingsPageClient 
      initialSettings={settings} 
      initialPeriods={periods || []} 
      systemStats={systemStats}
    />
  )
}
