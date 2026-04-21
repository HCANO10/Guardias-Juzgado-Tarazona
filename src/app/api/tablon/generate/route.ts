export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/require-role"
import { createAdminClient } from "@/lib/supabase/admin"
import { callGroq } from "@/lib/groq/client"
import { getSetting, setSetting } from "@/lib/settings"
import { getISOWeek, getISOWeekYear, parseISO, format } from "date-fns"
import { es } from "date-fns/locale"
import { buildFullName } from "@/lib/staff/normalize"

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const currentWeekKey = `${getISOWeekYear(today)}-W${String(getISOWeek(today)).padStart(2, "0")}`

  // Check cache (skip if force=true or wrong week)
  if (!force) {
    const cachedWeek = await getSetting(admin, "bulletin_week", "")
    const cachedContent = await getSetting(admin, "bulletin_content", "")
    if (cachedWeek === currentWeekKey && cachedContent) {
      return NextResponse.json({ bulletin: cachedContent, cached: true, week: currentWeekKey })
    }
  }

  try {
    // 1. Guard assignments for current week
    const { data: periods } = await admin
      .from("guard_periods")
      .select("id, week_number, start_date, end_date")
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .single()

    type GuardAssign = { staff: { first_name: string; last_name: string }; positions: { name: string } | null }
    let guardsThisWeek: GuardAssign[] = []
    let weekLabel = `Semana ${getISOWeek(today)}`
    let weekDates = ""

    if (periods) {
      weekLabel = `Semana ${periods.week_number}`
      weekDates = `${format(parseISO(periods.start_date), "d MMM", { locale: es })} – ${format(parseISO(periods.end_date), "d MMM", { locale: es })}`
      const { data: assigns } = await admin
        .from("guard_assignments")
        .select("staff(first_name, last_name), positions:staff(positions(name))")
        .eq("guard_period_id", periods.id)
      guardsThisWeek = (assigns ?? []) as unknown as GuardAssign[]
    }

    // 2. Vacations overlapping this week
    type VacRow = { staff: { first_name: string; last_name: string }; start_date: string; end_date: string; tipo: string }
    const { data: vacations } = await admin
      .from("vacations")
      .select("staff(first_name, last_name), start_date, end_date, tipo")
      .neq("status", "cancelled")
      .lte("start_date", periods?.end_date ?? todayStr)
      .gte("end_date", periods?.start_date ?? todayStr)
    const vacsThisWeek = (vacations ?? []) as unknown as VacRow[]

    // 3. Swap requests affecting this week (accepted or pending)
    type SwapRow = {
      status: string
      requester: { first_name: string; last_name: string }
      requested: { first_name: string; last_name: string }
      period_requester: { week_number: number }
      period_requested: { week_number: number }
    }
    const weekNumber = periods?.week_number ?? getISOWeek(today)
    const { data: swaps } = await admin
      .from("guard_swap_requests")
      .select(`
        status,
        requester:staff!guard_swap_requests_requester_id_fkey(first_name, last_name),
        requested:staff!guard_swap_requests_requested_id_fkey(first_name, last_name),
        period_requester:guard_periods!guard_swap_requests_period_id_requester_fkey(week_number),
        period_requested:guard_periods!guard_swap_requests_period_id_requested_fkey(week_number)
      `)
      .in("status", ["accepted", "pending"])
    const swapsThisWeek = ((swaps ?? []) as unknown as SwapRow[]).filter(
      s => s.period_requester?.week_number === weekNumber || s.period_requested?.week_number === weekNumber
    )

    // 4. Build prompt
    const guardsText = guardsThisWeek.length > 0
      ? guardsThisWeek.map(g => buildFullName(g.staff as { first_name: string; last_name: string })).join(", ")
      : "Sin asignaciones registradas"

    const vacsText = vacsThisWeek.length > 0
      ? vacsThisWeek.map(v => `${buildFullName(v.staff as { first_name: string; last_name: string })} (${v.tipo ?? "vacaciones"}: ${format(parseISO(v.start_date), "d MMM", { locale: es })}–${format(parseISO(v.end_date), "d MMM", { locale: es })})`).join("; ")
      : "Nadie de vacaciones esta semana"

    const swapsText = swapsThisWeek.length > 0
      ? swapsThisWeek.map(s => {
          const req = buildFullName(s.requester as { first_name: string; last_name: string })
          const rec = buildFullName(s.requested as { first_name: string; last_name: string })
          return s.status === "accepted"
            ? `Intercambio confirmado entre ${req} y ${rec}`
            : `Intercambio pendiente: ${req} → ${rec}`
        }).join("; ")
      : "Sin intercambios esta semana"

    const sysPrompt = `Eres el asistente del Juzgado de Primera Instancia e Instrucción de Tarazona (Zaragoza).
Tu tarea es redactar un breve tablón de anuncios semanal para el personal del juzgado.
Tono: profesional pero cercano, positivo y directo. Máximo 120 palabras. Sin listas ni formato markdown. Solo texto corrido en español.
Termina siempre con una frase de ánimo breve y apropiada para el contexto judicial.`

    const usrPrompt = `Genera el tablón de anuncios para la ${weekLabel} (${weekDates || "esta semana"}):
- De guardia: ${guardsText}
- Vacaciones/ausencias: ${vacsText}
- Intercambios de guardia: ${swapsText}
Redacta el anuncio de forma natural, mencionando por nombre a las personas relevantes.`

    const model = await getSetting(admin, "bulletin_model", "deepseek-r1-distill-llama-70b")
    const result = await callGroq(sysPrompt, usrPrompt, model)
    let bulletinText = result.content?.trim() ?? ""

    // Strip <think>...</think> blocks from deepseek-r1
    bulletinText = bulletinText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()

    // Cache result
    await setSetting(admin, "bulletin_week", currentWeekKey, "Semana del último tablón generado")
    await setSetting(admin, "bulletin_content", bulletinText, "Contenido del tablón de anuncios")
    await setSetting(admin, "bulletin_generated_at", new Date().toISOString(), "Fecha de generación del tablón")

    return NextResponse.json({
      bulletin: bulletinText,
      cached: false,
      week: currentWeekKey,
      meta: { guardsCount: guardsThisWeek.length, vacsCount: vacsThisWeek.length, swapsCount: swapsThisWeek.length }
    })
  } catch (err: unknown) {
    console.error("[tablon/generate]", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error generando tablón" }, { status: 500 })
  }
}
