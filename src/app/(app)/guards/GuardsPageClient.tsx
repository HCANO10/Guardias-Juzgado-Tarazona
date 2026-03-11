"use client"

import { useState, useMemo } from "react"
import { GuardWeekView } from "@/types/guards"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bot, Edit2, Scale } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { GuardAssigner } from "@/components/guards/GuardAssigner"
import { AIProposalReview } from "@/components/guards/AIProposalReview"
import { useRouter } from "next/navigation"

interface GuardsPageClientProps {
  initialGuards: GuardWeekView[]
  staffByCategory: StaffByCategory
  activeYear: number
}

export default function GuardsPageClient({ initialGuards, staffByCategory, activeYear }: GuardsPageClientProps) {
  const router = useRouter()
  // Data states
  const [guards, setGuards] = useState<GuardWeekView[]>(initialGuards)
  
  // Filter states
  const [monthFilter, setMonthFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Modal state
  const [assignerOpen, setAssignerOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<GuardWeekView | null>(null)
  
  // AI Modal state
  const [aiReviewOpen, setAiReviewOpen] = useState(false)

  // Equidad calculation function
  const calculateEquidad = (categoryId: 'auxilio' | 'tramitador' | 'gestor') => {
    const staffInCat = staffByCategory[categoryId]
    const counts = staffInCat.map(person => {
      // Find how many guards this person has in the "guards" array
      const numGuards = guards.filter(g => g[categoryId]?.id === person.id).length
      return { ...person, numGuards }
    })
    
    // Check if difference > 2
    const maxGuards = counts.length ? Math.max(...counts.map(c => c.numGuards)) : 0
    const minGuards = counts.length ? Math.min(...counts.map(c => c.numGuards)) : 0
    const hasDisparity = (maxGuards - minGuards) > 2

    return { counts, hasDisparity }
  }

  const equidadAuxilio = useMemo(() => calculateEquidad('auxilio'), [guards, staffByCategory])
  const equidadTramitador = useMemo(() => calculateEquidad('tramitador'), [guards, staffByCategory])
  const equidadGestor = useMemo(() => calculateEquidad('gestor'), [guards, staffByCategory])

  // Flat list of all staff for filter
  const allStaff = [
    ...staffByCategory.auxilio,
    ...staffByCategory.tramitador,
    ...staffByCategory.gestor
  ]

  // Filter Guards Logic
  const filteredGuards = guards.filter(g => {
    // Month Filter
    if (monthFilter !== "all") {
      const monthStart = new Date(g.start_date).getMonth().toString()
      const monthEnd = new Date(g.end_date).getMonth().toString()
      if (monthStart !== monthFilter && monthEnd !== monthFilter) return false
    }

    // Person Filter
    if (personFilter !== "all") {
      const hasPerson = g.auxilio?.id === personFilter || 
                        g.tramitador?.id === personFilter || 
                        g.gestor?.id === personFilter
      if (!hasPerson) return false
    }

    // Status Filter
    if (statusFilter !== "all") {
      if (statusFilter === "completa" && g.coverage !== 3) return false
      if (statusFilter === "parcial" && (g.coverage === 0 || g.coverage === 3)) return false
      if (statusFilter === "vacia" && g.coverage !== 0) return false
    }

    return true
  })

  // Edit Action
  const handleEditClick = (week: GuardWeekView) => {
    setSelectedWeek(week)
    setAssignerOpen(true)
  }

  // Reload action (after save)
  const handleSuccessSave = () => {
    router.refresh()
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestión de Guardias {activeYear}</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setAiReviewOpen(true)} className="bg-primary shadow-sm hover:shadow-md transition-shadow">
            <Bot className="mr-2 h-4 w-4" /> Generar guardias con IA
          </Button>
        </div>
      </div>

      {/* Panel de Equidad */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center">
          <Scale className="mr-2 h-5 w-5 text-muted-foreground" />
          Equidad por categoría (Asignadas de {activeYear})
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Auxilios Card */}
          <Card className={equidadAuxilio.hasDisparity ? "border-red-500/50 shadow-sm shadow-red-500/20" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Auxilios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {equidadAuxilio.counts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.first_name}</span>
                    <span className="font-medium">{p.numGuards}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Tramitadores Card */}
          <Card className={equidadTramitador.hasDisparity ? "border-red-500/50 shadow-sm shadow-red-500/20" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tramitadores/as</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {equidadTramitador.counts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.first_name}</span>
                    <span className="font-medium">{p.numGuards}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gestoras Card */}
           <Card className={equidadGestor.hasDisparity ? "border-red-500/50 shadow-sm shadow-red-500/20" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gestoras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {equidadGestor.counts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.first_name}</span>
                    <span className="font-medium">{p.numGuards}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selectores y Tabla */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full md:w-[150px] bg-card">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {Array.from({length: 12}).map((_, i) => (
                <SelectItem key={i} value={i.toString()}>{format(new Date(2025, i, 1), 'MMMM', {locale: es})}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="w-full md:w-[220px] bg-card">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el personal</SelectItem>
              {allStaff.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-card">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier estado</SelectItem>
              <SelectItem value="completa">Completa (3/3)</SelectItem>
              <SelectItem value="parcial">Parcial (1/3 o 2/3)</SelectItem>
              <SelectItem value="vacia">Sin cubrir (0/3)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Nº</TableHead>
                <TableHead className="w-[180px]">Periodo</TableHead>
                <TableHead>Auxilio</TableHead>
                <TableHead>Tramitador/a</TableHead>
                <TableHead>Gestor/a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No se encontraron guardias o aún no se han generado para este año. Ve a Configuración para generar.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuards.map((g) => {
                  const startFormat = format(new Date(g.start_date), "EEE dd/MM", { locale: es })
                  const endFormat = format(new Date(g.end_date), "EEE dd/MM", { locale: es })

                  return (
                    <TableRow key={g.period_id}>
                      <TableCell className="font-medium text-muted-foreground">{g.week_number}</TableCell>
                      <TableCell className="font-medium">{startFormat} &rarr; {endFormat}</TableCell>
                      
                      <TableCell className={!g.auxilio ? "text-muted-foreground" : ""}>
                        {g.auxilio ? g.auxilio.name : "—"}
                      </TableCell>
                      
                      <TableCell className={!g.tramitador ? "text-muted-foreground" : ""}>
                        {g.tramitador ? g.tramitador.name : "—"}
                      </TableCell>
                      
                      <TableCell className={!g.gestor ? "text-muted-foreground" : ""}>
                        {g.gestor ? g.gestor.name : "—"}
                      </TableCell>

                      <TableCell>
                        {g.coverage === 3 ? (
                           <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400">Completa</Badge>
                        ) : g.coverage === 0 ? (
                           <Badge variant="destructive" className="bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400">Sin cubrir</Badge>
                        ) : (
                           <Badge className="bg-orange-500/15 text-orange-700 hover:bg-orange-500/25 dark:text-orange-400">Parcial ({g.coverage}/3)</Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(g)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <GuardAssigner 
        open={assignerOpen} 
        onOpenChange={setAssignerOpen} 
        week={selectedWeek} 
        staffByCategory={staffByCategory} 
        onSuccess={handleSuccessSave} 
      />

      <AIProposalReview
        open={aiReviewOpen}
        onOpenChange={setAiReviewOpen}
        activeYear={activeYear}
        onSuccess={handleSuccessSave}
        staffByCategory={staffByCategory}
        weeksCount={guards.length}
      />
    </div>
  )
}
