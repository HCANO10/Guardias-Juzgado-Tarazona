/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { fullName } from "@/lib/utils/full-name"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bot, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AIProposalReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeYear: number
  onSuccess: () => void
  staffByCategory: any
  weeksCount: number
}

export function AIProposalReview({ open, onOpenChange, activeYear, onSuccess, staffByCategory, weeksCount }: AIProposalReviewProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [respectExisting, setRespectExisting] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [proposal, setProposal] = useState<any>(null)
  const [validation, setValidation] = useState<any>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Staff Counters for Step 1
  const auxCount = staffByCategory?.auxilio?.length || 0
  const traCount = staffByCategory?.tramitador?.length || 0
  const gesCount = staffByCategory?.gestor?.length || 0

  const handleGenerate = async () => {
    setStep(2)
    setProcessing(true)
    try {
      const res = await fetch('/api/groq/generate-guards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: activeYear, respectExisting })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setProposal(result.proposal)
      setValidation(result.validation)
      setStep(3)

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error de IA", description: error.message })
      setStep(1)
    } finally {
      setProcessing(false)
    }
  }

  const handleApply = async () => {
    if (!proposal?.assignments || proposal.assignments.length === 0) return
    setSaving(true)

    try {
      const inserts: any[] = []
      
      proposal.assignments.forEach((a: any) => {
        if (a.auxilio_staff_id) inserts.push({ guard_period_id: a.guard_period_id, staff_id: a.auxilio_staff_id, assigned_by: 'ai' })
        if (a.tramitador_staff_id) inserts.push({ guard_period_id: a.guard_period_id, staff_id: a.tramitador_staff_id, assigned_by: 'ai' })
        if (a.gestor_staff_id) inserts.push({ guard_period_id: a.guard_period_id, staff_id: a.gestor_staff_id, assigned_by: 'ai' })
      })

      // Clean existing AI allocations or everything depending on respectExisting
      if (respectExisting) {
         // Borramos solo si es de la IA (para que lo reescriba) - opcional.
         // Lo más seguro es borrar la AI de este año y meter inserts.
      } else {
         // Si NO respeta existentes, idealmente habria q borrar todas manual y IA de ese año.
         // Lo resuelve el Delete the same periods first.
      }
      
      // Batch Delete
      const periodIds = Array.from(new Set(proposal.assignments.map((a:any) => a.guard_period_id)))
      
      let q = supabase.from('guard_assignments').delete().in('guard_period_id', periodIds)
      if (respectExisting) {
         q = q.eq('assigned_by', 'ai') // si respeta, solo pisa lo de la IA anterior
      }

      const { error: delErr } = await q
      if (delErr) throw delErr

      // Batch Insert
      const { error: insErr } = await supabase.from('guard_assignments').insert(inserts)
      if (insErr) throw insErr

      toast({ title: "Guardias AI aplicadas", description: `Se han configurado ${proposal.assignments.length} semanas con éxito.` })
      onSuccess()
      onOpenChange(false)
      // Reset state on close
      setTimeout(() => { setStep(1); setProposal(null); setValidation(null) }, 500)

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: error.message })
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
     const p = lst?.find((x:any) => x.id === id)
     return p ? fullName(p) : id
  }

  return (
    <Dialog open={open} onOpenChange={(val: boolean) => !val && handleClose()}>
      <DialogContent className={step === 3 ? "sm:max-w-[900px] h-[85vh] flex flex-col" : "sm:max-w-[450px]"}>
        
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Bot className="mr-2 h-6 w-6 text-primary" /> 
            {step === 3 ? "Propuesta de la IA" : "Generador Automático de Guardias"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && `Planifica automáticamente las guardias de ${activeYear} respetando descansos, vacaciones y equidad.`}
            {step === 2 && "Solicitando distribución a Groq..."}
            {step === 3 && "Revisa la distribución antes de aplicarla. ¿Es coherente?"}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: CONFIGURATION */}
        {step === 1 && (
          <div className="py-4 space-y-4">
             <Card>
               <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
                 <div className="flex justify-between">
                   <span>Personal activo:</span>
                   <span className="font-medium text-foreground">{auxCount} auxilios, {traCount} tramitadores, {gesCount} gestoras</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Semanas requeridas:</span>
                   <span className="font-medium text-foreground">{weeksCount} semanas ({activeYear})</span>
                 </div>
               </CardContent>
             </Card>

             <div className="flex items-start space-x-2 pt-2">
               <Checkbox id="respect" checked={respectExisting} onCheckedChange={(val) => setRespectExisting(!!val)} />
               <div className="grid gap-1.5 leading-none">
                 <Label htmlFor="respect" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                   Respetar guardias ya asignadas
                 </Label>
                  <p className="text-sm text-muted-foreground">
                    Si marcas esto, la IA completará los &apos;huecos&apos; pero no modificará las asignaciones manuales previas.
                  </p>
               </div>
             </div>
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === 2 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <div className="space-y-1">
                <h3 className="font-medium text-lg">La IA está calculando la distribución...</h3>
                <p className="text-sm text-muted-foreground">Analizando cuadrantes de {weeksCount} semanas. Esto puede tardar entre 15 y 30 segundos.</p>
             </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 3 && proposal && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden py-2">
             
             {/* Errors and Warnings */}
             {validation?.errors?.length > 0 && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Errores de validación - ¡No aplicar!</AlertTitle>
                  <AlertDescription>
                    La IA ha devuelto datos inválidos o ha cruzado vacaciones.
                    <ul className="list-disc ml-4 mt-2 text-xs">
                      {validation.errors.map((e:string, i:number) => <li key={i}>{e}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
             )}

             {validation?.warnings?.length > 0 && validation.errors.length === 0 && (
                <Alert className="bg-yellow-500/10 text-yellow-600 border-yellow-500/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Avisos de equidad o consecutividad</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ml-4 mt-2 text-xs">
                      {validation.warnings.map((w:string, i:number) => <li key={i}>{w}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
             )}

             {!validation?.errors?.length && !validation?.warnings?.length && (
                <Alert className="bg-green-500/10 text-green-600 border-green-500/50">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Propuesta óptima</AlertTitle>
                  <AlertDescription className="text-xs">No se detectan conflictos vacacionales y la equidad parece balanceada entre roles.</AlertDescription>
                </Alert>
             )}

             {/* Distribution Stats */}
             <div className="grid grid-cols-3 gap-2">
               {['auxilio_distribution', 'tramitador_distribution', 'gestor_distribution'].map((key) => {
                 const dist = proposal.statistics?.[key] || {}
                 const label = key.split('_')[0].toUpperCase()
                 return (
                   <Card key={key} className="bg-muted/30">
                     <CardContent className="p-3 text-xs space-y-1">
                        <div className="font-semibold text-muted-foreground mb-1">{label}</div>
                        {Object.entries(dist).map(([name, count]) => (
                           <div key={name} className="flex justify-between">
                             <span>{name}</span>
                             <span className="font-medium">{count as React.ReactNode}</span>
                           </div>
                        ))}
                     </CardContent>
                   </Card>
                 )
               })}
             </div>

             {/* Table Preview */}
             <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader className="bg-card sticky top-0">
                      <TableRow>
                        <TableHead className="w-[50px]">Sem</TableHead>
                        <TableHead>Auxilio</TableHead>
                        <TableHead>Tramitador</TableHead>
                        <TableHead>Gestor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposal.assignments?.map((a: any) => (
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

        <DialogFooter className={step === 3 ? "mt-4" : ""}>
          {step === 1 && (
             <>
               <Button variant="outline" onClick={handleClose}>Cancelar</Button>
               <Button onClick={handleGenerate}><Bot className="mr-2 h-4 w-4"/> Generar propuesta</Button>
             </>
          )}
          {step === 3 && (
             <>
               <Button variant="outline" onClick={handleClose} disabled={saving}>❌ Descartar</Button>
               <Button onClick={handleApply} disabled={saving || (validation?.errors?.length > 0)}>
                 {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 ✅ Aplicar propuesta
               </Button>
             </>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
