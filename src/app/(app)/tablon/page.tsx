export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getSetting } from "@/lib/settings"
import { createAdminClient } from "@/lib/supabase/admin"
import { getISOWeek, parseISO, format } from "date-fns"
import { es } from "date-fns/locale"
import { buildFullName } from "@/lib/staff/normalize"
import TablonPageClient from "./TablonPageClient"
import { getCurrentWeekKey, generateBulletin } from "@/lib/tablon/generate-bulletin"

type StaffName = { first_name: string; last_name: string }

export default async function TablonPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: me } = await supabase.from("staff").select("id, role").eq("email", user.email!).single()
  if (!me) redirect("/login")

  const isAdmin = me.role === "headmaster" || me.role === "admin"
  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const currentWeekKey = getCurrentWeekKey()

  // Check cache
  const cachedWeek = await getSetting(admin, "bulletin_week", "")
  const cachedContent = await getSetting(admin, "bulletin_content", "")
  const generatedAt = await getSetting(admin, "bulletin_generated_at", "")
  const isFresh = cachedWeek === currentWeekKey && !!cachedContent

  // Auto-generate if stale (first visitor of the week pays the Groq cost once)
  let bulletinText = isFresh ? cachedContent : null
  let bulletinError: string | null = null

  if (!isFresh) {
    try {
      bulletinText = await generateBulletin(admin, todayStr)
    } catch (err: unknown) {
      bulletinError = err instanceof Error ? err.message : "Error generando el tablón"
      console.error("[tablon/page] auto-generation failed:", err)
    }
  }

  // Fetch current guard period for display
  const { data: period } = await admin
    .from("guard_periods")
    .select("id, week_number, start_date, end_date")
    .lte("start_date", todayStr)
    .gte("end_date", todayStr)
    .single()

  // Guard assignments
  type AssignRow = { staff: StaffName }
  const { data: assigns } = period
    ? await admin.from("guard_assignments")
        .select("staff(first_name, last_name)")
        .eq("guard_period_id", period.id)
    : { data: [] }
  const guards = ((assigns ?? []) as unknown as AssignRow[]).map(a => ({
    name: buildFullName(a.staff)
  }))

  // Vacations this week
  type VacRow = { staff: StaffName; start_date: string; end_date: string; tipo: string | null }
  const { data: vacations } = period
    ? await admin.from("vacations")
        .select("staff(first_name, last_name), start_date, end_date, tipo")
        .neq("status", "cancelled")
        .lte("start_date", period.end_date)
        .gte("end_date", period.start_date)
    : { data: [] }
  const vacs = ((vacations ?? []) as unknown as VacRow[]).map(v => ({
    name: buildFullName(v.staff),
    tipo: v.tipo ?? "vacaciones",
    start: format(parseISO(v.start_date), "d MMM", { locale: es }),
    end: format(parseISO(v.end_date), "d MMM", { locale: es }),
  }))

  // Swaps this week
  type SwapRow = {
    id: string; status: string
    requester: StaffName; requested: StaffName
    period_requester: { week_number: number }
    period_requested: { week_number: number }
  }
  const weekNumber = period?.week_number ?? getISOWeek(today)
  const { data: swaps } = await admin
    .from("guard_swap_requests")
    .select(`
      id, status,
      requester:staff!guard_swap_requests_requester_id_fkey(first_name, last_name),
      requested:staff!guard_swap_requests_requested_id_fkey(first_name, last_name),
      period_requester:guard_periods!guard_swap_requests_period_id_requester_fkey(week_number),
      period_requested:guard_periods!guard_swap_requests_period_id_requested_fkey(week_number)
    `)
    .in("status", ["accepted", "pending"])
  const swapsThisWeek = ((swaps ?? []) as unknown as SwapRow[])
    .filter(s => s.period_requester?.week_number === weekNumber || s.period_requested?.week_number === weekNumber)
    .map(s => ({
      id: s.id,
      status: s.status as "accepted" | "pending",
      requester: buildFullName(s.requester),
      requested: buildFullName(s.requested),
    }))

  const weekLabel = period ? `Semana ${period.week_number}` : `Semana ${weekNumber}`
  const weekDates = period
    ? `${format(parseISO(period.start_date), "d 'de' MMMM", { locale: es })} – ${format(parseISO(period.end_date), "d 'de' MMMM yyyy", { locale: es })}`
    : format(today, "MMMM yyyy", { locale: es })

  const genAt = bulletinText && !isFresh
    ? new Date().toISOString()
    : generatedAt

  return (
    <TablonPageClient
      isAdmin={isAdmin}
      bulletinText={bulletinText}
      bulletinError={bulletinError}
      generatedAt={genAt}
      weekLabel={weekLabel}
      weekDates={weekDates}
      weekNumber={weekNumber}
      guards={guards}
      vacations={vacs}
      swaps={swapsThisWeek}
    />
  )
}
