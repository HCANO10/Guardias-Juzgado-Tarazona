"use client"

import { useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Sun,
  Users,
  CircleCheck,
  AlertTriangle,
  Calendar as CalendarIcon,
  ArrowRight,
  Sparkles,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from "next/dynamic"
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"
import {
  DSCard,
  DSMetricCard,
  DSPageHeader,
  DSSectionHeading,
  DSAlert,
  tokens,
} from "@/lib/design-system"

const UnifiedCalendar = dynamic(
  () => import("@/components/calendar/UnifiedCalendar"),
  { ssr: false, loading: () => <CalendarSkeleton /> }
)

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  position?: { name: string; guard_role: string | null }
}

interface GuardPeriod {
  week_number: number
  start_date: string
  end_date: string
}

interface DashboardPageClientProps {
  stats: {
    nextGuard: GuardPeriod | null
    vacationDays: number
    activeStaffCount: number
    staffBreakdown: { auxilio: number; tramitador: number; gestor: number }
    coverage: {
      total: number
      complete: number
      partial: number
      missing: number
    }
    alerts: Array<{
      week_number: number
      start_date: string
      end_date: string
      count: number
    }>
  }
  calendarData: {
    guards: Array<{
      id: string; start_date: string; end_date: string;
      auxilio: { id: string; first_name: string } | null;
      tramitador: { id: string; first_name: string } | null;
      gestor: { id: string; first_name: string } | null;
    }>
    vacations: Array<{
      id: string; staff_id: string; start_date: string; end_date: string;
      staff: { first_name: string } | null;
    }>
    holidays: Array<{ id: string; date: string; name: string; scope: string }>
    staff: StaffMember[]
  }
  currentUserStaffId: string | null
}

