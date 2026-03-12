/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
import { buildFullName } from "@/lib/staff/normalize"
import { useRole } from "@/hooks/use-role"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { format, differenceInDays, isWithinInterval } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2, AlertCircle, CheckCircle2, XCircle, Trash2, Search, Sun, ArrowRight, Shield, Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface VacationsPageClientProps {
  staff: any[]
  vacations: any[]
  currentStaffId: string | null
  nextGuard: any | null
}

export default function VacationsPageClient({ staff, vacations, currentStaffId, nextGuard }: VacationsPageClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { isHeadmaster, staffId: myStaffId } = useRole()

  // Form states
  const [selectedStaffId, setSelectedStaffId] = useState<string>(currentStaffId || "")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [notes, setNotes] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictResult, setConflictResult] = useState<{ valid: boolean; conflicts: any[] } | null>(null)

  // Filter states
  const [staffFilter, setStaffFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Resumen lateral del trabajador seleccionado en el FORMULARIO
  const selectedStaffStats = useMemo(() => {
    if (!selectedStaffId) return null
    
    const staffMember = staff.find(s => s.id === selectedStaffId)
    const currentYear = new Date().getFullYear()
    
    // Filtramos vacaciones aprobadas de este año para este trabajador
    const approvedVacations = vacations.filter(v => 
      v.staff_id === selectedStaffId && 
      v.status === 'approved' &&
      new Date(v.start_date).getFullYear() === currentYear
    )

    const usedDays = approvedVacations.reduce((acc, v) => {
      const days = differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1
      return acc + days
    }, 0)

    // Próximas vacaciones
    const today = new Date()
    const nextVac = vacations
      .filter(v => v.staff_id === selectedStaffId && v.status === 'approved' && new Date(v.start_date) >= today)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]

    return {
      name: staffMember ? buildFullName(staffMember) : "",
      usedDays,
      nextVac: nextVac ? `${format(new Date(nextVac.start_date), 'dd/MM')} al ${format(new Date(nextVac.end_date), 'dd/MM')}` : "Ninguna",
      nextGuard: selectedStaffId === currentStaffId && nextGuard 
        ? `Semana ${nextGuard.week_number} (${format(new Date(nextGuard.start_date), 'dd/MM', { locale: es })})`
        : "—"
    }
  }, [selectedStaffId, vacations, staff, currentStaffId, nextGuard])

  // Lógica de filtrado de la tabla
  const filteredVacations = useMemo(() => {
    return vacations.filter(v => {
      if (staffFilter !== "all" && v.staff_id !== staffFilter) return false
      if (statusFilter !== "all" && v.status !== statusFilter) return false
      return true
    })
  }, [vacations, staffFilter, statusFilter])

  const handleValidateAndSubmit = async () => {
    if (!selectedStaffId || !dateRange.from || !dateRange.to) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Selecciona trabajador y rango de fechas." })
      return
    }

    setIsValidating(true)
    setConflictResult(null)

    try {
      const resp = await fetch('/api/vacations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd')
        })
      })

      const result = await resp.json()
      if (!resp.ok) throw new Error(result.error)

      if (!result.valid) {
        setConflictResult(result)
        toast({ variant: "destructive", title: "Conflicto detectado", description: "No puedes pedir estas fechas." })
      } else {
        // Proceder a guardar
        handleSave()
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('vacations')
        .insert({
          staff_id: selectedStaffId,
          start_date: format(dateRange.from!, 'yyyy-MM-dd'),
          end_date: format(dateRange.to!, 'yyyy-MM-dd'),
          notes: notes,
          status: 'approved'
        })

      if (error) throw error

      toast({ title: "Vacaciones registradas", description: "Se han guardado correctamente." })
      
      // Reset form
      setDateRange({ from: undefined, to: undefined })
      setNotes("")
      setConflictResult(null)
      
      router.refresh()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelVacation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vacations')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error
      toast({ title: "Vacaciones canceladas" })
      router.refresh()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    }
  }

  // View state for history
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Gestión de Vacaciones</h1>
          <p className="text-muted-foreground">Solicita y gestiona tus periodos de descanso ({new Date().getFullYear()}).</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Formulario e Histórico - Columna Principal (Izquierda) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Formulario de Solicitud */}
          <Card className="card-modern border-none bg-white shadow-sm overflow-hidden">
            <div className="h-2 bg-primary/20 w-full" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sun className="h-5 w-5 text-orange-500" /> Nueva Solicitud
              </CardTitle>
              <CardDescription>El sistema validará automáticamente si tienes guardias asignadas en las fechas elegidas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Trabajador</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={!isHeadmaster}>
                    <SelectTrigger className="rounded-xl border-border/50 bg-accent/30 h-11">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {(isHeadmaster ? staff : staff.filter(s => s.id === currentStaffId)).map(s => (
                        <SelectItem key={s.id} value={s.id}>{buildFullName(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Rango de fechas</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 rounded-xl border-border/50 bg-accent/30 hover:bg-accent/50 transition-colors",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <span className="font-medium text-foreground">
                              {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                            </span>
                          ) : (
                            <span className="font-medium text-foreground">{format(dateRange.from, "dd/MM/yyyy")}</span>
                          )
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-border/50 shadow-xl" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                        locale={es}
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Motivo / Notas (opcional)</label>
                <Textarea 
                  placeholder="Ej: Vacaciones de verano, asuntos propios..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl border-border/50 bg-accent/30 focus:bg-white transition-all min-h-[80px]"
                />
              </div>

              {conflictResult && !conflictResult.valid && (
                <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-900 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div className="ml-2">
                    <AlertTitle className="font-bold">Conflicto con Guardias</AlertTitle>
                    <AlertDescription className="text-sm mt-1 space-y-1">
                      {conflictResult.conflicts.map((c, i) => (
                        <div key={i}>
                          &bull; Tienes guardia la **semana {c.guard_week_number}** ({format(new Date(c.guard_start_date), 'dd/MM')} al {format(new Date(c.guard_end_date), 'dd/MM')}).
                        </div>
                      ))}
                      <p className="font-semibold text-red-700 mt-2">Reasigna tu guardia antes de pedir estas fechas.</p>
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <Button 
                onClick={handleValidateAndSubmit} 
                disabled={isValidating || isSubmitting || !!(conflictResult && !conflictResult.valid)} 
                className="w-full h-12 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all font-bold text-base"
              >
                {isValidating || isSubmitting ? (
                   <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                   <CheckCircle2 className="mr-2 h-5 w-5" />
                )}
                {isValidating ? "Validando..." : isSubmitting ? "Registrando..." : "Solicitar Vacaciones"}
              </Button>
            </CardContent>
          </Card>

          {/* Listado de Vacaciones / Histórico */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 px-1 text-foreground">
                    Histórico y Planificación
                  </h3>
               </div>
               
               <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <Select value={staffFilter} onValueChange={setStaffFilter}>
                    <SelectTrigger className="w-full md:w-[150px] rounded-xl bg-white border-border/50 shadow-sm h-9 text-xs">
                      <SelectValue placeholder="Trabajador" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todo el personal</SelectItem>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{buildFullName(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[130px] rounded-xl bg-white border-border/50 shadow-sm h-9 text-xs">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Cualquier estado</SelectItem>
                      <SelectItem value="approved">Aprobadas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex bg-accent/50 p-1 rounded-xl">
                    <Button 
                      variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-7 rounded-lg px-3"
                      onClick={() => setViewMode('table')}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">Tabla</span>
                    </Button>
                    <Button 
                      variant={viewMode === 'cards' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-7 rounded-lg px-3"
                      onClick={() => setViewMode('cards')}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">Mosaico</span>
                    </Button>
                  </div>
               </div>
            </div>

            {viewMode === 'table' ? (
              <div className="rounded-2xl border border-border/50 bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-accent/30">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="font-bold">Trabajador</TableHead>
                      <TableHead className="font-bold">Periodo</TableHead>
                      <TableHead className="text-center font-bold">Días</TableHead>
                      <TableHead className="font-bold">Estado</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVacations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                          <EmptyState 
                            icon={vacations.length === 0 ? Sun : Search}
                            title={vacations.length === 0 ? "Sin histórico" : "Sin resultados"}
                            description="Aún no hay registros que coincidan con los filtros."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVacations.map((v) => {
                        const daysNum = differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1
                        const staffMem = staff.find(s => s.id === v.staff_id)
                        const isCan = v.status === 'cancelled'
                        
                        return (
                          <TableRow key={v.id} className={cn("h-16 border-border/50 transition-colors", isCan ? "opacity-60 grayscale-[0.5]" : "hover:bg-accent/5")}>
                            <TableCell className="font-bold text-foreground">
                              {staffMem ? buildFullName(staffMem) : "???"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 font-medium">
                                {format(new Date(v.start_date), 'dd MMM', {locale: es})} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {format(new Date(v.end_date), 'dd MMM', {locale: es})}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                               <span className="h-7 w-7 rounded-full bg-accent flex items-center justify-center mx-auto text-xs font-bold">{daysNum}</span>
                            </TableCell>
                            <TableCell>
                              {v.status === 'approved' ? (
                                <Badge className="bg-green-50 text-green-700 border-none rounded-lg font-medium px-2 py-0.5">Aprobada</Badge>
                              ) : (
                                <Badge className="bg-accent text-muted-foreground border-none rounded-lg font-medium px-2 py-0.5">Cancelada</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {v.status === 'approved' && (isHeadmaster || v.staff_id === myStaffId) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                                  onClick={() => handleCancelVacation(v.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredVacations.map((v) => {
                  const daysNum = differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1
                  const staffMem = staff.find(s => s.id === v.staff_id)
                  const isCan = v.status === 'cancelled'
                  
                  return (
                    <Card key={v.id} className={cn("card-modern border-none bg-white", isCan && "opacity-60")}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-foreground">{staffMem ? buildFullName(staffMem) : "???"}</p>
                            <p className="text-xs text-muted-foreground capitalize">{v.notes || "Sin observaciones"}</p>
                          </div>
                          {isCan ? (
                             <Badge className="bg-accent text-muted-foreground border-none rounded-lg">Cancelada</Badge>
                          ) : (
                             <Badge className="bg-green-50 text-green-700 border-none rounded-lg">Aprobada</Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-2 border-y border-border/30 border-dashed">
                           <div className="flex items-center gap-2 text-sm font-bold">
                              <CalendarIcon className="h-3 w-3 text-primary" />
                              {format(new Date(v.start_date), 'd MMM')} &rarr; {format(new Date(v.end_date), 'd MMM')}
                           </div>
                           <div className="flex items-center gap-1 text-xs font-bold bg-accent py-0.5 px-2 rounded-full">
                              {daysNum} días
                           </div>
                        </div>

                        {v.status === 'approved' && (isHeadmaster || v.staff_id === myStaffId) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full rounded-xl border-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all scale-95 hover:scale-100"
                            onClick={() => handleCancelVacation(v.id)}
                          >
                             Anular periodo
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral de Resumen (Derecha) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24">
            <Card className="card-modern border-none bg-indigo-600 text-white shadow-lg overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-20 w-20" />
              </div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  Estado Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-6 relative z-10">
                {selectedStaffStats ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-black">Colaborador</p>
                      <p className="text-2xl font-black">{selectedStaffStats.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                        <p className="text-[10px] text-indigo-100 uppercase font-bold mb-1">Días Usados</p>
                        <p className="text-3xl font-black">{selectedStaffStats.usedDays}</p>
                        <p className="text-[10px] text-indigo-200 mt-1 italic">Año {new Date().getFullYear()}</p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                        <p className="text-[10px] text-indigo-100 uppercase font-bold mb-1">Días Restantes</p>
                        <p className="text-3xl font-black">{Math.max(0, 22 - selectedStaffStats.usedDays)}</p>
                        <p className="text-[10px] text-indigo-200 mt-1 italic">Estimado (22)</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/20">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Sun className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] text-indigo-100 uppercase font-bold">Próximo descanso</p>
                          <p className="text-sm font-bold">{selectedStaffStats.nextVac}</p>
                        </div>
                      </div>
                      
                      {selectedStaffId === currentStaffId && (
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-indigo-100 uppercase font-bold">Próxima guardia</p>
                            <p className="text-sm font-bold">{selectedStaffStats.nextGuard}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-12 border-2 border-dashed border-white/20 rounded-2xl text-center">
                     <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                     <p className="text-sm text-indigo-100 italic px-4">Selecciona un trabajador en el formulario para analizar sus vacaciones.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert className="mt-8 border-indigo-100 bg-white shadow-sm rounded-2xl p-4">
              <AlertCircle className="h-4 w-4 text-indigo-600" />
              <div className="ml-2">
                <AlertTitle className="text-xs font-black uppercase text-indigo-700 tracking-tight">Recordatorio</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  El sistema bloquea automáticamente cualquier solicitud que solape con una guardia confirmada.
                </AlertDescription>
              </div>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}
