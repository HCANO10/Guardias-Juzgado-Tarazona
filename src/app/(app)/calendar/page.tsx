import { createClient } from "@/lib/supabase/server"
import { UnifiedCalendar } from "@/components/calendar/CalendarClientWrapper"
import { ExportPDFButton } from "@/components/calendar/ExportPDFButton"
import { DSPageHeader } from "@/lib/design-system"

interface StaffPosition {
  guard_role: string | null;
}

interface AssignmentStaff {
  id: string;
  first_name: string;
  last_name: string;
  positions: StaffPosition | null;
}

interface GuardAssignment {
  staff_id: string;
  staff: AssignmentStaff | null;
}

interface PeriodWithAssignments {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  guard_assignments: GuardAssignment[];
}

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, first_name, last_name')
    .eq('is_active', true)

  const { data: holidays } = await supabase.from('holidays').select('*')

  const { data: vacations } = await supabase
    .from('vacations')
    .select('*, staff(id, first_name, last_name)')
    .eq('status', 'approved')

  const { data: periods } = await supabase
    .from('guard_periods')
    .select(`*, guard_assignments(staff_id, staff(id, first_name, last_name, positions(guard_role)))`)
    .order('start_date', { ascending: true })

  const formattedGuards = periods?.map(p => {
    const typedPeriod = p as unknown as PeriodWithAssignments
    const assignments = typedPeriod.guard_assignments || []
    return {
      id: typedPeriod.id,
      week_number: typedPeriod.week_number,
      start_date: typedPeriod.start_date,
      end_date: typedPeriod.end_date,
      assignments,
      auxilio: assignments.find(a => a.staff?.positions?.guard_role === 'auxilio')?.staff ?? null,
      tramitador: assignments.find(a => a.staff?.positions?.guard_role === 'tramitador')?.staff ?? null,
      gestor: assignments.find(a => a.staff?.positions?.guard_role === 'gestor')?.staff ?? null,
    }
  })

  return (
    <div className="flex-1 space-y-6 overflow-x-hidden">
      <DSPageHeader
        title="Calendario Unificado"
        subtitle="Guardias, vacaciones y festivos en una vista integrada."
        actions={
          <ExportPDFButton
            guards={formattedGuards || []}
            vacations={vacations || []}
            holidays={holidays || []}
            staff={staff || []}
          />
        }
      />

      <UnifiedCalendar
        guards={formattedGuards || []}
        vacations={vacations || []}
        holidays={holidays || []}
        staff={staff || []}
      />
    </div>
  )
}
