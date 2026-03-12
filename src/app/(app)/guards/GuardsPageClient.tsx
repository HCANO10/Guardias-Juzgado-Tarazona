/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
import { GuardWeekView } from "@/types/guards"
import { StaffByCategory } from "@/lib/guards/staff-by-category"
import { buildFullName } from "@/lib/staff/normalize"
import { useRole } from "@/hooks/use-role"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Edit2, Scale, Calendar as CalendarIcon, Search, ArrowRight, Shield } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { GuardAssigner } from "@/components/guards/GuardAssigner"
import { AIProposalReview } from "@/components/guards/AIProposalReview"
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
      const monthStart = new Date(g.start_date).getMonth().toString()
      const monthEnd = new Date(g.end_date).getMonth().toString()
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
          <DSButton onClick={() => setAiReviewOpen(true)} className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Generar con IA
          </DSButton>
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
            <DSCard key={idx} className={cat.data.hasDisparity ? "ring-2 ring-red-100" : ""}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold uppercase tracking-wider text-[#86868B]">{cat.label}</span>
                {cat.data.hasDisparity && <DSBadge variant="red">Descompensado</DSBadge>}
              </div>
              <div className="space-y-3">
                {cat.data.counts.map(p => (
                  <div key={p.id} className="flex justify-between items-center group">
                    <span className="text-[14px] text-neutral-900 font-medium">{p.first_name}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                             cat.variant === 'amber' ? 'bg-amber-500' : 
                             cat.variant === 'blue' ? 'bg-[#0066CC]' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((p.numGuards / 15) * 100, 100)}%` }} 
                        />
                      </div>
                      <span className="text-[13px] font-bold text-neutral-900 w-4 text-right">{p.numGuards}</span>
                    </div>
                  </div>
                ))}
              </div>
            </DSCard>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-black/[0.04]">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full md:w-[150px] rounded-[12px] h-11 bg-white border-black/[0.08] text-[15px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
              <SelectItem value="all">Todos los meses</SelectItem>
              {Array.from({length: 12}).map((_, i) => (
                <SelectItem key={i} value={i.toString()}>{format(new Date(2025, i, 1), 'MMMM', {locale: es})}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="w-full md:w-[200px] rounded-[12px] h-11 bg-white border-black/[0.08] text-[15px]">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
              <SelectItem value="all">Todo el personal</SelectItem>
              {allStaff.map(p => (
                <SelectItem key={p.id} value={p.id}>{buildFullName(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px] rounded-[12px] h-11 bg-white border-black/[0.08] text-[15px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
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
        <div className="hidden md:block bg-white rounded-[28px] overflow-hidden border border-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2F2F7] text-[13px] font-semibold uppercase tracking-wider text-[#86868B]">
                <th className="px-6 py-4 w-[80px]">Nº</th>
                <th className="px-6 py-4">Periodo</th>
                <th className="px-6 py-4">Personal asignado</th>
                <th className="px-6 py-4 w-[160px]">Estado</th>
                {isHeadmaster && <th className="px-6 py-4 w-[80px]"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
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
                  <tr key={g.period_id} className="hover:bg-[#F2F2F7]/50 transition-colors group">
                    <td className="px-6 py-4 text-[15px] font-mono text-[#86868B]">
                      {g.week_number.toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-[15px] font-semibold text-neutral-900">
                        {format(new Date(g.start_date), "dd MMM", { locale: es })}
                        <ArrowRight className="h-3 w-3 text-[#86868B]" />
                        {format(new Date(g.end_date), "dd MMM", { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-[15px]">
                        <div className="flex flex-col">
                          <span className={g.auxilio ? "text-neutral-900 font-medium" : "text-[#86868B]/40 italic"}>
                            {g.auxilio ? g.auxilio.name : "Auxilio"}
                          </span>
                          <span className="text-[10px] uppercase tracking-tighter text-[#86868B] font-bold">Aux</span>
                        </div>
                        <div className="flex flex-col">
                          <span className={g.tramitador ? "text-neutral-900 font-medium" : "text-[#86868B]/40 italic"}>
                            {g.tramitador ? g.tramitador.name : "Tramitador"}
                          </span>
                          <span className="text-[10px] uppercase tracking-tighter text-[#86868B] font-bold">Tra</span>
                        </div>
                        <div className="flex flex-col">
                          <span className={g.gestor ? "text-neutral-900 font-medium" : "text-[#86868B]/40 italic"}>
                            {g.gestor ? g.gestor.name : "Gestor"}
                          </span>
                          <span className="text-[10px] uppercase tracking-tighter text-[#86868B] font-bold">Ges</span>
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
                          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors text-[#86868B] hover:text-[#0066CC]"
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
                  <div className="text-[13px] font-bold text-[#86868B] uppercase tracking-wider mb-1">Semana {g.week_number}</div>
                  <div className="text-[17px] font-semibold text-neutral-900 flex items-center gap-2">
                    {format(new Date(g.start_date), "dd MMM", { locale: es })}
                    <ArrowRight className="h-3 w-3 text-[#86868B]" />
                    {format(new Date(g.end_date), "dd MMM", { locale: es })}
                  </div>
                </div>
                {g.coverage === 3 ? (
                  <DSBadge variant="green">3/3</DSBadge>
                ) : (
                  <DSBadge variant={g.coverage === 0 ? "red" : "orange"}>{g.coverage}/3</DSBadge>
                )}
              </div>

              <div className="space-y-3 bg-[#F2F2F7]/50 rounded-[16px] p-4">
                {[
                  { role: 'Auxilio', person: g.auxilio, variant: 'amber' as const },
                  { role: 'Tramitador/a', person: g.tramitador, variant: 'blue' as const },
                  { role: 'Gestor/a', person: g.gestor, variant: 'green' as const }
                ].map((row, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-black/[0.04] last:border-0 pb-2 last:pb-0">
                    <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-tighter">{row.role}</span>
                    <span className={row.person ? "text-[15px] font-semibold text-neutral-900" : "text-[15px] font-medium text-[#86868B]/40 italic"}>
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
    </div>
  )
}
