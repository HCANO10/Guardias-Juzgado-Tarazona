"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { ClipboardList, RefreshCw, Filter, User, Shield, Calendar, Sun, Settings, Users, Loader2 } from "lucide-react"
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

export default function ActivityPageClient() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const supabase = createClient()

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (typeFilter !== "all") params.set("type", typeFilter)

      const res = await fetch(`/api/activity?${params}`)
      const result = await res.json()
      if (res.ok) {
        setEntries(result.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  const entityTypes = Array.from(new Set(entries.map(e => e.entity_type))).sort()

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader
          title="Registro de Actividad"
          subtitle="Historial de acciones realizadas en el sistema."
        />
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#86868B] hover:bg-black/[0.04] transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-[#86868B]" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px] rounded-xl h-10 bg-white border-black/[0.08] text-[14px]">
            <SelectValue placeholder="Tipo de entidad" />
          </SelectTrigger>
          <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
            <SelectItem value="all">Todos los tipos</SelectItem>
            {entityTypes.map(t => (
              <SelectItem key={t} value={t}>{ENTITY_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#86868B]">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <span className="text-sm">Cargando actividad...</span>
        </div>
      ) : entries.length === 0 ? (
        <DSCard className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-[#86868B]/30 mx-auto mb-4" />
          <p className="text-[15px] font-medium text-neutral-900">Sin actividad registrada</p>
          <p className="text-sm text-[#86868B] mt-1">Las acciones del sistema apareceran aqui.</p>
        </DSCard>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const Icon = ENTITY_ICONS[entry.entity_type] || ClipboardList
            const variant = getActionVariant(entry.action)
            const staffName = entry.staff
              ? `${entry.staff.first_name} ${entry.staff.last_name}`
              : "Sistema"

            return (
              <DSCard key={entry.id} className="flex items-start gap-4 py-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  variant === "green" ? "bg-green-50 text-green-600" :
                  variant === "blue" ? "bg-blue-50 text-[#0066CC]" :
                  variant === "orange" ? "bg-amber-50 text-amber-600" :
                  variant === "red" ? "bg-red-50 text-red-500" :
                  "bg-gray-50 text-[#86868B]"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold text-neutral-900">{entry.action}</span>
                    <DSBadge variant={variant === "neutral" ? "blue" : variant}>
                      {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                    </DSBadge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[13px] text-[#86868B]">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {staffName}
                    </span>
                    <span>
                      {format(parseISO(entry.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <div className="mt-2 text-xs text-[#86868B] bg-[#F2F2F7]/50 rounded-lg px-3 py-2 font-mono break-all">
                      {JSON.stringify(entry.details, null, 0)}
                    </div>
                  )}
                </div>
              </DSCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
