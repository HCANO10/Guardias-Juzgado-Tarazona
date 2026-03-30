"use client"

import { useState, useEffect } from "react"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { buildFullName } from "@/lib/staff/normalize"
import { GuardWeekView } from "@/types/guards"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DSButton, DSAlert } from "@/lib/design-system"
import { Bot, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface GuardAssignerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  week: GuardWeekView | null
  staffByCategory: StaffByCategory
  onSuccess: () => void
}

export function GuardAssigner({ open, onOpenChange, week, staffByCategory, onSuccess }: GuardAssignerProps) {
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState({
    auxilio: "",
    tramitador: "",
    gestor: ""
  })
  const [warnings, setWarnings] = useState<string[]>([])
  const { toast } = useToast()
  const supabase = createClient()

  // Initialize assignments when week changes
  useEffect(() => {
    if (week) {
      setAssignments({
        auxilio: week.auxilio?.id || "",
        tramitador: week.tramitador?.id || "",
        gestor: week.gestor?.id || ""
      })
      setWarnings([]) // reset warnings
    }
  }, [week])

  // Check for vacation conflicts whenever assignments change
  useEffect(() => {
    const checkVacations = async () => {
      if (!week) return

      const staffIds = [assignments.auxilio, assignments.tramitador, assignments.gestor].filter(id => id !== "")

      if (staffIds.length === 0) {
        setWarnings([])
        return
      }

      // Query vacations that overlap with the guard period
      const { data, error } = await supabase
        .from('vacations')
        .select(`
          staff_id, start_date, end_date,
          staff (first_name, last_name)
        `)
        .in('staff_id', staffIds)
        .eq('status', 'approved')
        .lte('start_date', week.end_date)
        .gte('end_date', week.start_date)

      if (error) {
        console.error("Error vacacionales:", error)
        return
      }

      const newWarnings: string[] = []
      if (data && data.length > 0) {
        data.forEach(v => {
          // Supabase returns staff as array for joined single-row relations
          const person = (v.staff as unknown) as { first_name: string; last_name: string } | null
          const startFormat = format(parseISO(v.start_date), 'dd/MM', { locale: es })
          const endFormat = format(parseISO(v.end_date), 'dd/MM', { locale: es })
          if (person) {
            newWarnings.push(`${buildFullName(person)} tiene vacaciones del ${startFormat} al ${endFormat}`)
          }
        })
      }

      setWarnings(newWarnings)
    }

    checkVacations()
  }, [assignments, week, supabase])

  const handleSave = async () => {
    if (!week) return
    setLoading(true)

    try {
      const response = await fetch('/api/guards/manual-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: week.period_id,
          assignments: {
            auxilio: assignments.auxilio || null,
            tramitador: assignments.tramitador || null,
            gestor: assignments.gestor || null
          }
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast({ title: result.message })
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al guardar", description: message })
    } finally {
      setLoading(false)
    }
  }

  if (!week) return null

  const startFormat = format(parseISO(week.start_date), "EEE dd/MM", { locale: es })
  const endFormat = format(parseISO(week.end_date), "EEE dd/MM", { locale: es })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-[28px] border-none shadow-2xl p-0 overflow-hidden">
        <div className="h-2 bg-[#0066CC] w-full" />
        <div className="p-5 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-bold text-neutral-900">Asignacion Manual - S.{week.week_number}</DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B]">
               {startFormat} → {endFormat}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Slot Auxilio */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Auxilio Judicial:</label>
              <Select value={assignments.auxilio || "none"} onValueChange={(val) => setAssignments({...assignments, auxilio: val === "none" ? "" : val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar —</SelectItem>
                  {staffByCategory.auxilio.map(person => (
                    <SelectItem key={person.id} value={person.id}>{buildFullName(person)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slot Tramitador */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Tramitador/a Procesal:</label>
              <Select value={assignments.tramitador || "none"} onValueChange={(val) => setAssignments({...assignments, tramitador: val === "none" ? "" : val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar —</SelectItem>
                  {staffByCategory.tramitador.map(person => (
                    <SelectItem key={person.id} value={person.id}>{buildFullName(person)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slot Gestor */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Gestor/a Procesal:</label>
              <Select value={assignments.gestor || "none"} onValueChange={(val) => setAssignments({...assignments, gestor: val === "none" ? "" : val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar —</SelectItem>
                  {staffByCategory.gestor.map(person => (
                    <SelectItem key={person.id} value={person.id}>{buildFullName(person)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warnings Vacaciones */}
            {warnings.length > 0 && (
              <DSAlert variant="warning" title="Posible Conflicto" icon={Bot}>
                <div className="text-xs space-y-1">
                  {warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              </DSAlert>
            )}

          </div>
          <DialogFooter>
            <DSButton variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </DSButton>
            <DSButton variant="primary" onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </DSButton>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
