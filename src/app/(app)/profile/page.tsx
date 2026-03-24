import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfilePageClient } from "./ProfilePageClient"

interface GuardPeriodData {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  year: number;
}

interface GuardAssignmentWithPeriod {
  id: string;
  guard_period_id: string;
  guard_periods: GuardPeriodData | null;
}

interface VacationRecord {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  status: string;
  [key: string]: unknown;
}

interface PositionRecord {
  id: string;
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar datos del staff vinculado
  const { data: staffData } = await supabase
    .from('staff')
    .select('*, positions(name, guard_role)')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Perfil no encontrado</h2>
          <p className="text-muted-foreground">
            Tu cuenta de usuario no está vinculada a ningún registro de personal.
            Contacta con el administrador.
          </p>
        </div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]

  // Mis guardias futuras (guard_period_id necesario para el intercambio)
  const { data: myGuards } = await supabase
    .from('guard_assignments')
    .select('id, guard_period_id, guard_periods(id, week_number, start_date, end_date, year)')
    .eq('staff_id', staffData.id)
    .order('guard_period_id', { ascending: true })

  const typedGuards = (myGuards || []) as unknown as GuardAssignmentWithPeriod[]

  const futureGuards = typedGuards
    .filter(g => g.guard_periods?.start_date && g.guard_periods.start_date >= today && g.guard_periods?.year === currentYear)
    .slice(0, 10)

  const totalGuards = typedGuards.filter(g => g.guard_periods?.year === currentYear).length

  const nextGuard = futureGuards[0] || null

  // Mis vacaciones este año
  const { data: myVacations } = await supabase
    .from('vacations')
    .select('*')
    .eq('staff_id', staffData.id)
    .gte('start_date', `${currentYear}-01-01`)
    .lte('end_date', `${currentYear}-12-31`)
    .order('start_date', { ascending: true })

  const typedVacations = (myVacations || []) as unknown as VacationRecord[]

  // Total días de vacaciones aprobadas (noon trick para evitar problemas de timezone)
  const approvedVacations = typedVacations.filter(v => v.status === 'approved')
  const totalVacationDays = approvedVacations.reduce((acc: number, v) => {
    const msPerDay = 1000 * 60 * 60 * 24
    const diff = Math.round(
      (new Date(v.end_date + 'T12:00:00').getTime() - new Date(v.start_date + 'T12:00:00').getTime()) / msPerDay
    ) + 1
    return acc + diff
  }, 0)

  const nextVacation = approvedVacations.find(v => v.end_date >= today) || null

  // Personal del mismo rol para poder solicitar intercambios de guardia
  const guardRole = staffData.positions?.guard_role as 'auxilio' | 'tramitador' | 'gestor' | null
  let sameRoleStaff: { id: string; first_name: string; last_name: string }[] = []

  if (guardRole) {
    const { data: positionsWithRole } = await supabase
      .from('positions')
      .select('id')
      .eq('guard_role', guardRole)

    const positionIds = ((positionsWithRole || []) as unknown as PositionRecord[]).map(p => p.id)

    if (positionIds.length > 0) {
      const { data: sameRole } = await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .eq('is_guard_eligible', true)
        .neq('id', staffData.id)
        .in('position_id', positionIds)
        .order('last_name', { ascending: true })
      sameRoleStaff = sameRole || []
    }
  }

  return (
    <ProfilePageClient
      staffData={staffData}
      futureGuards={futureGuards}
      totalGuards={totalGuards}
      nextGuard={nextGuard}
      vacations={myVacations || []}
      totalVacationDays={totalVacationDays}
      nextVacation={nextVacation}
      sameRoleStaff={sameRoleStaff}
      guardRole={guardRole}
    />
  )
}
