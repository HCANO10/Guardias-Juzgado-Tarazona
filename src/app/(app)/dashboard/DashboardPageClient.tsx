/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Shield, 
  Palmtree, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  ArrowRight,
  UserCheck,
  Zap
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from 'next/dynamic'
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"
import { DSCard, DSBadge, DSIconBox, DSPageHeader, DSSectionHeading, DSButton } from "@/lib/design-system"

const UnifiedCalendar = dynamic(
  () => import('@/components/calendar/UnifiedCalendar'),
  { ssr: false, loading: () => <CalendarSkeleton /> }
)

interface DashboardPageClientProps {
  stats: {
    nextGuard: any | null
    vacationDays: number
    activeStaffCount: number
    staffBreakdown: { auxilio: number; tramitador: number; gestor: number }
    coverage: { total: number; complete: number; partial: number; missing: number }
    alerts: any[]
  }
  calendarData: {
    guards: any[]
    vacations: any[]
    holidays: any[]
    staff: any[]
  }
  currentUserStaffId: string | null
}

export default function DashboardPageClient({ stats, calendarData }: DashboardPageClientProps) {
  const supabase = createClient()
  const [currentUserStaffId, setCurrentUserStaffId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()
        if (staff) setCurrentUserStaffId(staff.id)
      }
    }
    fetchCurrentUser()
  }, [supabase])

  const coveragePercent = stats.coverage.total > 0 
    ? (stats.coverage.complete / stats.coverage.total) * 100 
    : 0

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 20) return "Buenas tardes"
    return "Buenas noches"
  }, [])

  const currentUser = useMemo(() => {
    if (!currentUserStaffId || !calendarData.staff) return null
    return calendarData.staff.find((s: any) => s.id === currentUserStaffId)
  }, [calendarData.staff, currentUserStaffId])

  const userName = currentUser ? currentUser.first_name : "Compañero"

  return (
    <div className="space-y-10 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[17px] text-[#86868B] font-medium">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
          <h1 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-neutral-900 leading-tight">
            {greeting}, <span className="text-[#0066CC]">{userName}</span>
          </h1>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Next Guard */}
        <DSCard className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <DSIconBox icon={Shield} variant="blue" />
              <DSBadge variant="blue">Próxima</DSBadge>
            </div>
            <p className="text-[15px] font-medium text-[#86868B]">Tu guardia</p>
            {stats.nextGuard ? (
              <div className="mt-1">
                <p className="text-[28px] font-semibold tracking-tight text-neutral-900">Semana {stats.nextGuard.week_number}</p>
                <p className="text-[13px] text-[#86868B] mt-0.5">
                  {format(new Date(stats.nextGuard.start_date), 'dd MMM')} — {format(new Date(stats.nextGuard.end_date), 'dd MMM')}
                </p>
              </div>
            ) : (
              <p className="text-[20px] font-semibold text-neutral-400 mt-2">Sin asignar</p>
            )}
          </div>
        </DSCard>

        {/* Vacations */}
        <DSCard className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <DSIconBox icon={Palmtree} variant="green" />
              <DSBadge variant="green">{new Date().getFullYear()}</DSBadge>
            </div>
            <p className="text-[15px] font-medium text-[#86868B]">Vacaciones</p>
            <p className="text-[28px] font-semibold tracking-tight text-neutral-900">{stats.vacationDays} días</p>
            <p className="text-[13px] text-[#86868B] mt-0.5">Disfrutados o aprobados</p>
          </div>
        </DSCard>

        {/* Staff */}
        <DSCard className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <DSIconBox icon={Users} variant="indigo" />
              <DSBadge variant="indigo">Activos</DSBadge>
            </div>
            <p className="text-[15px] font-medium text-[#86868B]">Personal</p>
            <p className="text-[28px] font-semibold tracking-tight text-neutral-900">{stats.activeStaffCount} personas</p>
            <div className="flex gap-2 mt-2">
               <DSBadge variant="indigo">{stats.staffBreakdown.auxilio} A</DSBadge>
               <DSBadge variant="blue">{stats.staffBreakdown.tramitador} T</DSBadge>
               <DSBadge variant="green">{stats.staffBreakdown.gestor} G</DSBadge>
            </div>
          </div>
        </DSCard>

        {/* Coverage */}
        <DSCard className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <DSIconBox icon={ShieldCheck} variant="orange" />
              <p className="text-[20px] font-bold text-orange-600">{Math.round(coveragePercent)}%</p>
            </div>
            <p className="text-[15px] font-medium text-[#86868B]">Cobertura anual</p>
            <p className="text-[28px] font-semibold tracking-tight text-neutral-900">{stats.coverage.complete}/{stats.coverage.total}</p>
            <div className="mt-3 space-y-1.5">
              <Progress value={coveragePercent} className="h-1.5 bg-orange-50" />
              {stats.coverage.missing > 0 && (
                <p className="text-[11px] text-red-600 font-bold uppercase tracking-wider flex items-center">
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" /> {stats.coverage.missing} faltantes
                </p>
              )}
            </div>
          </div>
        </DSCard>
      </div>

      {/* Row 2: Alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-3">
          {stats.alerts.map((alert, i) => (
            <div key={i} className="bg-red-50 border border-red-100 rounded-[20px] p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-red-900">Acción necesaria: Semana {alert.week_number}</p>
                <p className="text-[13px] text-red-700/80 mt-1 leading-relaxed">
                  Falta personal para el periodo del {format(new Date(alert.start_date), 'd')} al {format(new Date(alert.end_date), "d 'de' MMMM", { locale: es })}.
                  {alert.count === 0 ? " No hay nadie asignado." : ` Solo hay ${alert.count}/3 puestos cubiertos.`}
                </p>
                <Link href="/guards" className="inline-flex items-center text-[13px] font-bold text-red-600 hover:underline mt-3">
                  Asignar personal <ArrowRight className="ml-1 h-3.5 w-3.5" strokeWidth={3} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Main Content Area: Mini Calendar */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-1">
            <DSSectionHeading className="mb-0">Actividad Reciente</DSSectionHeading>
            <Link href="/calendar">
               <span className="text-[15px] font-semibold text-[#0066CC] hover:underline flex items-center gap-1.5">
                 Ver completo <ArrowRight className="h-4 w-4" />
               </span>
            </Link>
          </div>
          
          <DSCard className="p-0 overflow-hidden min-h-[500px]">
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

        {/* Sidebar: Quick Actions */}
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <DSSectionHeading>Accesos Directos</DSSectionHeading>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/calendar">
                <button className="flex flex-col items-start p-5 bg-white rounded-[24px] border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all w-full text-left group">
                  <DSIconBox icon={CalendarIcon} variant="blue" className="mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[15px] font-semibold text-neutral-900">Calendario</span>
                  <span className="text-[12px] text-[#86868B] mt-1">Ver turnos</span>
                </button>
              </Link>
              <Link href="/vacations">
                <button className="flex flex-col items-start p-5 bg-white rounded-[24px] border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all w-full text-left group">
                  <DSIconBox icon={Palmtree} variant="green" className="mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[15px] font-semibold text-neutral-900">Vacaciones</span>
                  <span className="text-[12px] text-[#86868B] mt-1">Solicitudes</span>
                </button>
              </Link>
              <Link href="/guards">
                <button className="flex flex-col items-start p-5 bg-white rounded-[24px] border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all w-full text-left group">
                  <DSIconBox icon={ShieldCheck} variant="orange" className="mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[15px] font-semibold text-neutral-900">Guardias</span>
                  <span className="text-[12px] text-[#86868B] mt-1">Gestión</span>
                </button>
              </Link>
              <Link href="/staff">
                <button className="flex flex-col items-start p-5 bg-white rounded-[24px] border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all w-full text-left group">
                  <DSIconBox icon={Users} variant="indigo" className="mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[15px] font-semibold text-neutral-900">Personal</span>
                  <span className="text-[12px] text-[#86868B] mt-1">Directorio</span>
                </button>
              </Link>
            </div>
          </div>
          
          <div className="bg-neutral-900 rounded-[28px] p-8 text-white relative overflow-hidden group shadow-xl">
            <div className="relative z-10">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                <Zap className="h-5 w-5 text-[#0066CC] fill-current" />
              </div>
              <h4 className="text-[20px] font-semibold mb-2">Optimización IA</h4>
              <p className="text-white/60 text-[14px] leading-relaxed">
                El algoritmo de asignación automática garantiza una distribución equitativa de las guardias entre todo el personal disponible.
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-[#0066CC]/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000" />
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
          background: white;
        }
        .dashboard-calendar .fc-col-header-cell {
          background: #F2F2F7;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 0;
          color: #86868B;
        }
        .dashboard-calendar .fc-daygrid-day-number {
          font-size: 13px;
          font-weight: 500;
          color: #171717;
          border: none;
        }
      `}</style>
    </div>
  )
}
