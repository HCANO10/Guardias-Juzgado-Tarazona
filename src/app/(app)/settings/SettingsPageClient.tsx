/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Settings2, CalendarDays, BrainCircuit, Activity, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface SettingsPageClientProps {
  initialSettings: any
  initialPeriods: any[]
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
  const [periods, setPeriods] = useState<any[]>(initialPeriods)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, data: any }>({ open: false, data: null })

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
        toast({ title: "Éxito", description: data.message })
        if (data.data) {
          setPeriods(data.data)
        }
        setConfirmDialog({ open: false, data: null })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
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
      toast({ title: "Configuración guardada" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
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
        toast({ title: "Groq conectado", description: `Modelo: ${data.model}` })
      } else {
        toast({ variant: "destructive", title: "Error de conexión", description: data.error })
      }
    } catch (error: any) {
      setGroqStatus({ connected: false, error: error.message })
      toast({ variant: "destructive", title: "Error", description: "No se pudo contactar con el endpoint de test." })
    } finally {
      setTestingGroq(false)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Configuración del Sistema</h1>
        <p className="text-muted-foreground">Administra los parámetros globales, la IA de Groq y la generación de periodos.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Parámetros de configuración */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl font-bold text-foreground">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mr-3">
                <Settings2 className="h-5 w-5" />
              </div>
              Parámetros Generales
            </CardTitle>
            <CardDescription>Configuración base del sistema y modelo de IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Personas por guardia</Label>
              <div className="px-3 py-2 rounded-xl bg-accent/30 text-sm font-medium border border-border/50 text-foreground/80">
                3 (1 Auxilio + 1 Tramitador + 1 Gestor)
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Modelo de Groq (IA)</Label>
              <Input 
                value={groqModel} 
                onChange={(e) => setGroqModel(e.target.value)} 
                placeholder="Ej. llama-3.3-70b-versatile"
                className="rounded-xl border-border/50 h-11 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Año activo (por defecto)</Label>
              <Input 
                type="number" 
                value={activeYear} 
                onChange={(e) => setActiveYear(parseInt(e.target.value) || 2026)} 
                className="rounded-xl border-border/50 h-11 focus-visible:ring-primary/20"
              />
            </div>
            <Button 
              onClick={handleSaveSettings} 
              disabled={savingSettings} 
              className="w-full h-11 rounded-xl bg-primary shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all mt-2"
            >
              {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Generar Periodos */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl font-bold text-foreground">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
                <CalendarDays className="h-5 w-5" />
              </div>
              Calendario de Guardias
            </CardTitle>
            <CardDescription>Generador de periodos anuales automáticos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={yearToGenerate} onValueChange={setYearToGenerate}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 rounded-xl border-border/50">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                  <SelectItem value="2028">2028</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => handleGeneratePeriods(false)} 
                disabled={generating}
                variant="secondary"
                className="flex-1 h-11 rounded-xl hover:scale-[1.01] transition-all"
              >
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar periodos anuales
              </Button>
            </div>

            {/* Resumen de periodos */}
            {periods && periods.length > 0 && (
              <div className="mt-4 rounded-xl border border-border/50 overflow-hidden bg-accent/10">
                <div className="max-h-56 overflow-auto scrollbar-hide">
                  <Table>
                    <TableHeader className="bg-accent/50 sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent h-10 border-border/20">
                        <TableHead className="text-[10px] font-bold uppercase px-4 h-10 text-muted-foreground">Semana</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase px-4 h-10 text-muted-foreground">Inicio</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase px-4 h-10 text-muted-foreground">Fin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((p) => (
                        <TableRow key={p.id || p.week_number} className="h-10 border-border/20 hover:bg-white/50 transition-colors">
                          <TableCell className="px-4 py-2 font-bold text-xs">Sem. {p.week_number}</TableCell>
                          <TableCell className="px-4 py-2 text-xs">{format(new Date(p.start_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                          <TableCell className="px-4 py-2 text-xs">{format(new Date(p.end_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Groq AI Diagnostics */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
              <BrainCircuit className="mr-2 h-3.5 w-3.5 text-primary" /> IA Diagnostics (Groq)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-accent/30 border border-border/50">
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                Verifica la conexión con el servidor de IA para la generación automática de guardias.
              </p>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full h-10 rounded-xl border-border/50 hover:bg-accent/50 transition-colors shadow-sm"
              onClick={handleTestGroq} 
              disabled={testingGroq}
            >
              {testingGroq ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> : <Activity className="mr-2 h-4 w-4 text-primary" />}
              <span className="font-bold text-xs uppercase tracking-wider">Probar conexión</span>
            </Button>
            
            {groqStatus && (
              <div className={cn(
                "p-4 rounded-2xl border transition-all animate-in fade-in zoom-in duration-300",
                groqStatus.connected 
                  ? "bg-green-50 border-green-200 text-green-800" 
                  : "bg-red-50 border-red-200 text-red-800"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shadow-sm",
                    groqStatus.connected ? "bg-white" : "bg-white"
                  )}>
                    {groqStatus.connected ? "✅" : "❌"}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-black text-[10px] uppercase tracking-wider">
                      {groqStatus.connected ? "Sistema Operativo" : "Conexión Fallida"}
                    </span>
                    <span className="text-[11px] font-medium opacity-80 leading-tight">
                      {groqStatus.connected ? `Modelo: ${groqStatus.model}` : groqStatus.error}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="card-modern border-none bg-white p-2 md:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">
              <Info className="mr-2 h-4 w-4 text-indigo-500" /> Estadísticas del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 rounded-2xl bg-accent/30 border border-border/50 transition-all hover:shadow-md group">
                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Personal Activo</span>
                <div className="text-2xl font-black text-foreground mt-1 group-hover:text-primary transition-colors">{systemStats.staff.total}</div>
                <div className="flex gap-1.5 mt-2">
                  <Badge className="h-4 text-[9px] px-1 bg-white text-primary border-none font-bold">{systemStats.staff.aux}A</Badge>
                  <Badge className="h-4 text-[9px] px-1 bg-white text-primary border-none font-bold">{systemStats.staff.tra}T</Badge>
                  <Badge className="h-4 text-[9px] px-1 bg-white text-primary border-none font-bold">{systemStats.staff.ges}G</Badge>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-accent/30 border border-border/50 transition-all hover:shadow-md group">
                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Periodos {activeYear}</span>
                <div className="text-2xl font-black text-foreground mt-1 group-hover:text-indigo-600 transition-colors">{systemStats.periods}</div>
                <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase opacity-60">Semanas Ok</p>
              </div>

              <div className="p-4 rounded-2xl bg-accent/30 border border-border/50 transition-all hover:shadow-md group">
                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Cobertura</span>
                <div className="flex items-end gap-2 mt-1">
                  <div className="text-2xl font-black text-foreground group-hover:text-green-600 transition-colors">
                    {Math.round((systemStats.assignments.complete / systemStats.assignments.total) * 100)}%
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold mb-1 opacity-60">Goal</span>
                </div>
                <Progress value={(systemStats.assignments.complete / systemStats.assignments.total) * 100} className="h-1.5 mt-3 bg-white" />
              </div>

              <div className="p-4 rounded-2xl bg-accent/30 border border-border/50 transition-all hover:shadow-md group">
                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Base de Datos</span>
                <div className="text-2xl font-black text-foreground mt-1 group-hover:text-blue-600 transition-colors">Estado: Ok</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{systemStats.holidays} Festivos</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">{systemStats.vacations} Vacas.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Confirmation */}
      <Dialog open={confirmDialog.open} onOpenChange={(open: boolean) => !open && setConfirmDialog({ open: false, data: null })}>
        <DialogContent className="rounded-2xl border-none shadow-2xl p-0 overflow-hidden max-w-md">
          <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-red-600 shadow-sm">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-red-900 font-black tracking-tight">Regeneración Crítica</DialogTitle>
              <DialogDescription className="text-red-700/80 font-medium text-xs">Aviso importante de sobreescritura</DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-foreground/80 leading-relaxed">
              {confirmDialog.data?.message}
            </p>
            <div className="p-4 rounded-xl bg-red-100/50 border border-red-200">
              <p className="text-xs text-red-900 font-bold leading-tight">
                ⚠️ ¡Peligro! Se borrarán todos los periodos actuales y perderás permanentemente cualquier guardia asignada a {yearToGenerate}.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                variant="destructive" 
                onClick={() => handleGeneratePeriods(true)} 
                disabled={generating}
                className="h-11 rounded-xl font-bold shadow-lg shadow-red-200"
              >
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sí, continuar y sobreescribir
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setConfirmDialog({ open: false, data: null })} 
                disabled={generating}
                className="h-11 rounded-xl text-muted-foreground font-bold"
              >
                Cancelar operación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
