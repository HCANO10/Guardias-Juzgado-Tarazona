/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { GuardWeekView } from "@/types/guards"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, Loader2 } from "lucide-react"
import { format } from "date-fns"
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
        .eq('status', 'aprobado')
        .lte('start_date', week.end_date)
        .gte('end_date', week.start_date)

      if (error) {
        console.error("Error vacacionales:", error)
        return
      }

      const newWarnings: string[] = []
      if (data && data.length > 0) {
        data.forEach(v => {
          const person: any = v.staff
          const startFormat = format(new Date(v.start_date), 'dd/MM', { locale: es })
          const endFormat = format(new Date(v.end_date), 'dd/MM', { locale: es })
          newWarnings.push(`⚠️ ${person.first_name} ${person.last_name} tiene vacaciones del ${startFormat} al ${endFormat}`)
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
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!week) return null

  const startFormat = format(new Date(week.start_date), "EEE dd/MM", { locale: es })
  const endFormat = format(new Date(week.end_date), "EEE dd/MM", { locale: es })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignación Manual - S.{week.week_number}</DialogTitle>
          <DialogDescription>
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
                  <SelectItem key={person.id} value={person.id}>{person.first_name} {person.last_name}</SelectItem>
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
                  <SelectItem key={person.id} value={person.id}>{person.first_name} {person.last_name}</SelectItem>
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
                  <SelectItem key={person.id} value={person.id}>{person.first_name} {person.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warnings Vacaciones */}
          {warnings.length > 0 && (
            <Alert variant="destructive" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/50 dark:text-yellow-400 mt-2">
              <Bot className="h-4 w-4" />
              <AlertTitle>Posible Conflicto</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                {warnings.map((w, i) => <div key={i}>{w}</div>)}
              </AlertDescription>
            </Alert>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
