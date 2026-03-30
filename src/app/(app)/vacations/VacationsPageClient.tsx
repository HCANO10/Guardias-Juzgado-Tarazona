"use client"

import React, { useState, useMemo, useRef } from "react"
import { buildFullName } from "@/lib/staff/normalize"
import { useRole } from "@/hooks/use-role"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { format, differenceInDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Search, 
  Sun, 
  ArrowRight, 
  Shield, 
  Users,
  Info
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { 
  DSCard, 
  DSBadge, 
  DSIconBox, 
  DSPageHeader, 
  DSSectionHeading, 
  DSButton 
} from "@/lib/design-system"

interface StaffMember {
  id: string
  first_name: string
  last_name: string
}

type VacationTipo = 'vacaciones' | 'asuntos_propios'

interface VacationRecord {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  status: string
  tipo: VacationTipo
  notes?: string
}

interface GuardPeriodInfo {
  week_number: number
  start_date: string
  end_date: string
}

interface ConflictInfo {
  guard_week_number: number
  guard_start_date: string
  guard_end_date: string
}

interface VacationsPageClientProps {
  staff: StaffMember[]
  vacations: VacationRecord[]
  currentStaffId: string | null
  nextGuard: GuardPeriodInfo | null
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
  const [tipo, setTipo] = useState<VacationTipo>("vacaciones")
  const [notes, setNotes] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictResult, setConflictResult] = useState<{ valid: boolean; conflicts: ConflictInfo[] } | null>(null)

  // Confirmation dialog for cancellation
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [calMonths, setCalMonths] = useState(1)
  React.useEffect(() => {
    const check = () => setCalMonths(window.innerWidth >= 640 ? 2 : 1)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const cancellingRef = useRef(false)

  // Filter states
  const [staffFilter, setStaffFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Resumen lateral
  const selectedStaffStats = useMemo(() => {
    if (!selectedStaffId) return null
    
    const staffMember = staff.find(s => s.id === selectedStaffId)
    const currentYear = new Date().getFullYear()
    
    const approvedVacations = vacations.filter(v =>
      v.staff_id === selectedStaffId &&
      v.status === 'approved' &&
      parseISO(v.start_date).getFullYear() === currentYear
    )

    const usedDays = approvedVacations.reduce((acc, v) => {
      const days = differenceInDays(parseISO(v.end_date), parseISO(v.start_date)) + 1
      return acc + days
    }, 0)

    const today = new Date()
    const nextVac = vacations
      .filter(v => v.staff_id === selectedStaffId && v.status === 'approved' && parseISO(v.start_date) >= today)
      .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())[0]

    return {
      name: staffMember ? buildFullName(staffMember) : "",
      usedDays,
      nextVac: nextVac ? `${format(parseISO(nextVac.start_date), 'dd/MM')} al ${format(parseISO(nextVac.end_date), 'dd/MM')}` : "Ninguna",
      nextGuard: selectedStaffId === currentStaffId && nextGuard
        ? `Semana ${nextGuard.week_number} (${format(parseISO(nextGuard.start_date), 'dd/MM', { locale: es })})`
        : "—"
    }
  }, [selectedStaffId, vacations, staff, currentStaffId, nextGuard])

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
    if (dateRange.to < dateRange.from) {
      toast({ variant: "destructive", title: "Fechas incorrectas", description: "La fecha de fin debe ser igual o posterior a la de inicio." })
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
          end_date: format(dateRange.to, 'yyyy-MM-dd'),
          tipo,
        })
      })

      const result = await resp.json()
      if (!resp.ok) throw new Error(result.error)

      if (!result.valid) {
        setConflictResult(result)
        toast({ variant: "destructive", title: "Conflicto detectado", description: "No puedes pedir estas fechas." })
      } else {
        handleSave()
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
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
          status: 'approved',
          tipo,
        })

      if (error) throw error

      toast({ title: "Vacaciones registradas", description: "Se han guardado correctamente." })
      setDateRange({ from: undefined, to: undefined })
      setNotes("")
      setTipo("vacaciones")
      setConflictResult(null)
      router.refresh()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmCancelVacation = async () => {
    if (!cancelConfirm.id || cancellingRef.current) return
    cancellingRef.current = true
    try {
      const { error } = await supabase
        .from('vacations')
        .update({ status: 'cancelled' })
        .eq('id', cancelConfirm.id)

      if (error) throw error
      toast({ title: "Vacaciones anuladas", description: "El periodo ha sido cancelado correctamente." })
      router.refresh()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      cancellingRef.current = false
      setCancelConfirm({ open: false, id: null })
    }
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader 
          title="Gestión de Vacaciones" 
          subtitle={`Solicita y gestiona tus periodos de descanso (${new Date().getFullYear()})`}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Form Card */}
          <DSCard className="overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <DSIconBox icon={Sun} variant="orange" />
              <div>
                <h3 className="text-[20px] font-semibold text-slate-900">Nueva Solicitud</h3>
                <p className="text-[13px] text-slate-500">Validación automática de conflictos con guardias.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Trabajador</label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={!isHeadmaster}>
                    <SelectTrigger className="rounded-[12px] h-11 bg-white border-slate-200 text-slate-700 text-[15px]">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-slate-100 shadow-xl">
                      {(isHeadmaster ? staff : staff.filter(s => s.id === currentStaffId)).map(s => (
                        <SelectItem key={s.id} value={s.id}>{buildFullName(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Rango de fechas</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center px-4 text-left h-11 rounded-[12px] bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-[15px]",
                          !dateRange.from && "text-slate-400"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <span className="font-medium text-slate-800">
                              {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-800">{format(dateRange.from, "dd/MM/yyyy")}</span>
                          )
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0 rounded-[24px] border-slate-200 shadow-2xl overflow-hidden" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => { setDateRange({ from: range?.from, to: range?.to }); setConflictResult(null); }}
                        numberOfMonths={calMonths}
                        locale={es}
                        className="p-4"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Selector de tipo */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Tipo de ausencia</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipo("vacaciones")}
                    className={cn(
                      "h-11 rounded-[12px] border text-[14px] font-semibold transition-all flex items-center justify-center gap-2",
                      tipo === "vacaciones"
                        ? "bg-[#0066CC] border-[#0066CC] text-white shadow-[0_0_20px_rgba(0,102,204,0.3)]"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    Vacaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("asuntos_propios")}
                    className={cn(
                      "h-11 rounded-[12px] border text-[14px] font-semibold transition-all flex items-center justify-center gap-2",
                      tipo === "asuntos_propios"
                        ? "bg-amber-500 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Asuntos Propios
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 px-1">
                  {tipo === "vacaciones"
                    ? "Vacaciones anuales retribuidas — 22 días hábiles/año"
                    : "Asuntos propios — 9 a 14 días según antigüedad (no acumulables a vacaciones)"}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Notas (opcional)</label>
                <Textarea
                  placeholder="Ej: Vacaciones de verano, semana de agosto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-[12px] bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white transition-all min-h-[80px] text-[15px] p-4 resize-none"
                />
              </div>

              {conflictResult && !conflictResult.valid && (
                <div className="bg-red-50 border border-red-200 rounded-[20px] p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                  <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                  <div>
                    <p className="text-[15px] font-bold text-red-700">Conflicto con Guardias</p>
                    <div className="text-[13px] text-red-600 mt-1 space-y-1">
                      {conflictResult.conflicts.map((c, i) => (
                        <p key={i}>
                          &bull; Tienes guardia la week {c.guard_week_number} ({format(parseISO(c.guard_start_date), 'dd/MM')} al {format(parseISO(c.guard_end_date), 'dd/MM')}).
                        </p>
                      ))}
                      <p className="font-bold text-red-700 mt-2">Reasigna tu guardia antes de pedir estas fechas.</p>
                    </div>
                  </div>
                </div>
              )}

              <DSButton 
                onClick={handleValidateAndSubmit} 
                className="w-full h-12"
                disabled={isValidating || isSubmitting || !!(conflictResult && !conflictResult.valid)}
              >
                {isValidating || isSubmitting ? (
                   <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                   <CheckCircle2 className="mr-2 h-5 w-5" />
                )}
                {isValidating ? "Validando..." : isSubmitting ? "Registrando..." : "Solicitar Vacaciones"}
              </DSButton>
            </div>
          </DSCard>

          {/* List Section */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1">
               <DSSectionHeading className="mb-0">Histórico y Planificación</DSSectionHeading>
               
               <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <Select value={staffFilter} onValueChange={setStaffFilter}>
                    <SelectTrigger className="w-full md:w-[150px] rounded-[12px] h-10 bg-white border-slate-200 text-slate-700 text-[13px]">
                      <SelectValue placeholder="Trabajador" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-slate-100 shadow-xl">
                      <SelectItem value="all">Todo el personal</SelectItem>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{buildFullName(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[140px] rounded-[12px] h-10 bg-white border-slate-200 text-slate-700 text-[13px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-slate-100 shadow-xl">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="approved">Aprobadas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredVacations.length === 0 ? (
                <div className="sm:col-span-2 py-10">
                  <EmptyState 
                    icon={vacations.length === 0 ? Sun : Search}
                    title={vacations.length === 0 ? "Sin histórico" : "Sin resultados"}
                    description="Aún no hay registros que coincidan con los filtros."
                  />
                </div>
              ) : (
                filteredVacations.map((v) => {
                  const daysNum = differenceInDays(parseISO(v.end_date), parseISO(v.start_date)) + 1
                  const staffMem = staff.find(s => s.id === v.staff_id)
                  const isCan = v.status === 'cancelled'
                  
                  return (
                    <DSCard key={v.id} className={cn("group transition-all", isCan && "opacity-60 grayscale-[0.3]")}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <p className="text-[15px] font-bold text-slate-900">{staffMem ? buildFullName(staffMem) : "???"}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[11px] font-bold px-2 py-0.5 rounded-full",
                              v.tipo === 'asuntos_propios'
                                ? "bg-amber-50 text-amber-700"
                                : "bg-indigo-50 text-indigo-700"
                            )}>
                              {v.tipo === 'asuntos_propios' ? 'Asuntos propios' : 'Vacaciones'}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-500 flex items-center gap-1.5">
                            <Info className="h-3 w-3" />
                            {v.notes || "Sin observaciones"}
                          </p>
                        </div>
                        <DSBadge variant={isCan ? "neutral" : "green"}>
                          {isCan ? "Cancelada" : "Aprobada"}
                        </DSBadge>
                      </div>

                      <div className="flex items-center justify-between py-3 border-y border-slate-200 border-dashed">
                         <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
                            <CalendarIcon className="h-4 w-4 text-indigo-500" />
                            {format(parseISO(v.start_date), 'd MMM')} &rarr; {format(parseISO(v.end_date), 'd MMM', {locale: es})}
                         </div>
                         <div className="text-[13px] font-bold bg-slate-100 text-slate-600 py-1 px-3 rounded-full">
                            {daysNum} días
                         </div>
                      </div>

                      {v.status === 'approved' && (isHeadmaster || v.staff_id === myStaffId) && (
                        <DSButton
                          variant="danger"
                          className="w-full mt-4 h-10 text-[13px]"
                          onClick={() => setCancelConfirm({ open: true, id: v.id })}
                        >
                           <Trash2 className="h-4 w-4 mr-2" /> Anular periodo
                        </DSButton>
                      )}
                    </DSCard>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="lg:sticky lg:top-12 space-y-8">
            <div className="rounded-[32px] p-5 md:p-8 text-white relative overflow-hidden group shadow-2xl" style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}>
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-10 group-hover:bg-white/20 transition-colors">
                  <Sun className="h-6 w-6 text-orange-400" />
                </div>
                
                {selectedStaffStats ? (
                  <div className="space-y-8">
                    <div>
                      <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-black mb-1">Colaborador</p>
                      <p className="text-[28px] font-bold tracking-tight">{selectedStaffStats.name}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="bg-white/5 p-4 md:p-5 rounded-[24px] border border-white/10">
                        <p className="text-[10px] md:text-[11px] text-white/40 uppercase font-bold mb-1">Días Usados</p>
                        <p className="text-[26px] md:text-[32px] font-bold">{selectedStaffStats.usedDays}</p>
                        <div className="mt-2 text-[10px] md:text-[11px] font-bold text-orange-400 uppercase tracking-tighter">Año {new Date().getFullYear()}</div>
                      </div>
                      <div className="bg-white/5 p-4 md:p-5 rounded-[24px] border border-white/10">
                        <p className="text-[10px] md:text-[11px] text-white/40 uppercase font-bold mb-1">Restantes</p>
                        <p className="text-[26px] md:text-[32px] font-bold text-[#34C759]">{Math.max(0, 22 - selectedStaffStats.usedDays)}</p>
                        <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-[#34C759]" 
                             style={{ width: `${Math.min((selectedStaffStats.usedDays / 22) * 100, 100)}%` }} 
                           />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 pt-6 border-t border-white/10">
                      <div className="flex items-center gap-4 group/item">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/item:bg-white/10 transition-colors">
                          <CheckCircle2 className="h-5 w-5 text-[#34C759]" />
                        </div>
                        <div>
                          <p className="text-[11px] text-white/40 uppercase font-bold">Próximo descanso</p>
                          <p className="text-[14px] font-semibold">{selectedStaffStats.nextVac}</p>
                        </div>
                      </div>
                      
                      {selectedStaffId === currentStaffId && (
                        <div className="flex items-center gap-4 group/item">
                          <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/item:bg-white/10 transition-colors">
                            <Shield className="h-5 w-5 text-[#0066CC]" />
                          </div>
                          <div>
                            <p className="text-[11px] text-white/40 uppercase font-bold">Próxima guardia</p>
                            <p className="text-[14px] font-semibold">{selectedStaffStats.nextGuard}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 border-2 border-dashed border-white/10 rounded-[28px] text-center px-6">
                     <DSIconBox icon={Users} variant="neutral" className="mx-auto mb-4 bg-white/5 text-white/30" />
                     <p className="text-[15px] text-white/40 leading-relaxed">Selecciona un trabajador en el formulario para analizar su disponibilidad.</p>
                  </div>
                )}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0066CC]/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
            </div>

            <div className="rounded-[28px] p-6 border border-indigo-100 bg-indigo-50 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-indigo-900 tracking-tight uppercase">Política de Calendario</p>
                <p className="text-[13px] text-indigo-700 mt-1 leading-relaxed">
                  Las solicitudes de vacaciones están sujetas a la cobertura mínima del juzgado y no pueden solapar con periodos de guardia asignados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={cancelConfirm.open} onOpenChange={(open) => !open && setCancelConfirm({ open: false, id: null })}>
        <AlertDialogContent className="rounded-[20px] max-w-sm bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900">
              ¿Anular este periodo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-slate-500">
              El periodo de vacaciones quedará marcado como cancelado y ya no se mostrará como vigente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl h-10 text-[14px] bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelVacation}
              className="rounded-xl h-10 text-[14px] bg-red-500 hover:bg-red-600 text-white border-none"
            >
              Sí, anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
