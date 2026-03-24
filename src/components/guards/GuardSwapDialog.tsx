"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DSButton, DSAlert } from "@/lib/design-system"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeftRight, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
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
  open, onOpenChange, periodId, weekNumber, currentStaffId, currentStaffName,
  role, sameRoleStaff
}: GuardSwapDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [selectedPeriodId, setSelectedPeriodId] = useState("")
  const [availablePeriods, setAvailablePeriods] = useState<{ id: string; week_number: number; start_date: string; end_date: string }[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(false)
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
      const { data } = await supabase
        .from('guard_assignments')
        .select('guard_period_id, guard_periods(id, week_number, start_date, end_date)')
        .eq('staff_id', selectedStaffId)
        .neq('guard_period_id', periodId)
        .order('guard_period_id', { ascending: true })

      const periods = (data || [])
        .filter((a) => a.guard_periods)
        .map((a) => {
          // Supabase nested join returns object for single-row relations
          const gp = a.guard_periods as unknown as { id: string; week_number: number; start_date: string; end_date: string }
          return {
            id: gp.id,
            week_number: gp.week_number,
            start_date: gp.start_date,
            end_date: gp.end_date,
          }
        })

      setAvailablePeriods(periods)
      setLoadingPeriods(false)
    }

    fetchPeriods()
  }, [selectedStaffId, periodId])

  const handleSwap = async () => {
    if (!selectedStaffId || !selectedPeriodId) {
      toast({ variant: "destructive", title: "Selecciona la persona y semana para el intercambio" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/guards/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId1: periodId,
          staffId1: currentStaffId,
          periodId2: selectedPeriodId,
          staffId2: selectedStaffId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Intercambio realizado correctamente", description: data.message })
      onOpenChange(false)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error en el intercambio", description: message })
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
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-[28px] border-none shadow-2xl p-0 overflow-hidden">
        <div className="h-2 bg-[#0066CC] w-full" />
        <div className="p-8">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-bold text-neutral-900 flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-[#0066CC]" />
              Intercambiar guardia
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B]">
              Intercambiar guardia de <strong>{currentStaffName}</strong> en la semana {weekNumber}.
              Solo se puede intercambiar con personas del mismo rol ({role}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <DSAlert variant="warning" icon={AlertTriangle}>
              <span className="text-xs">Verifica que ninguna de las dos personas tenga vacaciones en la semana de la otra antes de proceder.</span>
            </DSAlert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Intercambiar con:</label>
              <Select onValueChange={setSelectedStaffId} value={selectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una persona" />
                </SelectTrigger>
                <SelectContent>
                  {sameRoleStaff.filter(s => s.id !== currentStaffId).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStaffId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Semana a intercambiar (de la otra persona):</label>
                {loadingPeriods ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando guardias...
                  </div>
                ) : availablePeriods.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-2">Esta persona no tiene guardias asignadas para intercambiar.</p>
                ) : (
                  <Select onValueChange={setSelectedPeriodId} value={selectedPeriodId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la semana" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePeriods.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          Sem. {p.week_number} ({format(parseISO(p.start_date), 'dd/MM', { locale: es })} → {format(parseISO(p.end_date), 'dd/MM', { locale: es })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <DSButton variant="secondary" onClick={handleClose} disabled={loading}>Cancelar</DSButton>
              <DSButton variant="primary" onClick={handleSwap} disabled={loading || !selectedStaffId || !selectedPeriodId || loadingPeriods}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar intercambio
              </DSButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
