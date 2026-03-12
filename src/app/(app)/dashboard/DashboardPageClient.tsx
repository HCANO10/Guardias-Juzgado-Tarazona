/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Palmtree, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  ArrowRight,
  UserCheck
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from 'next/dynamic'
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"

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
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {greeting}, <span className="text-primary">{userName}</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
          Bienvenido al sistema de gestión de guardias. Aquí tienes el resumen de hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}.
        </p>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Next Guard */}
        <Card className="card-modern overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none">Próxima</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Tu guardia</h3>
                {stats.nextGuard ? (
                  <>
                    <div className="text-2xl font-bold tracking-tight">Semana {stats.nextGuard.week_number}</div>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1">
                      {format(new Date(stats.nextGuard.start_date), 'dd/MM')} — {format(new Date(stats.nextGuard.end_date), 'dd/MM')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin guardias asignadas</p>
                )}
              </div>
            </div>
            <div className="h-1 bg-primary/20 w-full" />
          </CardContent>
        </Card>

        {/* Vacations */}
        <Card className="card-modern overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                  <Palmtree className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-none">{new Date().getFullYear()}</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Vacaciones</h3>
                <div className="text-2xl font-bold tracking-tight">{stats.vacationDays} días</div>
                <p className="text-xs text-muted-foreground font-medium mt-1">Disfrutados o aprobados</p>
              </div>
            </div>
            <div className="h-1 bg-green-500/20 w-full" />
          </CardContent>
        </Card>

        {/* Staff */}
        <Card className="card-modern overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">Activos</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Personal</h3>
                <div className="text-2xl font-bold tracking-tight">{stats.activeStaffCount} personas</div>
                <div className="flex gap-2 mt-1">
                   <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{stats.staffBreakdown.auxilio} A</span>
                   <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{stats.staffBreakdown.tramitador} T</span>
                   <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{stats.staffBreakdown.gestor} G</span>
                </div>
              </div>
            </div>
            <div className="h-1 bg-blue-500/20 w-full" />
          </CardContent>
        </Card>

        {/* Coverage */}
        <Card className="card-modern overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-orange-600">{Math.round(coveragePercent)}%</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Cobertura anual</h3>
                  <div className="text-2xl font-bold tracking-tight">{stats.coverage.complete}/{stats.coverage.total}</div>
                </div>
                <Progress value={coveragePercent} className="h-1.5 bg-orange-100" />
                {stats.coverage.missing > 0 && (
                  <p className="text-[10px] text-red-600 font-bold flex items-center uppercase tracking-tighter">
                    <AlertTriangle className="mr-1 h-3 w-3" /> {stats.coverage.missing} SEMANAS POR CUBRIR
                  </p>
                )}
              </div>
            </div>
            <div className="h-1 bg-orange-500/20 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Alerts (Dynamic) */}
      {stats.alerts.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {stats.alerts.map((alert, i) => (
            <Alert key={i} className="bg-red-50 border-red-100 text-red-900 rounded-2xl p-4 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="ml-2">
                <AlertTitle className="font-bold">Acción necesaria</AlertTitle>
                <AlertDescription className="text-sm mt-1">
                  La **semana {alert.week_number}** ({format(new Date(alert.start_date), 'dd/MM')} al {format(new Date(alert.end_date), 'dd/MM')}) 
                  {alert.count === 0 ? " no tiene personal asignado." : ` solo tiene ${alert.count}/3 puestos cubiertos.`}
                  <Link href="/guards" className="ml-2 inline-flex items-center text-red-700 font-bold hover:underline">
                    Completar ahora <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12 mt-8">
        {/* Main Content Area: Mini Calendar */}
        <div className="lg:col-span-9 space-y-6">
          <Card className="card-modern overflow-hidden">
            <CardHeader className="p-6 border-b transition-colors bg-white/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Actividad Reciente</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Resumen visual de turnos y ausencias.</p>
                </div>
                <Link href="/calendar">
                   <Button variant="outline" size="sm" className="rounded-xl border-indigo-100 text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                      Ver completo <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 lg:p-4">
               <div className="dashboard-calendar glass rounded-xl overflow-hidden border border-border/50">
                 <UnifiedCalendar 
                   guards={calendarData.guards}
                   vacations={calendarData.vacations}
                   holidays={calendarData.holidays}
                   staff={calendarData.staff}
                 />
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Quick Actions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-2">Accesos Directos</h3>
            <div className="grid gap-3">
              <Link href="/calendar">
                <div className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-foreground">Calendario</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/vacations">
                <div className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-border/50 hover:border-green-500/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                      <Palmtree className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-foreground">Vacaciones</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/guards">
                <div className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-border/50 hover:border-orange-500/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-foreground">Guardias</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/staff">
                <div className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-border/50 hover:border-blue-500/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-foreground">Personal</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
          
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="font-bold text-lg mb-2">IA en acción</h4>
              <p className="text-white/80 text-sm leading-relaxed">
                El cuadrante está optimizado mediante algoritmos de IA para garantizar equidad.
              </p>
            </div>
            <Shield className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform duration-700" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-calendar .fc-header-toolbar {
          margin-bottom: 0 !important;
          padding: 10px;
          display: none !important;
        }
        .dashboard-calendar {
          max-height: 550px;
          overflow: hidden;
        }
        .dashboard-calendar .fc-view-harness {
          background: transparent;
        }
        .dashboard-calendar .fc-scrollgrid {
          border: none !important;
        }
      `}</style>
    </div>
  )
}
