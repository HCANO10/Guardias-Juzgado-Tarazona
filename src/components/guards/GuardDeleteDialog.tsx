"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DSButton, DSAlert, DSCard } from "@/lib/design-system"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GuardDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeYear: number
  onSuccess: () => void
}

type DeleteMode = "all" | "assignments_only"

export function GuardDeleteDialog({ open, onOpenChange, activeYear, onSuccess }: GuardDeleteDialogProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [mode, setMode] = useState<DeleteMode>("all")
  const [deleting, setDeleting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const { toast } = useToast()

  const dateError = startDate && endDate && startDate >= endDate
  const canDelete = !dateError && !deleting && confirmed

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/guards/delete-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: activeYear,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          deleteAssignmentsOnly: mode === "assignments_only",
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast({ title: "Borrado completado", description: result.message })
      onSuccess()
      onOpenChange(false)
      resetState()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al borrar", description: message })
    } finally {
      setDeleting(false)
    }
  }

  const resetState = () => {
    setStartDate("")
    setEndDate("")
    setMode("all")
    setConfirmed(false)
  }

  const handleClose = () => {
    if (deleting) return
    onOpenChange(false)
    setTimeout(resetState, 300)
  }

  const rangeLabel = startDate || endDate
    ? `del ${startDate || 'inicio'} al ${endDate || 'fin del año'}`
    : `de todo el año ${activeYear}`

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-2xl p-0 overflow-hidden">
        <div className="h-2 bg-red-500 w-full" />
        <div className="p-5 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-bold text-neutral-900 flex items-center">
              <Trash2 className="mr-2 h-6 w-6 text-red-500" />
              Borrar guardias
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B]">
              Elimina periodos y asignaciones para las fechas seleccionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Date range */}
            <DSCard hover={false} className="bg-gray-50">
              <div className="space-y-3">
                <div className="text-sm font-medium text-neutral-900">Rango de fechas</div>
                <p className="text-xs text-[#86868B]">
                  Si no seleccionas fechas, se borrara todo lo de {activeYear}.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="delStartDate" className="text-xs text-[#86868B]">Desde</Label>
                    <input
                      id="delStartDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="delEndDate" className="text-xs text-[#86868B]">Hasta</Label>
                    <input
                      id="delEndDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                {dateError && (
                  <p className="text-xs text-red-500 font-medium">La fecha de inicio debe ser anterior a la de fin.</p>
                )}
              </div>
            </DSCard>

            {/* Mode selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-900">¿Qué quieres borrar?</div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("all")}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    mode === "all"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      mode === "all" ? "border-red-500" : "border-gray-300"
                    }`}>
                      {mode === "all" && <div className="h-2 w-2 rounded-full bg-red-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">Borrar todo (periodos + asignaciones)</div>
                      <p className="text-xs text-[#86868B] mt-0.5">
                        Elimina las semanas y las personas asignadas. Empezar de cero.
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("assignments_only")}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    mode === "assignments_only"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      mode === "assignments_only" ? "border-red-500" : "border-gray-300"
                    }`}>
                      {mode === "assignments_only" && <div className="h-2 w-2 rounded-full bg-red-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">Solo borrar asignaciones</div>
                      <p className="text-xs text-[#86868B] mt-0.5">
                        Mantiene las semanas pero quita las personas. Ideal para reasignar.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Warning */}
            <DSAlert variant="danger" title="Accion irreversible" icon={AlertTriangle}>
              <span className="text-xs">
                {mode === "all"
                  ? `Se eliminaran todos los periodos y asignaciones ${rangeLabel}. Tendras que regenerar los periodos.`
                  : `Se eliminaran solo las asignaciones de personal ${rangeLabel}. Los periodos se conservan.`
                }
              </span>
            </DSAlert>

            {/* Confirmación explícita */}
            <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="h-4 w-4 accent-red-600 cursor-pointer"
              />
              <span className="text-[13px] font-semibold text-red-800">
                Entiendo que esta acción es irreversible y no podrá deshacerse
              </span>
            </label>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <DSButton variant="secondary" onClick={handleClose} disabled={deleting} className="w-full sm:w-auto">
              Cancelar
            </DSButton>
            <DSButton
              variant="primary"
              onClick={handleDelete}
              disabled={!canDelete}
              className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              {mode === "all" ? "Borrar todo" : "Borrar asignaciones"}
            </DSButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
