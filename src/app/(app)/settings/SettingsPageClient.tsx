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
import { Loader2, Settings2, CalendarDays } from "lucide-react"

interface SettingsPageClientProps {
  initialSettings: any
  initialPeriods: any[]
}

export default function SettingsPageClient({ initialSettings, initialPeriods }: SettingsPageClientProps) {
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
