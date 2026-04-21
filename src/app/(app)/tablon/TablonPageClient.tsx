"use client"

import { useState } from "react"
import { Megaphone, Shield, Sun, ArrowLeftRight, Sparkles, RefreshCw, Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface SwapItem {
  id: string
  status: "accepted" | "pending"
  requester: string
  requested: string
}

interface TablonProps {
  isAdmin: boolean
  hasBulletin: boolean
  bulletinText: string | null
  generatedAt: string
  weekLabel: string
  weekDates: string
  weekNumber: number
  guards: { name: string }[]
  vacations: { name: string; tipo: string; start: string; end: string }[]
  swaps: SwapItem[]
}

export default function TablonPageClient({
  isAdmin, hasBulletin, bulletinText: initialText, generatedAt,
  weekLabel, weekDates, weekNumber, guards, vacations, swaps,
}: TablonProps) {
  const [text, setText] = useState(initialText)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wasGenerated, setWasGenerated] = useState(false)

  const generate = async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/tablon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error desconocido")
      setText(data.bulletin)
      setWasGenerated(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error generando el tablón")
    } finally {
      setLoading(false)
    }
  }

  const genTime = generatedAt
    ? format(parseISO(generatedAt), "EEEE d MMM · HH:mm", { locale: es })
    : null

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-5 w-5 text-indigo-500" strokeWidth={2} />
            <span className="text-[11px] font-bold tracking-[2px] uppercase text-indigo-500">Tablón de Anuncios</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-slate-900 leading-tight tracking-tight">
            {weekLabel}
          </h1>
          <p className="text-[14px] text-slate-500 mt-0.5">{weekDates}</p>
        </div>

        {/* Week badge */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-white text-[13px] font-semibold shadow-lg"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <span className="text-[20px] font-black opacity-60">S</span>
            <span className="text-[28px] font-black leading-none">{weekNumber}</span>
          </div>
        </div>
      </div>

      {/* ── AI BULLETIN CARD ── */}
      <div
        className="relative rounded-[24px] overflow-hidden shadow-xl"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)" }}
      >
        {/* Subtle mesh overlay */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #818cf8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 50%)" }} />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
            </div>
            <span className="text-[11px] font-bold tracking-[2px] uppercase text-indigo-300">Resumen IA de la semana</span>
          </div>

          {text ? (
            <p className="text-[15px] sm:text-[16px] text-white/90 leading-relaxed font-light">{text}</p>
          ) : (
            <p className="text-[15px] text-white/50 italic">
              {loading ? "Generando resumen..." : "Aún no hay resumen generado para esta semana."}
            </p>
          )}

          {/* Footer row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-white/40 text-[12px]">
              {!wasGenerated && genTime && (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Generado: {genTime}</span>
                </>
              )}
              {wasGenerated && <span className="text-emerald-400">✓ Actualizado ahora</span>}
            </div>
            <div className="flex gap-2">
              {!text && !loading && (
                <button
                  onClick={() => generate(false)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generar tablón
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => generate(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Generando..." : "Regenerar"}
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-3 text-[13px] text-red-300 bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
          )}
        </div>
      </div>

      {/* ── DATA GRID ── */}
      <div className="grid gap-4 sm:grid-cols-3">

        {/* Guardias */}
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-[10px] bg-indigo-50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-indigo-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">De guardia</p>
              <p className="text-[12px] text-slate-500">Esta semana</p>
            </div>
          </div>
          {guards.length > 0 ? (
            <div className="space-y-2">
              {guards.map((g, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-700 flex-shrink-0">
                    {g.name.charAt(0)}
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 leading-tight">{g.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 italic">Sin asignaciones</p>
          )}
        </div>

        {/* Vacaciones */}
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-[10px] bg-amber-50 flex items-center justify-center">
              <Sun className="h-4 w-4 text-amber-500" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Ausencias</p>
              <p className="text-[12px] text-slate-500">Esta semana</p>
            </div>
          </div>
          {vacations.length > 0 ? (
            <div className="space-y-2">
              {vacations.map((v, i) => (
                <div key={i} className="py-2 border-b border-slate-50 last:border-0">
                  <p className="text-[13px] font-semibold text-slate-700">{v.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{v.tipo} · {v.start}–{v.end}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 italic">Nadie ausente</p>
          )}
        </div>

        {/* Intercambios */}
        <div className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-[10px] bg-emerald-50 flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-emerald-600" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Intercambios</p>
              <p className="text-[12px] text-slate-500">Esta semana</p>
            </div>
          </div>
          {swaps.length > 0 ? (
            <div className="space-y-2">
              {swaps.map((s) => (
                <div key={s.id} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      s.status === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {s.status === "accepted" ? "Confirmado" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-snug">
                    {s.requester} <span className="text-slate-400">↔</span> {s.requested}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 italic">Sin intercambios</p>
          )}
        </div>

      </div>

      {/* Info note */}
      <p className="text-center text-[12px] text-slate-400">
        El tablón se actualiza automáticamente cada semana de guardia.
        {isAdmin && " Como administrador puedes forzar la regeneración con el botón de arriba."}
      </p>
    </div>
  )
}
