/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
  
  const coveragePercent = stats.coverage.total > 0 
    ? (stats.coverage.complete / stats.coverage.total) * 100 
    : 0

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Next Guard */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mi próxima guardia</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {stats.nextGuard ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold">Semana {stats.nextGuard.week_number}</div>
                <p className="text-xs text-muted-foreground italic">
                  {format(new Date(stats.nextGuard.start_date), 'dd/MM')} → {format(new Date(stats.nextGuard.end_date), 'dd/MM')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No tienes guardias asignadas este año.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vacations */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacaciones {new Date().getFullYear()}</CardTitle>
            <Palmtree className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vacationDays} días</div>
            <p className="text-xs text-muted-foreground">Disfrutados o aprobados</p>
          </CardContent>
        </Card>

        {/* Staff */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal activo</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaffCount} personas</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex gap-1">
              <span>{stats.staffBreakdown.auxilio} aux</span>
              <span>•</span>
              <span>{stats.staffBreakdown.tramitador} tra</span>
              <span>•</span>
              <span>{stats.staffBreakdown.gestor} ges</span>
            </p>
          </CardContent>
        </Card>

        {/* Coverage */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura anual</CardTitle>
            <ShieldCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-end">
              <div className="text-2xl font-bold">{stats.coverage.complete}/{stats.coverage.total}</div>
              <p className="text-xs text-muted-foreground pb-1">cubiertas</p>
            </div>
            <Progress value={coveragePercent} className="h-1.5" />
            {stats.coverage.missing > 0 && (
              <p className="text-[10px] text-destructive font-bold flex items-center">
                <AlertTriangle className="mr-1 h-3 w-3" /> {stats.coverage.missing} SEMANAS SIN CUBRIR
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Alerts (Dynamic) */}
      {stats.alerts.length > 0 && (
        <div className="space-y-3">
          {stats.alerts.map((alert, i) => (
            <Alert key={i} variant="default" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falta cobertura en próxima guardia</AlertTitle>
              <AlertDescription className="text-xs">
                La **semana {alert.week_number}** ({format(new Date(alert.start_date), 'dd/MM')} al {format(new Date(alert.end_date), 'dd/MM')}) 
                {alert.count === 0 ? " no tiene personal asignado." : ` solo tiene ${alert.count}/3 puestos cubiertos.`}
                <Link href="/guards" className="underline font-bold ml-1">Asignar ahora</Link>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        {/* Main Content Area: Mini Calendar */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold">Resumen Mensual</CardTitle>
                <Link href="/calendar">
                   <Button variant="ghost" size="sm" className="text-primary text-xs flex items-center">
                      Calendario completo <ArrowRight className="ml-1 h-3 w-3" />
                   </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {/* Simplified local calendar for dashboard or compact FullCalendar */}
               <div className="dashboard-calendar">
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
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              <Link href="/calendar" className="w-full">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Calendario completo</span>
                </div>
              </Link>
              <Link href="/vacations" className="w-full">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors border border-green-500/20">
                  <Palmtree className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Solicitar vacaciones</span>
                </div>
              </Link>
              <Link href="/guards" className="w-full">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors border border-orange-500/20">
                  <ShieldCheck className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium">Gestionar guardias</span>
                </div>
              </Link>
              <Link href="/staff" className="w-full">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Ver personal</span>
                </div>
              </Link>
            </CardContent>
          </Card>
          
          <Alert className="bg-primary/5 border-primary/20 text-xs text-muted-foreground leading-relaxed">
            Recordatorio: El cuadrante de guardias se genera mediante IA en la sección de Configuración.
          </Alert>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-calendar .fc-header-toolbar {
          margin-bottom: 0 !important;
          padding: 10px;
          display: none !important;
        }
        .dashboard-calendar {
          max-height: 500px;
          overflow: hidden;
        }
        .dashboard-calendar .fc-view-harness {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
