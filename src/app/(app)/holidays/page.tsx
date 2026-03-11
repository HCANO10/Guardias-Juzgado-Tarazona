import { createClient } from "@/lib/supabase/server"
import HolidaysPageClient from "@/components/holidays/HolidaysPageClient"

export default async function HolidaysPage() {
  const supabase = await createClient()

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .order('date', { ascending: true })

  return (
    <HolidaysPageClient initialHolidays={holidays || []} />
  )
}
