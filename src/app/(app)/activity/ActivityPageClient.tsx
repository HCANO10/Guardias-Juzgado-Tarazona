"use client"

import { useState, useEffect, useRef } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ClipboardList, RefreshCw, Filter, User, Shield, Calendar, Sun, Settings, Users, Loader2, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DSPageHeader, DSCard, DSBadge } from "@/lib/design-system"

interface ActivityEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  performed_by: string | null
  created_at: string
  staff: { first_name: string; last_name: string } | null
}

const PAGE_SIZE = 25

const ENTITY_ICONS: Record<string, typeof ClipboardList> = {
  staff: Users,
  guard: Shield,
  vacation: Sun,
  setting: Settings,
  calendar: Calendar,
  user: User,
}

const ENTITY_LABELS: Record<string, string> = {
  staff: "Personal",
  guard: "Guardias",
  guard_assignment: "Asignación",
  guard_period: "Periodo",
  vacation: "Vacaciones",
  setting: "Configuración",
  user: "Usuario",
}

const ACTION_VARIANTS: Record<string, "green" | "blue" | "orange" | "red" | "neutral"> = {
  create: "green",
  insert: "green",
  update: "blue",
  change: "blue",
  swap: "orange",
  delete: "red",
  deactivate: "red",
  reactivate: "green",
  generate: "blue",
  approve: "green",
  reject: "red",
}

function getActionVariant(action: string): "green" | "blue" | "orange" | "red" | "neutral" {
  const lower = action.toLowerCase()
  for (const [key, variant] of Object.entries(ACTION_VARIANTS)) {
    if (lower.includes(key)) return variant
  }
  return "neutral"
}

async function loadPage(typeFilter: string, offsetVal: number): Promise<ActivityEntry[]> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE + 1), offset: String(offsetVal) })
  if (typeFilter !== "all") params.set("type", typeFilter)
  const res = await fetch(`/api/activity?${params}`)
  const result = await res.json()
  return res.ok ? (result.data || []) : []
}

export default function ActivityPageClient() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState("all")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const offsetRef = useRef(0)

  const fetchFirst = async (filter: string) => {
    setLoading(true)
    offsetRef.current = 0
    try {
      const data = await loadPage(filter, 0)
      const hasNext = data.length > PAGE_SIZE
      const pageData = hasNext ? data.slice(0, PAGE_SIZE) : data
      setEntries(pageData)
      setHasMore(hasNext)
      offsetRef.current = pageData.length
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      const data = await loadPage(typeFilter, offsetRef.current)
      const hasNext = data.length > PAGE_SIZE
      const pageData = hasNext ? data.slice(0, PAGE_SIZE) : data
      setEntries(prev => [...prev, ...pageData])
      setHasMore(hasNext)
      offsetRef.current += pageData.length
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchFirst(typeFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter])

  const toggleDetails = (id: string) => {
    setExpandedDetails(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const entityTypes = Array.from(new Set(entries.map(e => e.entity_type))).sort()

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader
          title="Registro de Actividad"
          subtitle="Historial de acciones realizadas en el sistema."
        />
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => fetchFirst(typeFilter)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          {lastUpdated && (
            <span className="text-[11px] text-slate-500">
              Actualizado {format(lastUpdated, "HH:mm:ss", { locale: es })}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px] rounded-xl h-10 bg-white/[0.05] border-white/[0.09] text-slate-300 text-[14px]">
            <SelectValue placeholder="Tipo de entidad" />
          </SelectTrigger>
          <SelectContent className="rounded-[16px] border-white/[0.09] shadow-xl">
            <SelectItem value="all">Todos los tipos</SelectItem>
            {entityTypes.map(t => (
              <SelectItem key={t} value={t}>{ENTITY_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {entries.length > 0 && !loading && (
          <span className="text-[13px] text-slate-500">{entries.length} registros</span>
        )}
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <span className="text-sm">Cargando actividad...</span>
        </div>
      ) : entries.length === 0 ? (
        <DSCard className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-[15px] font-medium text-slate-200">Sin actividad registrada</p>
          <p className="text-sm text-slate-500 mt-1">Las acciones del sistema apareceran aqui.</p>
        </DSCard>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const Icon = ENTITY_ICONS[entry.entity_type] || ClipboardList
            const variant = getActionVariant(entry.action)
            const staffName = entry.staff
              ? `${entry.staff.first_name} ${entry.staff.last_name}`
              : "Sistema"
            const hasDetails = entry.details && Object.keys(entry.details).length > 0
            const isExpanded = expandedDetails.has(entry.id)

            return (
              <DSCard key={entry.id} className="flex items-start gap-4 py-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  variant === "green" ? "bg-emerald-500/[0.15] text-emerald-400" :
                  variant === "blue" ? "bg-blue-500/[0.15] text-blue-400" :
                  variant === "orange" ? "bg-amber-500/[0.15] text-amber-400" :
                  variant === "red" ? "bg-red-500/[0.15] text-red-400" :
                  "bg-white/[0.07] text-slate-400"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold text-slate-100">{entry.action}</span>
                    <DSBadge variant={variant === "neutral" ? "blue" : variant}>
                      {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                    </DSBadge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[13px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {staffName}
                    </span>
                    <span>
                      {format(parseISO(entry.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  {hasDetails && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleDetails(entry.id)}
                        className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-200 transition-colors"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                      </button>
                      {isExpanded && (
                        <pre className="mt-2 text-[11px] text-slate-400 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </DSCard>
            )
          })}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-medium text-blue-400 border border-blue-500/[0.25] hover:bg-blue-500/[0.08] transition-colors disabled:opacity-50"
              >
                {loadingMore
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Cargando...</>
                  : <><ChevronDown className="h-4 w-4" />Cargar más</>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
