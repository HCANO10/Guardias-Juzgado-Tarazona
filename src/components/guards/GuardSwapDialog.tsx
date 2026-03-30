"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DSButton } from "@/lib/design-system"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeftRight, Loader2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface GuardSwapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: string
  weekNumber: number
  currentStaffId: string
  currentStaffName: string
  role: "auxilio" | "tramitador" | "gestor"
  sameRoleStaff: { id: string; first_name: string; last_name: string }[]
}

export function GuardSwapDialog({
  open,
  onOpenChange,
  periodId,
  weekNumber,
  currentStaffId,
  currentStaffName,
  role,
  sameRoleStaff,
}: GuardSwapDialogProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [selectedPeriodId, setSelectedPeriodId] = useState("")
  const [availablePeriods, setAvailablePeriods] = useState<
    { id: string; week_number: number; start_date: string; end_date: string }[]
  >([])
  const [loadingPeriods, setLoadingPeriods] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedStaffId) {
      setAvailablePeriods([])
      setSelectedPeriodId("")
      return
    }

    const fetchPeriods = async () => {
      setLoadingPeriods(true)
      setSelectedPeriodId("")
      const today = new Date().toISOString().split("T")[0]

      const { data } = await supabase
        .from("guard_assignments")
        .select("guard_period_id, guard_periods(id, week_number, start_date, end_date)")
        .eq("staff_id", selectedStaffId)
        .neq("guard_period_id", periodId)
        .order("guard_period_id", { ascending: true })

      const periods = (data || [])
        .filter((a) => a.guard_periods)
        .map((a) => {
          const gp = a.guard_periods as unknown as {
            id: string
            week_number: number
            start_date: string
            end_date: string
          }
          return gp
        })
        // Only show future guards (can't swap a past guard)
        .filter((p) => p.start_date >= today)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))

      setAvailablePeriods(periods)
      setLoadingPeriods(false)
    }

    fetchPeriods()
  }, [selectedStaffId, periodId])

  const handleSendRequest = async () => {
    if (!selectedStaffId || !selectedPeriodId) {
      toast({
        variant: "destructive",
        title: "Selecciona la persona y semana para el intercambio",
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/guards/swap-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodIdRequester: periodId,
          staffIdRequested: selectedStaffId,
          periodIdRequested: selectedPeriodId,
          message: message.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({
        title: "Solicitud enviada",
        description: data.message,
      })
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    onOpenChange(false)
    setTimeout(() => {
      setSelectedStaffId("")
      setSelectedPeriodId("")
      setAvailablePeriods([])
      setMessage("")
    }, 200)
  }

  const selectedStaff = sameRoleStaff.find((s) => s.id === selectedStaffId)
  const selectedPeriod = availablePeriods.find((p) => p.id === selectedPeriodId)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-[28px] border-none shadow-2xl p-0 overflow-hidden">
        <div className="h-2 bg-[#0066CC] w-full" />
        <div className="p-5 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-bold text-neutral-900 flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-[#0066CC]" />
              Solicitar intercambio de guardia
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B]">
              Solicita a un compañero intercambiar tu guardia de la semana{" "}
              <strong>{weekNumber}</strong>.{" "}
              Solo puedes intercambiar con personas del mismo puesto ({role}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Summary of your guard */}
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-[16px] border border-indigo-100">
              <div className="h-10 w-10 rounded-[12px] bg-indigo-600 flex items-center justify-center text-white text-[13px] font-black">
                {weekNumber}
              </div>
              <div>
                <p className="text-[12px] font-bold text-indigo-700 uppercase tracking-wide">
                  Tu guardia
                </p>
                <p className="text-[14px] font-semibold text-slate-900">
                  {currentStaffName} · Semana {weekNumber}
                </p>
              </div>
            </div>

            {/* Select colleague */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">
                Intercambiar con
              </label>
              <Select onValueChange={setSelectedStaffId} value={selectedStaffId}>
                <SelectTrigger className="h-11 rounded-[12px]">
                  <SelectValue placeholder="Selecciona un compañero/a" />
                </SelectTrigger>
                <SelectContent className="rounded-[16px]">
                  {sameRoleStaff
                    .filter((s) => s.id !== currentStaffId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select their guard week */}
            {selectedStaffId && (
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">
                  Su semana que quieres
                </label>
                {loadingPeriods ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                    guardias...
                  </div>
                ) : availablePeriods.length === 0 ? (
                  <p className="text-[14px] text-slate-500 italic py-2">
                    {selectedStaff?.first_name} no tiene guardias futuras disponibles para intercambiar.
                  </p>
                ) : (
                  <Select
                    onValueChange={setSelectedPeriodId}
                    value={selectedPeriodId}
                  >
                    <SelectTrigger className="h-11 rounded-[12px]">
                      <SelectValue placeholder="Selecciona la semana" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px]">
                      {availablePeriods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          Sem. {p.week_number} (
                          {format(parseISO(p.start_date), "dd/MM", { locale: es })} →{" "}
                          {format(parseISO(p.end_date), "dd/MM", { locale: es })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Visual swap summary */}
            {selectedPeriod && selectedStaff && (
              <div className="flex flex-row items-center gap-2 p-3 bg-slate-50 rounded-[16px] border border-slate-200 text-[12px]">
                <div className="flex-1 text-center min-w-0">
                  <p className="font-bold text-indigo-700">Tú cedes</p>
                  <p className="text-slate-800 font-semibold">Sem. {weekNumber}</p>
                </div>
                <ArrowLeftRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="flex-1 text-center min-w-0">
                  <p className="font-bold text-emerald-700 truncate">
                    {selectedStaff.first_name} cede
                  </p>
                  <p className="text-slate-800 font-semibold">
                    Sem. {selectedPeriod.week_number}
                  </p>
                </div>
              </div>
            )}

            {/* Optional message */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">
                Mensaje (opcional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej: Tengo una cita médica esa semana..."
                maxLength={300}
                rows={2}
                className="rounded-[12px] resize-none text-[14px] border-slate-200"
              />
            </div>

            {/* Info note */}
            <p className="text-[12px] text-slate-500 bg-slate-50 p-3 rounded-[12px] border border-slate-200">
              Se enviará un aviso por email al compañero/a para que lo acepte o rechace. El intercambio solo se ejecutará si lo acepta.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <DSButton
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
                className="sm:w-auto w-full"
              >
                Cancelar
              </DSButton>
              <DSButton
                variant="primary"
                onClick={handleSendRequest}
                disabled={
                  loading ||
                  !selectedStaffId ||
                  !selectedPeriodId ||
                  loadingPeriods
                }
                className="sm:w-auto w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Enviar solicitud
              </DSButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
