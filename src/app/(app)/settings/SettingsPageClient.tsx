"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Loader2,
  Settings2,
  CalendarDays,
  Activity,
  Database,
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Cpu
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  DSCard, 
  DSBadge, 
  DSPageHeader, 
  DSSectionHeading, 
  DSButton,
  DSIconBox
} from "@/lib/design-system"

interface AppSettings {
  active_year: number
  groq_model: string
}

interface GuardPeriod {
  id?: string
  week_number: number
  start_date: string
  end_date: string
}

interface SettingsPageClientProps {
  initialSettings: AppSettings | null
  initialPeriods: GuardPeriod[]
  systemStats: {
    staff: { total: number, aux: number, tra: number, ges: number }
    periods: number
    assignments: { complete: number, total: number }
    holidays: number
    vacations: number
  }
}

export default function SettingsPageClient({ initialSettings, initialPeriods, systemStats }: SettingsPageClientProps) {
  const { toast } = useToast()
  
  // Guard Generator States
  const [yearToGenerate, setYearToGenerate] = useState(new Date().getFullYear().toString())
  const [generating, setGenerating] = useState(false)
  const [periods, setPeriods] = useState<GuardPeriod[]>(initialPeriods)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, data: Record<string, unknown> | null }>({ open: false, data: null })

  // Settings Form States
  const [activeYear, setActiveYear] = useState(initialSettings?.active_year || 2026)
  const [groqModel, setGroqModel] = useState(initialSettings?.groq_model || "llama-3.3-70b-versatile")
  const [savingSettings, setSavingSettings] = useState(false)

  // Groq Test States
  const [testingGroq, setTestingGroq] = useState(false)
  const [groqStatus, setGroqStatus] = useState<{ connected: boolean, model?: string, error?: string } | null>(null)

  const handleGeneratePeriods = async (force: boolean = false) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/guards/generate-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(yearToGenerate), force })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al generar')

      if (data.exists && !force) {
        setConfirmDialog({ open: true, data })
      } else {
        toast({ title: "Periodos generados" })
        if (data.data) setPeriods(data.data)
        setConfirmDialog({ open: false, data: null })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_year: activeYear, groq_model: groqModel })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: "Configuración actualizada" })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleTestGroq = async () => {
    setTestingGroq(true)
    setGroqStatus(null)
    try {
      const res = await fetch('/api/groq/test', { method: 'POST' })
      const data = await res.json()
      setGroqStatus(data)
      if (data.connected) {
        toast({ title: "IA Conectada" })
      } else {
        toast({ variant: "destructive", title: "Error de conexión", description: data.error })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      setGroqStatus({ connected: false, error: message })
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setTestingGroq(false)
    }
  }

  const coveragePercent = Math.round((systemStats.assignments.complete / (systemStats.assignments.total || 1)) * 100)

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader 
          title="Configuración del Sistema" 
          subtitle="Panel de administración global: controla la IA, el calendario judicial y los parámetros de guardia."
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Main Settings Column */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* General Settings */}
          <DSCard className="p-8">
             <div className="flex items-center gap-3 mb-8">
                <DSIconBox icon={Settings2} variant="blue" />
                <div>
                   <h3 className="text-[18px] font-bold text-neutral-900">Parámetros Globales</h3>
                   <p className="text-[12px] text-[#86868B]">Define los valores base del funcionamiento del juzgado.</p>
                </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Año Activo del Sistema</label>
                   <Input 
                      type="number" 
                      value={activeYear}
                      onChange={(e) => setActiveYear(parseInt(e.target.value) || 2026)}
                      className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px] font-bold" 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Personas por Guardia</label>
                   <div className="h-11 rounded-[12px] bg-[#F2F2F7]/30 border border-dashed border-black/[0.08] flex items-center px-4 text-[14px] font-medium text-neutral-600">
                      3 Miembros (Aux + Tram + Gest)
                   </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                   <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Modelo Groq Cloud (IA)</label>
                   <Input 
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                      placeholder="llama-3.3-70b-versatile"
                      className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
                   />
                </div>
             </div>
             
             <div className="mt-10 pt-6 border-t border-black/[0.04] flex justify-end">
                <DSButton onClick={handleSaveSettings} disabled={savingSettings} className="h-11 px-8">
                   {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                   Guardar Configuración
                </DSButton>
             </div>
          </DSCard>

          {/* Calendar Generator */}
          <DSCard className="p-8">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <DSIconBox icon={CalendarDays} variant="indigo" />
                   <div>
                      <h3 className="text-[18px] font-bold text-neutral-900">Calendario Judicial</h3>
                      <p className="text-[12px] text-[#86868B]">Genera los periodos de guardia para el año seleccionado.</p>
                   </div>
                </div>
             </div>

             <div className="flex flex-col md:flex-row gap-4 mb-8">
                <Select value={yearToGenerate} onValueChange={setYearToGenerate}>
                   <SelectTrigger className="h-11 rounded-[12px] md:w-32 bg-[#F2F2F7]/50 border-black/[0.04] font-bold">
                      <SelectValue placeholder="Año" />
                   </SelectTrigger>
                   <SelectContent className="rounded-[16px]">
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                   </SelectContent>
                </Select>
                <DSButton 
                  variant="secondary" 
                  onClick={() => handleGeneratePeriods(false)} 
                  disabled={generating}
                  className="h-11 flex-1 bg-white border-black/[0.08] text-neutral-900"
                >
                   {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                   Sincronizar Periodos Anuales
                </DSButton>
             </div>

             {periods && periods.length > 0 && (
               <div className="rounded-[24px] border border-black/[0.04] overflow-hidden bg-white shadow-sm">
                  <div className="max-h-[320px] overflow-auto scrollbar-hide">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F2F2F7]/50 sticky top-0 z-10">
                           <tr className="border-b border-black/[0.04]">
                              <th className="px-6 py-3 text-[10px] font-black uppercase text-[#86868B]">Semana</th>
                              <th className="px-6 py-3 text-[10px] font-black uppercase text-[#86868B]">Inicio</th>
                              <th className="px-6 py-3 text-[10px] font-black uppercase text-[#86868B]">Fin</th>
                              <th className="px-6 py-3"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04]">
                           {periods.map((p) => (
                             <tr key={p.id || p.week_number} className="hover:bg-[#F2F2F7]/30 transition-colors">
                                <td className="px-6 py-3.5"><DSBadge variant="indigo">S{p.week_number}</DSBadge></td>
                                <td className="px-6 py-3.5 text-[14px] font-medium text-neutral-800">{format(parseISO(p.start_date), 'dd MMM yyyy', { locale: es })}</td>
                                <td className="px-6 py-3.5 text-[14px] font-medium text-neutral-800">{format(parseISO(p.end_date), 'dd MMM yyyy', { locale: es })}</td>
                                <td className="px-6 py-3.5 text-right"><ChevronRight className="h-4 w-4 text-black/10 inline-block" /></td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
             )}
          </DSCard>
        </div>

        {/* System Stats & Diagnostics Column */}
        <div className="lg:col-span-4 space-y-10">
           
           {/* System Health Card */}
           <DSCard dark hover={false} className="shadow-2xl relative overflow-hidden" padding="p-8">
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[11px] font-semibold">
                      Online
                    </span>
                 </div>

                 <div>
                    <h4 className="text-[20px] font-bold text-white mb-1">Estado del Sistema</h4>
                    <p className="text-white/40 text-[12px] font-medium">Monitor de recursos y conectividad.</p>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[11px] font-bold uppercase text-white/40 tracking-wider px-1">
                          <span>Cobertura de Guardias</span>
                          <span className="text-white/60">{coveragePercent}%</span>
                       </div>
                       <div className="w-full h-1.5 rounded-full bg-white/10">
                         <div
                           className="h-1.5 rounded-full bg-blue-500 transition-all"
                           style={{ width: `${coveragePercent}%` }}
                         />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-white/[0.06] p-4 rounded-2xl border border-white/[0.08]">
                          <Users className="h-4 w-4 text-blue-400 mb-2" />
                          <p className="text-[22px] font-bold text-white">{systemStats.staff.total}</p>
                          <p className="text-[10px] text-white/40 uppercase font-semibold mt-1">Personal</p>
                       </div>
                       <div className="bg-white/[0.06] p-4 rounded-2xl border border-white/[0.08]">
                          <Database className="h-4 w-4 text-indigo-400 mb-2" />
                          <p className="text-[22px] font-bold text-white">{systemStats.holidays}</p>
                          <p className="text-[10px] text-white/40 uppercase font-semibold mt-1">Festivos</p>
                       </div>
                    </div>
                 </div>

                 <button
                   onClick={handleTestGroq}
                   disabled={testingGroq}
                   className="w-full h-10 rounded-xl bg-white/10 border border-white/[0.12] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-white/[0.15] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    {testingGroq ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                    Test IA Diagnostics
                 </button>

                 {groqStatus && (
                   <div className={cn(
                      "p-4 rounded-xl text-[12px] flex items-start gap-3 transition-all",
                      groqStatus.connected
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                        : "bg-red-500/15 text-red-300 border border-red-500/20"
                   )}>
                      {groqStatus.connected ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                      <div className="space-y-1">
                         <p className="font-bold">{groqStatus.connected ? "Groq Conectado" : "Error de Conexión"}</p>
                         <p className="opacity-70 leading-tight">{groqStatus.connected ? groqStatus.model : groqStatus.error}</p>
                      </div>
                   </div>
                 )}
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
           </DSCard>

           {/* System Info Cards */}
           <div className="space-y-4">
              <DSSectionHeading className="px-2">Estructura Judicial</DSSectionHeading>
              <div className="bg-white rounded-[24px] p-6 border border-black/[0.04] space-y-4 shadow-sm">
                 <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#86868B] font-medium">Auxilio Judicial</span>
                    <DSBadge variant="blue">{systemStats.staff.aux}</DSBadge>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#86868B] font-medium">Tramitación</span>
                    <DSBadge variant="indigo">{systemStats.staff.tra}</DSBadge>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#86868B] font-medium">Gestión</span>
                    <DSBadge variant="purple">{systemStats.staff.ges}</DSBadge>
                 </div>
                 <div className="flex items-center justify-between pt-4 border-t border-black/[0.04]">
                    <span className="text-[14px] text-neutral-900 font-bold">Total Asignaturas</span>
                    <span className="text-[14px] font-black text-[#0066CC]">{systemStats.assignments.total}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open: boolean) => !open && setConfirmDialog({ open: false, data: null })}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-md">
           <div className="bg-red-50 p-8 border-b border-red-100 flex items-center gap-4">
              <DSIconBox icon={AlertTriangle} variant="red" className="bg-white" />
              <div>
                 <DialogTitle className="text-red-900 font-extrabold text-[22px]">Regeneración Crítica</DialogTitle>
                 <DialogDescription className="text-red-700 font-medium">Sobreescritura de calendario judicial detectada.</DialogDescription>
              </div>
           </div>
           
           <div className="p-8 space-y-6">
              <p className="text-[15px] text-neutral-600 leading-relaxed font-medium">
                 Ya existen periodos para el año <span className="font-black text-red-600">{yearToGenerate}</span>. Continuar borrará todas las asignaciones de guardia existentes permanentemente.
              </p>
              
              <div className="p-5 rounded-[20px] bg-red-100/50 border border-red-200">
                 <p className="text-[12px] font-bold text-red-900 leading-tight">
                    ESTA ACCIÓN NO SE PUEDE DESHACER. TODAS LAS GUARDIAS PROGRAMADAS SE PERDERÁN.
                 </p>
              </div>
           </div>

           <DialogFooter className="p-8 pt-0 gap-3">
              <DSButton variant="secondary" onClick={() => setConfirmDialog({ open: false, data: null })} className="flex-1 h-12">
                 Cancelar
              </DSButton>
              <DSButton variant="danger" onClick={() => handleGeneratePeriods(true)} className="flex-1 h-12">
                 Sobreescribir Todo
              </DSButton>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
