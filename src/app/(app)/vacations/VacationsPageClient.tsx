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
import { CalendarIcon, Loader2, AlertCircle, CheckCircle2, XCircle, Trash2, Search, Sun } from "lucide-react"
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

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Vacaciones</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulario Izquierda */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Solicitar Vacaciones</CardTitle>
              <CardDescription>Valida conflictos con tus guardias automáticamente antes de registrarte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trabajador</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={!isHeadmaster}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(isHeadmaster ? staff : staff.filter(s => s.id === currentStaffId)).map(s => (
                        <SelectItem key={s.id} value={s.id}>{buildFullName(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rango de fechas</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                              {format(dateRange.to, "dd/MM/yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Textarea 
                  placeholder="Ej: Viaje familiar, asuntos propios..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {conflictResult && !conflictResult.valid && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>No se pueden solicitar estas vacaciones</AlertTitle>
                  <AlertDescription className="space-y-2 pt-2">
                    {conflictResult.conflicts.map((c, i) => (
                      <div key={i} className="text-xs">
                        &bull; Tienes guardia la **semana {c.guard_week_number}**: 
                        viernes {format(new Date(c.guard_start_date), 'dd/MM')} &rarr; jueves {format(new Date(c.guard_end_date), 'dd/MM')}.
                      </div>
                    ))}
                    <p className="text-xs font-semibold mt-2">
                      Para solicitar estas fechas, primero reasigna tu guardia en la sección de "Guardias".
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleValidateAndSubmit} 
                disabled={isValidating || isSubmitting || !!(conflictResult && !conflictResult.valid)} 
                className="w-full"
              >
                {(isValidating || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar vacaciones
              </Button>
            </CardContent>
          </Card>

          {/* Listado de Vacaciones */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Histórico y Planificación</CardTitle>
                <CardDescription>Listado completo de vacaciones registradas en el sistema.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue placeholder="Trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier persona</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{buildFullName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier estado</SelectItem>
                    <SelectItem value="approved">Aprobadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVacations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12">
                          <EmptyState 
                            icon={vacations.length === 0 ? Sun : Search}
                            title={vacations.length === 0 ? "No hay vacaciones" : "Sin resultados"}
                            description={vacations.length === 0 
                              ? "Todavía no se han registrado vacaciones en el sistema. ¡Usa el formulario para empezar!"
                              : "No hay vacaciones que coincidan con los filtros actuales."
                            }
                            action={(staffFilter !== "all" || statusFilter !== "all") && (
                              <Button variant="outline" onClick={() => { setStaffFilter("all"); setStatusFilter("all"); }}>
                                Limpiar filtros
                              </Button>
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVacations.map((v) => {
                        const days = differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1
                        const staffMember = staff.find(s => s.id === v.staff_id)
                        const staffDispName = staffMember ? buildFullName(staffMember) : "???"
                        
                        return (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{staffDispName}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(v.start_date), 'dd/MM')} &rarr; {format(new Date(v.end_date), 'dd/MM')}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">{days}</TableCell>
                            <TableCell>
                              {v.status === 'approved' ? (
                                <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400">Aprobada</Badge>
                              ) : (
                                <Badge variant="secondary" className="opacity-60">Cancelada</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {v.status === 'approved' && (isHeadmaster || v.staff_id === myStaffId) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
            </CardContent>
          </Card>
        </div>

        {/* Resumen Derecha */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                Resumen de Disponibilidad
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {selectedStaffStats ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Trabajador</p>
                    <p className="text-lg font-bold">{selectedStaffStats.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Días usados ({new Date().getFullYear()})</p>
                      <p className="text-2xl font-black text-primary">{selectedStaffStats.usedDays}</p>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center">
                        <CalendarIcon className="mr-1 h-3 w-3" /> Próximas vacaciones
                      </p>
                      <p className="text-sm font-medium">{selectedStaffStats.nextVac}</p>
                    </div>
                    {selectedStaffId === currentStaffId && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center">
                          <AlertCircle className="mr-1 h-3 w-3" /> Próxima guardia
                        </p>
                        <p className="text-sm font-medium">{selectedStaffStats.nextGuard}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm italic">
                  Selecciona un trabajador para ver su resumen.
                </div>
              )}
            </CardContent>
          </Card>

          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-xs font-bold uppercase">Nota Importante</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Las vacaciones canceladas mantienen el registro pero no cuentan para el total de días consumidos.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
