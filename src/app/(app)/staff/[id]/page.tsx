import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Mail, Briefcase, FileText, Shield, Sun, Phone, ChevronRight } from "lucide-react"
import {
  DSCard,
  DSBadge,
  DSIconBox,
  DSPageHeader,
  DSSectionHeading,
  getPositionBadgeVariant,
} from "@/lib/design-system"

interface StaffDetail {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  start_date: string
  end_date?: string
  is_active: boolean
  role: string
  notes?: string
  positions?: { name: string; guard_role: string | null }
}

interface GuardAssignment {
  id: string
  guard_period_id: string
  staff_id: string
  guard_periods: {
    id: string
    year: number
    week_number: number
    start_date: string
    end_date: string
  }
}

interface Vacation {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  status: string
  notes?: string
}

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: staff, error } = await supabase
    .from('staff')
    .select('*, positions(name, guard_role)')
    .eq('id', params.id)
    .single()

  if (error || !staff) {
    notFound()
  }

  const typedStaff = staff as StaffDetail

  const { data: guardAssignments } = await supabase
    .from('guard_assignments')
    .select('*, guard_periods(*)')
    .eq('staff_id', typedStaff.id)
    .order('guard_periods(start_date)', { ascending: false })

  const { data: vacations } = await supabase
    .from('vacations')
    .select('*')
    .eq('staff_id', typedStaff.id)
    .order('start_date', { ascending: false })

  const typedAssignments = (guardAssignments || []) as GuardAssignment[]
  const typedVacations = (vacations || []) as Vacation[]

  const initials = `${typedStaff.first_name[0]}${typedStaff.last_name[0]}`

  return (
    <div className="space-y-10 pb-20">
      {/* Breadcrumb + Header */}
      <div className="space-y-3">
        <nav className="flex items-center gap-1.5 text-[13px] text-[#86868B]">
          <Link href="/staff" className="flex items-center gap-1.5 hover:text-[#0066CC] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Personal
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-neutral-900 font-medium">
            {typedStaff.first_name} {typedStaff.last_name}
          </span>
        </nav>
        <DSPageHeader
          title={`${typedStaff.first_name} ${typedStaff.last_name}`}
          subtitle="Ficha detallada del trabajador"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <DSCard className="overflow-hidden p-0" padding="p-0">
            {/* Header gradient */}
            <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] p-8 text-white relative">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-[24px] bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-[28px] font-bold shadow-2xl mb-4">
                  {initials}
                </div>
                <h2 className="text-xl font-bold tracking-tight">
                  {typedStaff.first_name} {typedStaff.last_name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <DSBadge variant={getPositionBadgeVariant(typedStaff.positions?.name || "")} className="bg-white/15 text-white border-white/20">
                    {typedStaff.positions?.name || "Sin puesto"}
                  </DSBadge>
                  {typedStaff.is_active ? (
                    <DSBadge variant="green" className="bg-emerald-500/20 text-emerald-200">Activo</DSBadge>
                  ) : (
                    <DSBadge variant="red" className="bg-red-500/20 text-red-200">Inactivo</DSBadge>
                  )}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none" />
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <DSIconBox icon={Mail} variant="blue" size="sm" />
                <div>
                  <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Email</p>
                  <p className="text-gray-900 font-medium truncate">{typedStaff.email}</p>
                </div>
              </div>

              {typedStaff.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <DSIconBox icon={Phone} variant="green" size="sm" />
                  <div>
                    <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Teléfono</p>
                    <a href={`tel:${typedStaff.phone}`} className="text-gray-900 font-medium hover:text-[#0066CC] transition-colors">
                      {typedStaff.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <DSIconBox icon={Briefcase} variant="indigo" size="sm" />
                <div>
                  <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Puesto</p>
                  <p className="text-gray-900 font-medium">{typedStaff.positions?.name || "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <DSIconBox icon={CalendarDays} variant="green" size="sm" />
                <div>
                  <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Incorporación</p>
                  <p className="text-gray-900 font-medium">
                    {format(parseISO(typedStaff.start_date), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {!typedStaff.is_active && typedStaff.end_date && (
                <div className="flex items-center gap-3 text-sm">
                  <DSIconBox icon={CalendarDays} variant="red" size="sm" />
                  <div>
                    <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Fecha de baja</p>
                    <p className="text-red-600 font-medium">
                      {format(parseISO(typedStaff.end_date), "dd 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              {typedStaff.notes && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <DSIconBox icon={FileText} variant="neutral" size="sm" />
                    <div>
                      <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-1">Notas</p>
                      <p className="text-sm text-gray-500 italic leading-relaxed">{typedStaff.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DSCard>

          {/* Quick Stats */}
          <DSCard padding="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{typedAssignments.length}</p>
                <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mt-1">Guardias</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{typedVacations.filter(v => v.status === 'approved').length}</p>
                <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mt-1">Vacaciones</p>
              </div>
            </div>
          </DSCard>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-8 space-y-8">
          {/* Guard History */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <DSIconBox icon={Shield} variant="blue" size="sm" />
              <DSSectionHeading>Historial de Guardias</DSSectionHeading>
            </div>

            {typedAssignments.length > 0 ? (
              <DSCard padding="p-0" className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-3">Semana</th>
                      <th className="px-6 py-3">Periodo</th>
                      <th className="px-6 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {typedAssignments.map((assignment) => {
                      const period = assignment.guard_periods
                      let status = "Pasada"
                      let badgeVariant: "neutral" | "blue" | "green" = "neutral"

                      if (period.start_date <= today && period.end_date >= today) {
                        status = "Activa"
                        badgeVariant = "green"
                      } else if (period.start_date > today) {
                        status = "Futura"
                        badgeVariant = "blue"
                      }

                      return (
                        <tr key={assignment.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <DSBadge variant="indigo">S{period.week_number}</DSBadge>
                          </td>
                          <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                            {format(parseISO(period.start_date), 'dd MMM', { locale: es })} — {format(parseISO(period.end_date), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="px-6 py-3.5">
                            <DSBadge variant={badgeVariant}>{status}</DSBadge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </DSCard>
            ) : (
              <DSCard className="text-center py-12">
                <DSIconBox icon={Shield} variant="neutral" className="mx-auto mb-3" />
                <p className="text-sm text-gray-500">No tiene asignaciones de guardia registradas.</p>
              </DSCard>
            )}
          </div>

          {/* Vacation History */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <DSIconBox icon={Sun} variant="orange" size="sm" />
              <DSSectionHeading>Historial de Vacaciones</DSSectionHeading>
            </div>

            {typedVacations.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {typedVacations.map((vac) => {
                  const isCancelled = vac.status === 'cancelled' || vac.status === 'cancelado'
                  return (
                    <DSCard key={vac.id} className={isCancelled ? "opacity-60 grayscale-[0.3]" : ""}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <CalendarDays className="h-4 w-4 text-[#0066CC]" />
                          {format(parseISO(vac.start_date), 'dd MMM', { locale: es })} — {format(parseISO(vac.end_date), 'dd MMM yyyy', { locale: es })}
                        </div>
                        <DSBadge variant={isCancelled ? "neutral" : "green"}>
                          {isCancelled ? "Cancelada" : "Aprobada"}
                        </DSBadge>
                      </div>
                      {vac.notes && (
                        <p className="text-xs text-gray-400 italic">{vac.notes}</p>
                      )}
                    </DSCard>
                  )
                })}
              </div>
            ) : (
              <DSCard className="text-center py-12">
                <DSIconBox icon={Sun} variant="neutral" className="mx-auto mb-3" />
                <p className="text-sm text-gray-500">No tiene periodos de vacaciones registrados.</p>
              </DSCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
