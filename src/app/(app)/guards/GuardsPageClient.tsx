/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
import { GuardWeekView } from "@/types/guards"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { buildFullName } from "@/lib/staff/normalize"
import { useRole } from "@/hooks/use-role"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bot, Edit2, Scale } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { GuardAssigner } from "@/components/guards/GuardAssigner"
import { AIProposalReview } from "@/components/guards/AIProposalReview"
import { EmptyState } from "@/components/ui/empty-state"
import { Calendar as CalendarIcon, Search } from "lucide-react"
import { useRouter } from "next/navigation"

interface GuardsPageClientProps {
  initialGuards: GuardWeekView[]
  staffByCategory: StaffByCategory
  activeYear: number
}

export default function GuardsPageClient({ initialGuards, staffByCategory, activeYear }: GuardsPageClientProps) {
  const router = useRouter()
  const { isHeadmaster } = useRole()
  // Data states
  const [guards] = useState<GuardWeekView[]>(initialGuards)
  
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

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Gestión de Guardias</h1>
          <p className="text-muted-foreground">Planificación y seguimiento de turnos para el juzgado ({activeYear}).</p>
        </div>
        {isHeadmaster && (
          <Button onClick={() => setAiReviewOpen(true)} className="rounded-xl bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
            <Bot className="mr-2 h-4 w-4" /> Generar con IA
          </Button>
        )}
      </div>

      {/* Panel de Equidad - Rediseñado y más compacto */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
            <Scale className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-foreground">Equidad por categoría</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Auxilios', data: equidadAuxilio },
            { label: 'Tramitadores', data: equidadTramitador },
            { label: 'Gestores', data: equidadGestor }
          ].map((cat, idx) => (
            <Card key={idx} className={`card-modern border-none bg-white ${cat.data.hasDisparity ? "ring-2 ring-red-100" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{cat.label}</span>
                  {cat.data.hasDisparity && <Badge variant="destructive" className="h-4 text-[9px] uppercase px-1.5 border-none">Descompensado</Badge>}
                </div>
                <div className="space-y-2">
                  {cat.data.counts.map(p => (
                    <div key={p.id} className="flex justify-between items-center group">
                      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{p.first_name}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-accent rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${(p.numGuards / 15) * 100}%` }} 
                          />
                        </div>
                        <span className="text-xs font-bold w-4 text-right">{p.numGuards}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selectores y Listado */}
      <div className="space-y-6 pt-6 border-t border-border/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full md:w-[150px] rounded-xl bg-white border-border/50 shadow-sm">
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
              <SelectTrigger className="w-full md:w-[200px] rounded-xl bg-white border-border/50 shadow-sm">
                <SelectValue placeholder="Persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el personal</SelectItem>
                {allStaff.map(p => (
                  <SelectItem key={p.id} value={p.id}>{buildFullName(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px] rounded-xl bg-white border-border/50 shadow-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier estado</SelectItem>
                <SelectItem value="completa">Completa</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="vacia">Sin cubrir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle de Vista */}
          <div className="flex bg-accent/50 p-1 rounded-xl w-fit">
             <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 rounded-lg px-3 flex items-center gap-2"
                onClick={() => setViewMode('table')}
             >
               <Scale className="h-4 w-4" /> <span className="text-xs font-semibold">Tabla</span>
             </Button>
             <Button 
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-8 rounded-lg px-3 flex items-center gap-2"
                onClick={() => setViewMode('cards')}
             >
               <Bot className="h-4 w-4" /> <span className="text-xs font-semibold">Tarjetas</span>
             </Button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="rounded-2xl border border-border/50 bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-accent/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[60px] font-bold">Nº</TableHead>
                  <TableHead className="w-[200px] font-bold">Periodo</TableHead>
                  <TableHead className="font-bold">Personal asignado (Aux • Tra • Ges)</TableHead>
                  <TableHead className="w-[140px] font-bold">Estado</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20">
                      <EmptyState 
                        icon={guards.length === 0 ? CalendarIcon : Search}
                        title={guards.length === 0 ? "No hay periodos" : "Sin resultados"}
                        description="Intenta cambiar los filtros o genera nuevos periodos."
                        action={guards.length === 0 ? (
                          <Button onClick={() => router.push('/settings')} className="rounded-xl">Configurar</Button>
                        ) : (
                          <Button variant="outline" onClick={() => { setMonthFilter("all"); setPersonFilter("all"); setStatusFilter("all"); }} className="rounded-xl">Limpiar</Button>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuards.map((g) => {
                    const startFormat = format(new Date(g.start_date), "dd MMM", { locale: es })
                    const endFormat = format(new Date(g.end_date), "dd MMM", { locale: es })

                    return (
                      <TableRow key={g.period_id} className="h-16 hover:bg-accent/5 transition-colors border-border/50">
                        <TableCell className="text-muted-foreground font-mono">{g.week_number.toString().padStart(2, '0')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            {startFormat} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {endFormat}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={g.auxilio ? "font-medium" : "text-muted-foreground/50 italic"}>{g.auxilio ? g.auxilio.name : "Auxilio"}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className={g.tramitador ? "font-medium" : "text-muted-foreground/50 italic"}>{g.tramitador ? g.tramitador.name : "Tramitador"}</span>
                            <span className="text-muted-foreground/30">•</span>
                            <span className={g.gestor ? "font-medium" : "text-muted-foreground/50 italic"}>{g.gestor ? g.gestor.name : "Gestor"}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {g.coverage === 3 ? (
                             <Badge className="bg-green-50 text-green-700 border-none rounded-lg shadow-none font-medium px-2 py-0.5">Completa</Badge>
                          ) : g.coverage === 0 ? (
                             <Badge className="bg-red-50 text-red-700 border-none rounded-lg shadow-none font-medium px-2 py-0.5">Sin cubrir</Badge>
                          ) : (
                             <Badge className="bg-orange-50 text-orange-700 border-none rounded-lg shadow-none font-medium px-2 py-0.5">Parcial ({g.coverage}/3)</Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {isHeadmaster && (
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(g)} className="rounded-xl hover:bg-primary/5 hover:text-primary">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGuards.map((g) => (
              <Card key={g.period_id} className="card-modern hover:shadow-lg transition-all group border-none bg-white">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center text-muted-foreground font-mono font-bold">
                      {g.week_number}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {g.coverage === 3 ? (
                        <Badge className="bg-green-50 text-green-700 border-none rounded-lg font-medium">3/3 cubiertos</Badge>
                      ) : (
                        <Badge className={`${g.coverage === 0 ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"} border-none rounded-lg font-medium`}>
                          {g.coverage}/3 cubiertos
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Periodo</div>
                    <div className="font-bold flex items-center gap-2">
                       {format(new Date(g.start_date), "EEE d MMM", {locale: es})} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {format(new Date(g.end_date), "EEE d MMM", {locale: es})}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { role: 'Auxilio', person: g.auxilio },
                      { role: 'Tramitador/a', person: g.tramitador },
                      { role: 'Gestor/a', person: g.gestor }
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-border/30 last:border-0 border-dashed">
                        <span className="text-muted-foreground font-medium">{row.role}</span>
                        <span className={row.person ? "font-bold text-foreground" : "text-muted-foreground/40 italic"}>
                          {row.person ? row.person.name : "Por asignar"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {isHeadmaster && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4 rounded-xl border-indigo-100 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                      onClick={() => handleEditClick(g)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" /> Editar asignaciones
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
