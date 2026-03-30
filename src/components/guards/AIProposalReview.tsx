"use client"

import { useState } from "react"
import { buildFullName } from "@/lib/staff/normalize"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DSButton, DSAlert, DSCard } from "@/lib/design-system"
import { Bot, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react"

interface AIAssignment {
  guard_period_id: string
  week_number: number
  auxilio_staff_id: string
  tramitador_staff_id: string
  gestor_staff_id: string
}

interface AIProposalStatistics {
  auxilio_distribution?: Record<string, number>
  tramitador_distribution?: Record<string, number>
  gestor_distribution?: Record<string, number>
  [key: string]: Record<string, number> | undefined
}

interface AIProposal {
  assignments: AIAssignment[]
  statistics?: AIProposalStatistics
}

interface AIValidation {
  errors: string[]
  warnings: string[]
}

interface AIProposalReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeYear: number
  onSuccess: () => void
  staffByCategory: StaffByCategory
  weeksCount: number
}

export function AIProposalReview({ open, onOpenChange, activeYear, onSuccess, staffByCategory, weeksCount }: AIProposalReviewProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [respectExisting, setRespectExisting] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [proposal, setProposal] = useState<AIProposal | null>(null)
  const [validation, setValidation] = useState<AIValidation | null>(null)
  const { toast } = useToast()

  // Staff Counters for Step 1
  const auxCount = staffByCategory?.auxilio?.length || 0
  const traCount = staffByCategory?.tramitador?.length || 0
  const gesCount = staffByCategory?.gestor?.length || 0

  const handleGenerate = async () => {
    setStep(2)
    setProcessing(true)
    try {
      // Timeout de 110 segundos en el cliente (ligeramente inferior al servidor)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 110_000)

      let res: Response
      try {
        res = await fetch('/api/groq/generate-guards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: activeYear,
            respectExisting,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          }),
          signal: controller.signal,
        })
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('La IA no respondio a tiempo. Comprueba tu clave GROQ_API_KEY e intentalo de nuevo.')
        }
        throw err
      } finally {
        clearTimeout(timeoutId)
      }

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setProposal(result.proposal)
      setValidation(result.validation)
      setStep(3)

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error de IA", description: message })
      setStep(1)
    } finally {
      setProcessing(false)
    }
  }

  const handleApply = async () => {
    if (!proposal?.assignments || proposal.assignments.length === 0) return
    setSaving(true)

    try {
      const res = await fetch('/api/groq/apply-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: proposal.assignments,
          respectExisting,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al aplicar propuesta')

      toast({ title: "Guardias AI aplicadas", description: `Se han configurado ${proposal.assignments.length} semanas con exito.` })
      onSuccess()
      onOpenChange(false)
      // Reset state on close
      setTimeout(() => { setStep(1); setProposal(null); setValidation(null) }, 500)

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al guardar", description: message })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (processing || saving) return
    onOpenChange(false)
    if (step === 3) {
       // Resetear tras ver resultados y descartar
       setTimeout(() => { setStep(1); setProposal(null); setValidation(null) }, 300)
    }
  }

  // Helpers UI Step 3
  const getStaffNameById = (id: string, cat: string) => {
     if (!staffByCategory) return "Desconocido"
     const lst = staffByCategory[cat as keyof typeof staffByCategory]
     const p = lst?.find((x: { id: string; first_name: string; last_name: string }) => x.id === id)
     return p ? buildFullName(p) : id
  }

  return (
    <Dialog open={open} onOpenChange={(val: boolean) => !val && handleClose()}>
      <DialogContent className={step === 3
        ? "max-w-[95vw] sm:max-w-[900px] h-[85vh] flex flex-col rounded-[28px] border-none shadow-2xl p-0 overflow-hidden"
        : "max-w-[95vw] sm:max-w-[480px] rounded-[28px] border-none shadow-2xl p-0 overflow-hidden"
      }>
        <div className="h-2 bg-[#0066CC] w-full" />
        <div className={step === 3 ? "p-5 sm:p-8 flex flex-col flex-1 overflow-hidden" : "p-5 sm:p-8"}>

          <DialogHeader>
            <DialogTitle className="text-[22px] font-bold text-neutral-900 flex items-center">
              <Bot className="mr-2 h-6 w-6 text-[#0066CC]" />
              {step === 3 ? "Propuesta de la IA" : "Generador Automatico de Guardias"}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B]">
              {step === 1 && `Planifica automaticamente las guardias${startDate || endDate ? ` del rango seleccionado` : ` de ${activeYear}`} respetando descansos, vacaciones y equidad.`}
              {step === 2 && "Solicitando distribucion a Groq..."}
              {step === 3 && "Revisa la distribucion antes de aplicarla. Es coherente?"}
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: CONFIGURATION */}
          {step === 1 && (
            <div className="py-4 space-y-4">
               <DSCard hover={false}>
                 <div className="space-y-2 text-sm text-gray-500">
                   <div className="flex justify-between">
                     <span>Personal activo:</span>
                     <span className="font-medium text-gray-900">{auxCount} auxilios, {traCount} tramitadores, {gesCount} gestoras</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Semanas requeridas:</span>
                     <span className="font-medium text-gray-900">{weeksCount} semanas ({activeYear})</span>
                   </div>
                 </div>
               </DSCard>

               {/* Rango de fechas opcional */}
               <DSCard hover={false} className="bg-[#F2F2F7]/50">
                 <div className="space-y-3">
                   <div className="text-sm font-medium text-neutral-900">Rango de fechas (opcional)</div>
                   <p className="text-xs text-[#86868B]">
                     Si no seleccionas fechas, se generaran guardias para todo el año. Si indicas un rango, solo se asignaran las semanas dentro de ese periodo.
                   </p>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="flex flex-col gap-1">
                       <Label htmlFor="startDate" className="text-xs text-[#86868B]">Desde</Label>
                       <input
                         id="startDate"
                         type="date"
                         value={startDate}
                         onChange={(e) => setStartDate(e.target.value)}
                         className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30"
                       />
                     </div>
                     <div className="flex flex-col gap-1">
                       <Label htmlFor="endDate" className="text-xs text-[#86868B]">Hasta</Label>
                       <input
                         id="endDate"
                         type="date"
                         value={endDate}
                         onChange={(e) => setEndDate(e.target.value)}
                         className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30"
                       />
                     </div>
                   </div>
                   {startDate && endDate && startDate >= endDate && (
                     <p className="text-xs text-red-500 font-medium">La fecha de inicio debe ser anterior a la de fin.</p>
                   )}
                 </div>
               </DSCard>

               <div className="flex items-start space-x-2 pt-2">
                 <Checkbox id="respect" checked={respectExisting} onCheckedChange={(val) => setRespectExisting(!!val)} />
                 <div className="grid gap-1.5 leading-none">
                   <Label htmlFor="respect" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                     Respetar guardias ya asignadas
                   </Label>
                    <p className="text-sm text-gray-500">
                      Si marcas esto, la IA completara los &apos;huecos&apos; pero no modificara las asignaciones manuales previas.
                    </p>
                 </div>
               </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 2 && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
               <Loader2 className="h-12 w-12 animate-spin text-[#0066CC]" />
               <div className="space-y-1">
                  <h3 className="font-medium text-lg">La IA esta calculando la distribucion...</h3>
                  <p className="text-sm text-gray-500">Analizando cuadrantes de {weeksCount} semanas. Esto puede tardar entre 15 y 30 segundos.</p>
               </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {step === 3 && proposal && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden py-2">

               {/* Errors and Warnings */}
               {(validation?.errors?.length ?? 0) > 0 && (
                  <DSAlert variant="danger" title="Errores de validacion - No aplicar!" icon={ShieldAlert}>
                    La IA ha devuelto datos invalidos o ha cruzado vacaciones.
                    <ul className="list-disc ml-4 mt-2 text-xs">
                      {validation!.errors!.map((e:string, i:number) => <li key={i}>{e}</li>)}
                    </ul>
                  </DSAlert>
               )}

               {(validation?.warnings?.length ?? 0) > 0 && (validation?.errors?.length ?? 0) === 0 && (
                  <DSAlert variant="warning" title="Avisos de equidad o consecutividad" icon={AlertTriangle}>
                    <ul className="list-disc ml-4 mt-2 text-xs">
                      {validation!.warnings!.map((w:string, i:number) => <li key={i}>{w}</li>)}
                    </ul>
                  </DSAlert>
               )}

               {!validation?.errors?.length && !validation?.warnings?.length && (
                  <DSAlert variant="success" title="Propuesta optima" icon={CheckCircle2}>
                    <span className="text-xs">No se detectan conflictos vacacionales y la equidad parece balanceada entre roles.</span>
                  </DSAlert>
               )}

               {/* Distribution Stats */}
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                 {['auxilio_distribution', 'tramitador_distribution', 'gestor_distribution'].map((key) => {
                   const dist = proposal.statistics?.[key] || {}
                   const label = key.split('_')[0].toUpperCase()
                   return (
                     <DSCard key={key} className="bg-gray-50/50" padding="p-3" hover={false}>
                       <div className="text-xs space-y-1">
                          <div className="font-semibold text-gray-500 mb-1">{label}</div>
                          {Object.entries(dist).map(([name, count]) => (
                             <div key={name} className="flex justify-between">
                               <span>{name}</span>
                               <span className="font-medium">{count as React.ReactNode}</span>
                             </div>
                          ))}
                       </div>
                     </DSCard>
                   )
                 })}
               </div>

               {/* Table Preview */}
               <div className="flex-1 border border-gray-200/60 rounded-xl overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1">
                    <Table>
                      <TableHeader className="bg-white sticky top-0">
                        <TableRow>
                          <TableHead className="w-[50px]">Sem</TableHead>
                          <TableHead>Auxilio</TableHead>
                          <TableHead>Tramitador</TableHead>
                          <TableHead>Gestor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposal.assignments?.map((a: AIAssignment) => (
                           <TableRow key={a.guard_period_id} className="bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-900/10 dark:hover:bg-blue-900/20">
                             <TableCell className="font-medium text-xs">{a.week_number}</TableCell>
                             <TableCell className="text-sm">{getStaffNameById(a.auxilio_staff_id, 'auxilio')}</TableCell>
                             <TableCell className="text-sm">{getStaffNameById(a.tramitador_staff_id, 'tramitador')}</TableCell>
                             <TableCell className="text-sm">{getStaffNameById(a.gestor_staff_id, 'gestor')}</TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
               </div>
            </div>
          )}

          <DialogFooter className={`flex-col-reverse sm:flex-row gap-2 ${step === 3 ? "mt-4" : ""}`}>
            {step === 1 && (
               <>
                 <DSButton variant="secondary" onClick={handleClose} className="w-full sm:w-auto">Cancelar</DSButton>
                 <DSButton variant="primary" onClick={handleGenerate} disabled={!!(startDate && endDate && startDate >= endDate)} className="w-full sm:w-auto"><Bot className="mr-2 h-4 w-4"/> Generar propuesta</DSButton>
               </>
            )}
            {step === 3 && (
               <>
                 <DSButton variant="secondary" onClick={handleClose} disabled={saving} className="w-full sm:w-auto">Descartar</DSButton>
                 <DSButton variant="primary" onClick={handleApply} disabled={saving || (validation?.errors?.length ?? 0) > 0} className="w-full sm:w-auto">
                   {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Aplicar propuesta
                 </DSButton>
               </>
            )}
          </DialogFooter>

        </div>
      </DialogContent>
    </Dialog>
  )
}