export default function DashboardPageClient({
  stats,
  calendarData,
  currentUserStaffId,
}: DashboardPageClientProps) {
  const router = useRouter()

  // Auto-refresh each 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [router])

  const coveragePercent =
    stats.coverage.total > 0
      ? Math.round((stats.coverage.complete / stats.coverage.total) * 100)
      : 0

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 20) return "Buenas tardes"
    return "Buenas noches"
  }, [])

  const currentUser = useMemo(() => {
    if (!currentUserStaffId || !calendarData.staff) return null
    return calendarData.staff.find(
      (s: StaffMember) => s.id === currentUserStaffId
    )
  }, [calendarData.staff, currentUserStaffId])

  const userName = currentUser ? currentUser.first_name : "Compañero"

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <DSPageHeader
        title={`${greeting}, ${userName}`}
        subtitle={format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", {
          locale: es,
        })}
      />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DSMetricCard
          label="Próxima Guardia"
          value={
            stats.nextGuard
              ? `Semana ${stats.nextGuard.week_number}`
              : "Sin asignar"
          }
          subtitle={
            stats.nextGuard
              ? `${format(parseISO(stats.nextGuard.start_date), "d MMM", { locale: es })} — ${format(parseISO(stats.nextGuard.end_date), "d MMM", { locale: es })}`
              : "No hay guardias pendientes"
          }
          icon={Shield}
          iconVariant="primary"
        />

        <DSMetricCard
          label="Vacaciones"
          value={`${stats.vacationDays} / 22`}
          subtitle="Días disponibles"
          icon={Sun}
          iconVariant="warning"
        />

        <DSMetricCard
          label="Personal Activo"
          value={stats.activeStaffCount}
          subtitle={`${stats.staffBreakdown.auxilio}A · ${stats.staffBreakdown.tramitador}T · ${stats.staffBreakdown.gestor}G`}
          icon={Users}
          iconVariant="green"
        />

        <DSMetricCard
          label="Cobertura"
          value={`${coveragePercent}%`}
          subtitle={`${stats.coverage.complete} de ${stats.coverage.total} semanas`}
          icon={CircleCheck}
          iconVariant={coveragePercent >= 90 ? "success" : "danger"}
        />
      </div>

      {/* Alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-3">
          {stats.alerts.map((alert, i) => (
            <DSAlert key={i} variant="danger" icon={AlertTriangle} title={`Semana ${alert.week_number} sin cobertura completa`}>
              Periodo del {format(parseISO(alert.start_date), "d", { locale: es })} al{" "}
              {format(parseISO(alert.end_date), "d 'de' MMMM", { locale: es })}.
              {alert.count === 0
                ? " No hay nadie asignado."
                : ` Solo ${alert.count}/3 puestos cubiertos.`}{" "}
              <Link
                href="/guards"
                className="font-semibold underline underline-offset-2"
              >
                Asignar personal
              </Link>
            </DSAlert>
          ))}
        </div>
      )}

      {/* Bottom: Calendar + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Calendar */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <DSSectionHeading>Calendario de Guardias</DSSectionHeading>
            <Link
              href="/calendar"
              className="text-sm font-medium text-[#0066CC] hover:underline flex items-center gap-1"
            >
              Ver completo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <DSCard padding="p-0" className="overflow-hidden min-h-[460px]">
            <div className="dashboard-calendar">
              <UnifiedCalendar
                guards={calendarData.guards}
                vacations={calendarData.vacations}
                holidays={calendarData.holidays}
                staff={calendarData.staff}
              />
            </div>
          </DSCard>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <DSSectionHeading>Acciones Rápidas</DSSectionHeading>

            <Link href="/guards">
              <DSCard
                padding="px-4 py-3.5"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-[10px] bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Sparkles
                    className="h-4 w-4 text-indigo-600"
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    Generar con IA
                  </p>
                  <p className="text-xs text-slate-500">
                    Asignación automática
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </DSCard>
            </Link>

            <Link href="/staff">
              <DSCard
                padding="px-4 py-3.5"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-[10px] bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <UserPlus
                    className="h-4 w-4 text-emerald-600"
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    Nuevo Personal
                  </p>
                  <p className="text-xs text-slate-500">Añadir trabajador</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </DSCard>
            </Link>

            <Link href="/vacations">
              <DSCard
                padding="px-4 py-3.5"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="h-9 w-9 rounded-[10px] bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Sun
                    className="h-4 w-4 text-amber-600"
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    Vacaciones
                  </p>
                  <p className="text-xs text-slate-500">
                    Solicitar o revisar
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </DSCard>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <DSSectionHeading>Distribución</DSSectionHeading>
            <DSCard padding="p-4">
              <div className="space-y-3">
                {[
                  {
                    label: "Auxilio",
                    count: stats.staffBreakdown.auxilio,
                    color: "bg-amber-500",
                    bg: "bg-amber-100",
                  },
                  {
                    label: "Tramitador",
                    count: stats.staffBreakdown.tramitador,
                    color: "bg-blue-500",
                    bg: "bg-blue-100",
                  },
                  {
                    label: "Gestor",
                    count: stats.staffBreakdown.gestor,
                    color: "bg-emerald-500",
                    bg: "bg-emerald-100",
                  },
                ].map((cat) => (
                  <div key={cat.label} className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                    <span className="text-sm text-slate-600 flex-1">
                      {cat.label}
                    </span>
                    <span
                      className="text-sm font-semibold text-slate-900"
                      style={{ fontFamily: tokens.fonts.heading }}
                    >
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            </DSCard>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-calendar .fc-header-toolbar {
          display: none !important;
        }
        .dashboard-calendar .fc-scrollgrid {
          border: none !important;
        }
        .dashboard-calendar .fc-view-harness {
          background: transparent;
        }
        .dashboard-calendar .fc-col-header-cell {
          background: #f1f5f9;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 0;
          color: #64748b;
          border-color: #e2e8f0 !important;
        }
        .dashboard-calendar .fc-daygrid-day-number {
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          border: none;
        }
        .dashboard-calendar .fc-daygrid-day {
          background: transparent !important;
        }
        .dashboard-calendar .fc-scrollgrid-sync-table td,
        .dashboard-calendar .fc-scrollgrid-sync-table th {
          border-color: #e2e8f0 !important;
        }
        .dashboard-calendar .fc-daygrid-day.fc-day-today {
          background: rgba(79, 70, 229, 0.06) !important;
        }
      `}</style>
    </div>
  )
}
