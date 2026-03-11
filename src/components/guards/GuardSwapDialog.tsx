/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeftRight, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface GuardSwapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: string
  weekNumber: number
  currentStaffId: string
  currentStaffName: string
  role: "auxilio" | "tramitador" | "gestor"
  sameRoleStaff: { id: string; first_name: string; last_name: string }[]
  availablePeriods: { id: string; week_number: number; start_date: string; end_date: string }[]
}

export function GuardSwapDialog({
  open, onOpenChange, periodId, weekNumber, currentStaffId, currentStaffName,
  role, sameRoleStaff, availablePeriods
}: GuardSwapDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [selectedPeriodId, setSelectedPeriodId] = useState("")
  const [loading, setLoading] = useState(false)

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
      toast({ title: "✅ Intercambio realizado correctamente", description: data.message })
      onOpenChange(false)
      router.refresh()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error en el intercambio", description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Intercambiar guardia
          </DialogTitle>
          <DialogDescription>
            Intercambiar guardia de <strong>{currentStaffName}</strong> en la semana {weekNumber}.
            Solo se puede intercambiar con personas del mismo rol ({role}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-700 dark:text-yellow-300">
              Verifica que ninguna de las dos personas tenga vacaciones en la semana de la otra antes de proceder.
            </AlertDescription>
          </Alert>

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
              <Select onValueChange={setSelectedPeriodId} value={selectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la semana" />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      Sem. {p.week_number} ({p.start_date} → {p.end_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSwap} disabled={loading || !selectedStaffId || !selectedPeriodId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar intercambio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
