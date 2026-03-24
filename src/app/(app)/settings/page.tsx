import { createClient } from "@/lib/supabase/server"
import { getAllSettings } from "@/lib/settings"
import SettingsPageClient from "./SettingsPageClient"

interface StaffWithPosition {
  id: string;
  positions: { guard_role: string | null } | null;
}

interface PeriodWithAssignments {
  id: string;
  guard_assignments: { id: string }[];
}

export default async function SettingsPage() {
  const supabase = await createClient()

  // Read all settings from key/value table
  const settingsMap = await getAllSettings(supabase)
  const activeYear = parseInt(settingsMap.current_year) || 2026
  const groqModel = settingsMap.groq_model || 'llama-3.3-70b-versatile'

  // Build settings object for client component
  const settings = { active_year: activeYear, groq_model: groqModel }

  // Periods for the active year
  const { data: periods } = await supabase
    .from('guard_periods')
    .select('*')
    .eq('year', activeYear)
    .order('week_number', { ascending: true })

  // System Stats
  const { data: staff } = await supabase.from('staff').select('id, positions(guard_role)')
  const { data: holidays } = await supabase.from('holidays').select('id').eq('year', activeYear)
  const { data: vacations } = await supabase.from('vacations').select('id').gte('start_date', `${activeYear}-01-01`).lte('start_date', `${activeYear}-12-31`)

  // Calculate completed periods (those with 3 assignments)
  const { data: periodAssignments } = await supabase
    .from('guard_periods')
    .select('id, guard_assignments(id)')
    .eq('year', activeYear)

  const completeAssignments = periodAssignments?.filter(p => ((p as unknown as PeriodWithAssignments).guard_assignments).length === 3).length || 0

  const typedStaff = (staff || []) as unknown as StaffWithPosition[]

  const systemStats = {
    staff: {
      total: typedStaff.length,
      aux: typedStaff.filter(s => s.positions?.guard_role === 'auxilio').length,
      tra: typedStaff.filter(s => s.positions?.guard_role === 'tramitador').length,
      ges: typedStaff.filter(s => s.positions?.guard_role === 'gestor').length,
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
