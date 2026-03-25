import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfilePageClient } from "./ProfilePageClient"
import type { SwapRequest } from "@/components/guards/SwapRequestsPanel"

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

// Raw shape from Supabase nested query
interface RawSwapRequest {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  requester: { id: string; first_name: string; last_name: string } | null;
  requested: { id: string; first_name: string; last_name: string } | null;
  period_requester: { week_number: number; start_date: string; end_date: string } | null;
  period_requested: { week_number: number; start_date: string; end_date: string } | null;
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

  // Helper para contar días de un periodo de vacaciones
  const countVacDays = (v: VacationRecord) =>
    Math.round(
      (new Date(v.end_date + 'T12:00:00').getTime() - new Date(v.start_date + 'T12:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
    ) + 1

  // Pendientes de asignar: solicitadas pero sin aprobar todavía
  const pendingVacations = typedVacations.filter(v => v.status === 'pending')
  const vacacionesPendientesDias = pendingVacations.reduce((acc, v) => acc + countVacDays(v), 0)

  // Asignadas: aprobadas con fecha futura (aún no disfrutadas)
  const approvedFutureVacations = typedVacations.filter(v => v.status === 'approved' && v.end_date >= today)
  const vacacionesAsignadasDias = approvedFutureVacations.reduce((acc, v) => acc + countVacDays(v), 0)

  // Gastadas: aprobadas con fecha pasada (ya disfrutadas)
  const approvedPastVacations = typedVacations.filter(v => v.status === 'approved' && v.end_date < today)
  const vacacionesGastadasDias = approvedPastVacations.reduce((acc, v) => acc + countVacDays(v), 0)

  const nextVacation = approvedFutureVacations[0] || null

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

  // Solicitudes de intercambio de guardia (enviadas y recibidas, últimas 30)
  const { data: rawSwapReqs } = await supabase
    .from('guard_swap_requests')
    .select(`
      id, status, message, created_at,
      requester:requester_id(id, first_name, last_name),
      requested:requested_id(id, first_name, last_name),
      period_requester:period_id_requester(week_number, start_date, end_date),
      period_requested:period_id_requested(week_number, start_date, end_date)
    `)
    .or(`requester_id.eq.${staffData.id},requested_id.eq.${staffData.id}`)
    .order('created_at', { ascending: false })
    .limit(30)

  // Normalize nested objects from Supabase (returns arrays for joins)
  const swapRequests: SwapRequest[] = ((rawSwapReqs || []) as unknown as RawSwapRequest[])
    .filter(r => r.requester && r.requested && r.period_requester && r.period_requested)
    .map(r => ({
      id: r.id,
      status: r.status as SwapRequest['status'],
      message: r.message,
      created_at: r.created_at,
      requester: r.requester!,
      requested: r.requested!,
      period_requester: r.period_requester!,
      period_requested: r.period_requested!,
    }))

  return (
    <ProfilePageClient
      staffData={staffData}
      futureGuards={futureGuards}
      totalGuards={totalGuards}
      nextGuard={nextGuard}
      vacations={myVacations || []}
      vacacionesPendientesDias={vacacionesPendientesDias}
      vacacionesAsignadasDias={vacacionesAsignadasDias}
      vacacionesGastadasDias={vacacionesGastadasDias}
      nextVacation={nextVacation}
      sameRoleStaff={sameRoleStaff}
      guardRole={guardRole}
      swapRequests={swapRequests}
    />
  )
}
