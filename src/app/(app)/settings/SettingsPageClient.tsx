"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Parámetros de configuración */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5" /> Parámetros Generales</CardTitle>
            <CardDescription>Variables de entorno e IA de la aplicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Personas por guardia</Label>
              <Input value="3 (1 auxilio + 1 tramitador + 1 gestor)" readOnly disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Modelo de Groq (IA)</Label>
              <Input 
                value={groqModel} 
                onChange={(e) => setGroqModel(e.target.value)} 
                placeholder="Ej. llama-3.3-70b-versatile"
              />
            </div>
            <div className="space-y-2">
              <Label>Año activo (por defecto)</Label>
              <Input 
                type="number" 
                value={activeYear} 
                onChange={(e) => setActiveYear(parseInt(e.target.value) || 2026)} 
              />
            </div>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full mt-4">
              {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Generar Periodos */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5" /> Calendario de Guardias</CardTitle>
            <CardDescription>Generador de periodos anuales automáticos (viernes → jueves)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1 space-y-2">
                <Select value={yearToGenerate} onValueChange={setYearToGenerate}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Año a generar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2028">2028</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => handleGeneratePeriods(false)} disabled={generating}>
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar periodos
                </Button>
              </div>
            </div>

            {/* Resumen de periodos */}
            {periods && periods.length > 0 && (
              <div className="mt-6 border rounded-md max-h-64 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                      <TableHead>Semana</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((p) => (
                      <TableRow key={p.id || p.week_number}>
                        <TableCell>S. {p.week_number}</TableCell>
                        <TableCell>{format(new Date(p.start_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell>{format(new Date(p.end_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Groq AI Diagnostics */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center text-sm font-bold uppercase tracking-wider">
              <BrainCircuit className="mr-2 h-4 w-4" /> Diagnóstico Groq IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              La API KEY debe estar configurada en las variables de entorno del servidor. 
              Usa este botón para verificar que el sistema puede comunicarse con Groq.
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleTestGroq} 
              disabled={testingGroq}
            >
              {testingGroq ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
              Probar conexión
            </Button>
            
            {groqStatus && (
              <div className={cn(
                "p-3 rounded-lg border text-xs",
                groqStatus.connected ? "bg-green-500/10 border-green-500/20 text-green-700" : "bg-destructive/10 border-destructive/20 text-destructive"
              )}>
                {groqStatus.connected ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-bold flex items-center">✅ Conectado</span>
                    <span className="opacity-70">Modelo: {groqStatus.model}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">❌ Error</span>
                    <span className="opacity-70">{groqStatus.error}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Information */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-md md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-sm font-bold uppercase tracking-wider">
              <Info className="mr-2 h-4 w-4" /> Información del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">Personal Activo</span>
                <div className="text-lg font-bold">{systemStats.staff.total}</div>
                <p className="text-[10px] opacity-60">
                  {systemStats.staff.aux}A / {systemStats.staff.tra}T / {systemStats.staff.ges}G
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">Periodos {activeYear}</span>
                <div className="text-lg font-bold">{systemStats.periods}</div>
                <p className="text-[10px] opacity-60">Semanas generadas</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">Guardias Cubiertas</span>
                <div className="text-lg font-bold">{systemStats.assignments.complete}/{systemStats.assignments.total}</div>
                <Progress value={(systemStats.assignments.complete / systemStats.assignments.total) * 100} className="h-1 mt-1" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">Base de Datos</span>
                <div className="text-lg font-bold">Ok</div>
                <p className="text-[10px] opacity-60">
                  {systemStats.holidays} Festivos / {systemStats.vacations} Vacas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Confirmation */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, data: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aviso de regeneración</DialogTitle>
            <DialogDescription>
              {confirmDialog.data?.message} <br/><br/>
              <strong>¡Peligro!</strong> Si decides continuar, se borrarán todos los periodos actuales y perderás permanentemente cualquier guardia o persona asignada a esos periodos de {yearToGenerate}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, data: null })} disabled={generating}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => handleGeneratePeriods(true)} disabled={generating}>
              {generating ? "Regenerando..." : "Sí, continuar y sobreescribir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
