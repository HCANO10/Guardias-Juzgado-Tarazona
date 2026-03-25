"use client"

import { useState, useMemo } from "react"
import { GuardWeekView } from "@/types/guards"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { buildFullName } from "@/lib/staff/normalize"
import { useRole } from "@/hooks/use-role"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Edit2, Calendar as CalendarIcon, Search, ArrowRight, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { GuardAssigner } from "@/components/guards/GuardAssigner"
import { AIProposalReview } from "@/components/guards/AIProposalReview"
import { GuardDeleteDialog } from "@/components/guards/GuardDeleteDialog"
import { EmptyState } from "@/components/ui/empty-state"
import { useRouter } from "next/navigation"
import { 
  DSCard, 
  DSBadge, 
  DSIconBox, 
  DSPageHeader, 
  DSSectionHeading, 
  DSButton,
  getPositionBadgeVariant 
} from "@/lib/design-system"

interface GuardsPageClientProps {
  initialGuards: GuardWeekView[]
  staffByCategory: StaffByCategory
  activeYear: number
}

export default function GuardsPageClient({ initialGuards, staffByCategory, activeYear }: GuardsPageClientProps) {
  const router = useRouter()
  const { isHeadmaster } = useRole()
  const [guards] = useState<GuardWeekView[]>(initialGuards)
  
  const [monthFilter, setMonthFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
  const [assignerOpen, setAssignerOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<GuardWeekView | null>(null)
  const [aiReviewOpen, setAiReviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const calculateEquidad = (categoryId: 'auxilio' | 'tramitador' | 'gestor') => {
    const staffInCat = staffByCategory[categoryId]
    const counts = staffInCat.map(person => {
      const numGuards = guards.filter(g => g[categoryId]?.id === person.id).length
      return { ...person, numGuards }
    })
    
    const maxGuards = counts.length ? Math.max(...counts.map(c => c.numGuards)) : 0
    const minGuards = counts.length ? Math.min(...counts.map(c => c.numGuards)) : 0
    const hasDisparity = (maxGuards - minGuards) > 2

    return { counts, hasDisparity }
  }

  const equidadAuxilio = useMemo(() => calculateEquidad('auxilio'), [guards, staffByCategory])
  const equidadTramitador = useMemo(() => calculateEquidad('tramitador'), [guards, staffByCategory])
  const equidadGestor = useMemo(() => calculateEquidad('gestor'), [guards, staffByCategory])

  const allStaff = [
    ...staffByCategory.auxilio,
    ...staffByCategory.tramitador,
    ...staffByCategory.gestor
  ]

  const filteredGuards = guards.filter(g => {
    if (monthFilter !== "all") {
      const monthStart = parseISO(g.start_date).getMonth().toString()
      const monthEnd = parseISO(g.end_date).getMonth().toString()
      if (monthStart !== monthFilter && monthEnd !== monthFilter) return false
    }
    if (personFilter !== "all") {
      const hasPerson = g.auxilio?.id === personFilter || 
                        g.tramitador?.id === personFilter || 
                        g.gestor?.id === personFilter
      if (!hasPerson) return false
    }
    if (statusFilter !== "all") {
      if (statusFilter === "completa" && g.coverage !== 3) return false
      if (statusFilter === "parcial" && (g.coverage === 0 || g.coverage === 3)) return false
      if (statusFilter === "vacia" && g.coverage !== 0) return false
    }
    return true
  })

  const handleEditClick = (week: GuardWeekView) => {
    setSelectedWeek(week)
    setAssignerOpen(true)
  }

  const handleSuccessSave = () => {
    router.refresh()
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader 
          title="Gestión de Guardias" 
          subtitle={`Planificación y seguimiento de turnos para el juzgado (${activeYear})`}
        />
        {isHeadmaster && (
          <div className="flex items-center gap-3">
            <DSButton variant="secondary" onClick={() => setDeleteOpen(true)} className="flex items-center gap-2 text-red-500 hover:text-red-600 border-red-200 hover:border-red-300">
              <Trash2 className="h-4 w-4" /> Borrar guardias
            </DSButton>
            <DSButton onClick={() => setAiReviewOpen(true)} className="flex items-center gap-2">
              <Bot className="h-4 w-4" /> Generar con IA
            </DSButton>
          </div>
        )}
      </div>

      {/* Equidad Section */}
      <div className="space-y-4">
        <DSSectionHeading>Equidad por categoría</DSSectionHeading>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { label: 'Auxilios', data: equidadAuxilio, variant: 'amber' as const },
            { label: 'Tramitadores', data: equidadTramitador, variant: 'blue' as const },
            { label: 'Gestores', data: equidadGestor, variant: 'green' as const }
          ].map((cat, idx) => (
            <DSCard key={idx} className={cat.data.hasDisparity ? "ring-1 ring-red-500/30" : ""}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{cat.label}</span>
                {cat.data.hasDisparity && <DSBadge variant="red">Descompensado</DSBadge>}
              </div>
              <div className="space-y-3">
                {cat.data.counts.map(p => (
                  <div key={p.id} className="flex justify-between items-center group">
                    <span className="text-[14px] text-slate-900 font-medium">{p.first_name}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                             cat.variant === 'amber' ? 'bg-amber-500' :
                             cat.variant === 'blue' ? 'bg-[#0066CC]' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((p.numGuards / 15) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-bold text-slate-900 w-4 text-right">{p.numGuards}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DSCard>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full md:w-[150px] rounded-[12px] h-11 bg-white border-slate-200 text-slate-700 text-[14px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-slate-200 shadow-2xl">
              <SelectItem value="all">Todos los meses</SelectItem>
              {Array.from({length: 12}).map((_, i) => (
                <SelectItem key={i} value={i.toString()}>{format(new Date(2025, i, 1), 'MMMM', {locale: es})}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="w-full md:w-[200px] rounded-[12px] h-11 bg-white border-slate-200 text-slate-700 text-[14px]">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-slate-200 shadow-2xl">
              <SelectItem value="all">Todo el personal</SelectItem>
              {allStaff.map(p => (
                <SelectItem key={p.id} value={p.id}>{buildFullName(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px] rounded-[12px] h-11 bg-white border-slate-200 text-slate-700 text-[14px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-slate-200 shadow-2xl">
              <SelectItem value="all">Cualquier estado</SelectItem>
              <SelectItem value="completa">Completa</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="vacia">Sin cubrir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List / Table Area */}
      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-[28px] overflow-hidden border border-slate-100 backdrop-blur-xl bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 w-[80px]">Nº</th>
                <th className="px-6 py-4">Periodo</th>
                <th className="px-6 py-4">Personal asignado</th>
                <th className="px-6 py-4 w-[160px]">Estado</th>
                {isHeadmaster && <th className="px-6 py-4 w-[80px]"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuards.length === 0 ? (
                <tr>
                  <td colSpan={isHeadmaster ? 5 : 4} className="py-20">
                    <EmptyState
                      icon={guards.length === 0 ? CalendarIcon : Search}
                      title={guards.length === 0 ? "No hay periodos" : "Sin resultados"}
                      description="Intenta cambiar los filtros o genera nuevos periodos."
                    />
                  </td>
                </tr>
              ) : (
                filteredGuards.map((g) => (
                  <tr key={g.period_id} className="hover:bg-slate-50 transition-colors duration-200 group">
                    <td className="px-6 py-4 text-[15px] font-mono text-slate-600">
                      {g.week_number.toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-[15px] font-semibold text-slate-900">
                        {format(parseISO(g.start_date), "dd MMM", { locale: es })}
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        {format(parseISO(g.end_date), "dd MMM", { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-[15px]">
                        <div className="flex flex-col">
                          <span className={g.auxilio ? "text-slate-900 font-medium" : "text-slate-600 italic"}>
                            {g.auxilio ? g.auxilio.name : "Auxilio"}
                          </span>
                          <span className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold">Aux</span>
                        </div>
                        <div className="flex flex-col">
                          <span className={g.tramitador ? "text-slate-900 font-medium" : "text-slate-600 italic"}>
                            {g.tramitador ? g.tramitador.name : "Tramitador"}
                          </span>
                          <span className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold">Tra</span>
                        </div>
                        <div className="flex flex-col">
                          <span className={g.gestor ? "text-slate-900 font-medium" : "text-slate-600 italic"}>
                            {g.gestor ? g.gestor.name : "Gestor"}
                          </span>
                          <span className="text-[10px] uppercase tracking-tighter text-slate-500 font-bold">Ges</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {g.coverage === 3 ? (
                        <DSBadge variant="green">Completa</DSBadge>
                      ) : g.coverage === 0 ? (
                        <DSBadge variant="red">Sin cubrir</DSBadge>
                      ) : (
                        <DSBadge variant="orange">Parcial ({g.coverage}/3)</DSBadge>
                      )}
                    </td>
                    {isHeadmaster && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(g)}
                          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all duration-200 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredGuards.map((g) => (
            <DSCard key={g.period_id} className="p-5">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-1">Semana {g.week_number}</div>
                  <div className="text-[17px] font-semibold text-slate-900 flex items-center gap-2">
                    {format(parseISO(g.start_date), "dd MMM", { locale: es })}
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    {format(parseISO(g.end_date), "dd MMM", { locale: es })}
                  </div>
                </div>
                {g.coverage === 3 ? (
                  <DSBadge variant="green">3/3</DSBadge>
                ) : (
                  <DSBadge variant={g.coverage === 0 ? "red" : "orange"}>{g.coverage}/3</DSBadge>
                )}
              </div>

              <div className="space-y-3 rounded-[16px] p-4 mt-1 bg-slate-50 border border-slate-100">
                {[
                  { role: 'Auxilio', person: g.auxilio, variant: 'amber' as const },
                  { role: 'Tramitador/a', person: g.tramitador, variant: 'blue' as const },
                  { role: 'Gestor/a', person: g.gestor, variant: 'green' as const }
                ].map((row, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{row.role}</span>
                    <span className={row.person ? "text-[15px] font-semibold text-slate-900" : "text-[15px] font-medium text-slate-600 italic"}>
                      {row.person ? row.person.name : "Pendiente de asignar"}
                    </span>
                  </div>
                ))}
              </div>

              {isHeadmaster && (
                <DSButton 
                  variant="secondary" 
                  className="w-full mt-5 h-11"
                  onClick={() => handleEditClick(g)}
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Editar asignaciones
                </DSButton>
              )}
            </DSCard>
          ))}
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

      <GuardDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        activeYear={activeYear}
        onSuccess={handleSuccessSave}
      />
    </div>
  )
}
