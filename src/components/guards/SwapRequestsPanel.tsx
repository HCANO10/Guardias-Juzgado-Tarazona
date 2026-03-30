"use client"

import { useState } from "react"
import { DSButton, DSBadge, DSCard } from "@/lib/design-system"
import { ArrowLeftRight, Check, X, Loader2, Inbox, Clock, Send } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export interface SwapRequest {
  id: string
  status: "pending" | "accepted" | "rejected" | "cancelled"
  message?: string | null
  created_at: string
  requester: { id: string; first_name: string; last_name: string }
  requested: { id: string; first_name: string; last_name: string }
  period_requester: { week_number: number; start_date: string; end_date: string }
  period_requested: { week_number: number; start_date: string; end_date: string }
}

interface Props {
  currentStaffId: string
  requests: SwapRequest[]
}

const STATUS_LABELS: Record<string, { label: string; variant: "green" | "neutral" | "blue" | "orange" | "red" }> = {
  pending:   { label: "Pendiente", variant: "orange" },
  accepted:  { label: "Aceptado",  variant: "green"   },
  rejected:  { label: "Rechazado", variant: "red"     },
  cancelled: { label: "Cancelado", variant: "neutral"  },
}

export function SwapRequestsPanel({ currentStaffId, requests }: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const incoming = requests.filter(
    (r) => r.requested.id === currentStaffId && r.status === "pending"
  )
  const outgoing = requests.filter(
    (r) => r.requester.id === currentStaffId && r.status === "pending"
  )
  const history = requests.filter((r) => r.status !== "pending")

  const respond = async (
    id: string,
    action: "accept" | "reject" | "cancel"
  ) => {
    setBusy(id + action)
    try {
      const res = await fetch(`/api/guards/swap-request/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: data.message })
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setBusy(null)
    }
  }

  const formatWeek = (
    p: { week_number: number; start_date: string; end_date: string }
  ) =>
    `Sem. ${p.week_number} · ${format(parseISO(p.start_date), "dd MMM", { locale: es })} – ${format(parseISO(p.end_date), "dd MMM", { locale: es })}`

  if (incoming.length === 0 && outgoing.length === 0 && history.length === 0) {
    return null
  }

  return (
    <DSCard className="overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-[12px] bg-indigo-50 flex items-center justify-center">
          <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-[18px] font-bold text-slate-900">
            Intercambios de guardia
          </h3>
          <p className="text-[12px] text-slate-500">
            Solicitudes enviadas y recibidas
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── INCOMING ─────────────────────────────── */}
        {incoming.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-amber-500" />
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">
                Solicitudes recibidas
              </span>
              <span className="h-5 min-w-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center px-1">
                {incoming.length}
              </span>
            </div>

            {incoming.map((r) => (
              <div
                key={r.id}
                className="border border-amber-200 bg-amber-50 rounded-[20px] p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">
                      {r.requester.first_name} {r.requester.last_name}
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      {format(parseISO(r.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <DSBadge variant="orange">Pendiente</DSBadge>
                </div>

                {/* Swap visualization */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-[12px]">
                  <div className="flex-1 bg-white rounded-[12px] p-3 border border-amber-200 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 mb-0.5">
                      Ofrece su guardia
                    </p>
                    <p className="font-bold text-slate-900 break-words">
                      {formatWeek(r.period_requester)}
                    </p>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-slate-400 shrink-0 self-center rotate-90 sm:rotate-0" />
                  <div className="flex-1 bg-indigo-50 rounded-[12px] p-3 border border-indigo-200 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700 mb-0.5">
                      Quiere tu guardia
                    </p>
                    <p className="font-bold text-indigo-900 break-words">
                      {formatWeek(r.period_requested)}
                    </p>
                  </div>
                </div>

                {r.message && (
                  <p className="text-[13px] text-slate-600 bg-white rounded-[12px] p-3 border border-slate-200 italic">
                    "{r.message}"
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <DSButton
                    variant="secondary"
                    className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => respond(r.id, "reject")}
                    disabled={busy !== null}
                  >
                    {busy === r.id + "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><X className="h-4 w-4 mr-1.5" /> Rechazar</>
                    )}
                  </DSButton>
                  <DSButton
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => respond(r.id, "accept")}
                    disabled={busy !== null}
                  >
                    {busy === r.id + "accept" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Check className="h-4 w-4 mr-1.5" /> Aceptar</>
                    )}
                  </DSButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── OUTGOING ─────────────────────────────── */}
        {outgoing.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-500">
                Solicitudes enviadas (pendientes)
              </span>
            </div>

            {outgoing.map((r) => (
              <div
                key={r.id}
                className="border border-blue-200 bg-blue-50 rounded-[20px] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">
                      → {r.requested.first_name} {r.requested.last_name}
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Enviada el {format(parseISO(r.created_at), "dd MMM · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <DSBadge variant="blue">Esperando</DSBadge>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-[12px]">
                  <div className="flex-1 bg-indigo-50 rounded-[12px] p-3 border border-indigo-200 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700 mb-0.5">Tu guardia</p>
                    <p className="font-bold text-indigo-900 break-words">{formatWeek(r.period_requester)}</p>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-slate-400 shrink-0 self-center rotate-90 sm:rotate-0" />
                  <div className="flex-1 bg-white rounded-[12px] p-3 border border-blue-200 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700 mb-0.5">Su guardia</p>
                    <p className="font-bold text-slate-900 break-words">{formatWeek(r.period_requested)}</p>
                  </div>
                </div>

                <DSButton
                  variant="secondary"
                  className="w-full h-9 text-[13px] border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
                  onClick={() => respond(r.id, "cancel")}
                  disabled={busy !== null}
                >
                  {busy === r.id + "cancel" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Cancelar solicitud"
                  )}
                </DSButton>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY ──────────────────────────────── */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-400">
                Historial reciente
              </span>
            </div>

            {history.slice(0, 5).map((r) => {
              const isOutgoing = r.requester.id === currentStaffId
              const other = isOutgoing ? r.requested : r.requester
              const s = STATUS_LABELS[r.status] ?? STATUS_LABELS.cancelled
              return (
                <div
                  key={r.id}
                  className={cn(
                    "rounded-[16px] p-4 border flex items-center justify-between gap-3",
                    r.status === "accepted"
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-black text-slate-600">
                      {other.first_name[0]}{other.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate">
                        {isOutgoing ? "→" : "←"} {other.first_name} {other.last_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Sem. {r.period_requester.week_number} ↔ Sem. {r.period_requested.week_number}
                      </p>
                    </div>
                  </div>
                  <DSBadge variant={s.variant} className="shrink-0">{s.label}</DSBadge>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DSCard>
  )
}
