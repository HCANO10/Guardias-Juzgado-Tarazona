/**
 * Lógica de generación del tablón de anuncios semanal.
 * Usada tanto en el server component (auto-generación) como en la API route (admin regenera).
 */

import { SupabaseClient } from "@supabase/supabase-js"
import { callGroq } from "@/lib/groq/client"
import { getSetting, setSetting } from "@/lib/settings"
import { buildFullName } from "@/lib/staff/normalize"
import { getISOWeek, getISOWeekYear, parseISO, format, getYear } from "date-fns"
import { es } from "date-fns/locale"

type StaffName = { first_name: string; last_name: string }

/**
 * Clave de caché basada en el guard_period activo (no en la semana ISO).
 * Cambia exactamente cuando empieza una nueva guardia (viernes).
 * period puede ser null si no hay guardia activa hoy → fallback a semana ISO.
 */
export function getGuardWeekKey(period: { week_number: number; start_date: string } | null): string {
  if (period) {
    const year = getYear(parseISO(period.start_date))
    return `${year}-GP${period.week_number}`
  }
  // Fallback: ISO week (no debería ocurrir si los periodos están bien generados)
  const today = new Date()
  return `${getISOWeekYear(today)}-W${String(getISOWeek(today)).padStart(2, "0")}`
}

/** @deprecated Usar getGuardWeekKey(period) para claves basadas en guardia real */
export function getCurrentWeekKey(): string {
  const today = new Date()
  return `${getISOWeekYear(today)}-W${String(getISOWeek(today)).padStart(2, "0")}`
}

export async function generateBulletin(
  admin: SupabaseClient,
  todayStr: string
): Promise<string> {
  // 1. Guard period that covers today
  const { data: period } = await admin
    .from("guard_periods")
    .select("id, week_number, start_date, end_date")
    .lte("start_date", todayStr)
    .gte("end_date", todayStr)
    .single()

  const weekLabel = period ? `Semana ${period.week_number}` : `Semana ${getISOWeek(new Date())}`
  const weekDates = period
    ? `${format(parseISO(period.start_date), "d MMM", { locale: es })} – ${format(parseISO(period.end_date), "d MMM", { locale: es })}`
    : ""

  // 2. Guards this week
  type AssignRow = { staff: StaffName }
  const { data: assigns } = period
    ? await admin.from("guard_assignments")
        .select("staff(first_name, last_name)")
        .eq("guard_period_id", period.id)
    : { data: [] }
  const guardsText = ((assigns ?? []) as unknown as AssignRow[])
    .map(a => buildFullName(a.staff)).join(", ") || "Sin asignaciones registradas"

  // 3. Vacations overlapping this week
  type VacRow = { staff: StaffName; start_date: string; end_date: string; tipo: string | null }
  const { data: vacations } = period
    ? await admin.from("vacations")
        .select("staff(first_name, last_name), start_date, end_date, tipo")
        .neq("status", "cancelled")
        .lte("start_date", period.end_date)
        .gte("end_date", period.start_date)
    : { data: [] }
  const vacsText = ((vacations ?? []) as unknown as VacRow[]).length > 0
    ? ((vacations ?? []) as unknown as VacRow[])
        .map(v => `${buildFullName(v.staff)} (${v.tipo ?? "vacaciones"}: ${format(parseISO(v.start_date), "d MMM", { locale: es })}–${format(parseISO(v.end_date), "d MMM", { locale: es })})`)
        .join("; ")
    : "Nadie de vacaciones esta semana"

  // 4. Swaps this week
  type SwapRow = {
    status: string
    requester: StaffName; requested: StaffName
    period_requester: { week_number: number }
    period_requested: { week_number: number }
  }
  const weekNumber = period?.week_number ?? getISOWeek(new Date())
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
  const swapsText = ((swaps ?? []) as unknown as SwapRow[])
    .filter(s => s.period_requester?.week_number === weekNumber || s.period_requested?.week_number === weekNumber)
    .map(s => {
      const req = buildFullName(s.requester)
      const rec = buildFullName(s.requested)
      return s.status === "accepted"
        ? `Intercambio confirmado entre ${req} y ${rec}`
        : `Intercambio pendiente de respuesta: ${req} solicitó a ${rec}`
    }).join("; ") || "Sin intercambios esta semana"

  // 5. Call Groq
  const model = await getSetting(admin, "bulletin_model", "llama-3.3-70b-versatile")

  const sysPrompt = `Asistente del Juzgado de Tarazona. Redacta el tablón semanal: tono cercano y profesional, máximo 100 palabras, texto corrido en español, sin listas ni markdown. Termina con una frase de ánimo breve.`

  const usrPrompt = `${weekLabel}${weekDates ? ` (${weekDates})` : ""}. Guardia: ${guardsText}. Ausencias: ${vacsText}. Intercambios: ${swapsText}.`

  const result = await callGroq(sysPrompt, usrPrompt, model, false, 350) // texto libre, 350 tokens máx
  let text = result.content?.trim() ?? ""
  // Strip <think> blocks (deepseek-r1 style)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()

  // 6. Cache in app_settings — clave basada en guard_period (cambia cada viernes)
  const weekKey = getGuardWeekKey(period)
  await setSetting(admin, "bulletin_week", weekKey)
  await setSetting(admin, "bulletin_content", text)
  await setSetting(admin, "bulletin_generated_at", new Date().toISOString())

  return text
}
