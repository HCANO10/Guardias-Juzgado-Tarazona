import { createClient } from "@/lib/supabase/server"
import dynamic from 'next/dynamic'
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"

const UnifiedCalendar = dynamic(
  () => import('@/components/calendar/UnifiedCalendar'),
  { ssr: false, loading: () => <CalendarSkeleton /> }
)

export default async function CalendarPage() {
  const supabase = await createClient()

  // 1. Fetch Staff
  const { data: staff } = await supabase
    .from('staff')
    .select('id, first_name, last_name')
    .eq('is_active', true)

  // 2. Fetch Holidays
  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')

  // 3. Fetch Approved Vacations
  const { data: vacations } = await supabase
    .from('vacations')
    .select('*, staff(id, first_name, last_name)')
    .eq('status', 'approved')

  // 4. Fetch Guards (Periods + Assignments)
  const { data: periods } = await supabase
    .from('guard_periods')
    .select(`
      *,
      guard_assignments(
        staff_id,
        staff(id, first_name, last_name, positions(guard_role))
      )
    `)
    .order('start_date', { ascending: true })

  // Transform periods into a structured object for the calendar
  const formattedGuards = periods?.map(p => {
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Calendario Unificado</h2>
      </div>
      
      <UnifiedCalendar 
        guards={formattedGuards || []}
        vacations={vacations || []}
        holidays={holidays || []}
        staff={staff || []}
      />
    </div>
  )
}
