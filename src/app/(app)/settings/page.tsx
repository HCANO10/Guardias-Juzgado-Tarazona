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

  // Obtenemos los periodos ya generados para pasárselos al cliente
  const activeYear = settings?.active_year || 2026
  const { data: periods } = await supabase
    .from('guard_periods')
    .select('*')
    .eq('year', activeYear)
    .order('week_number', { ascending: true })

  return <SettingsPageClient initialSettings={settings} initialPeriods={periods || []} />
}
