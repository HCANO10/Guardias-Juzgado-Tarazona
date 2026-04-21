export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/require-role"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSetting } from "@/lib/settings"
import { getGuardWeekKey, generateBulletin } from "@/lib/tablon/generate-bulletin"

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  // Only admin/headmaster can force-regenerate
  if (auth.role !== "headmaster" && auth.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos para regenerar el tablón" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  const admin = createAdminClient()
  const todayStr = new Date().toISOString().split("T")[0]

  // Fetch active guard period to compute the correct cache key
  const { data: period } = await admin
    .from("guard_periods")
    .select("week_number, start_date")
    .lte("start_date", todayStr)
    .gte("end_date", todayStr)
    .single()

  const currentWeekKey = getGuardWeekKey(period)

  // Return cache if not forced
  if (!force) {
    const cachedWeek = await getSetting(admin, "bulletin_week", "")
    const cachedContent = await getSetting(admin, "bulletin_content", "")
    if (cachedWeek === currentWeekKey && cachedContent) {
      return NextResponse.json({ bulletin: cachedContent, cached: true, week: currentWeekKey })
    }
  }

  try {
    const bulletin = await generateBulletin(admin, todayStr)
    return NextResponse.json({ bulletin, cached: false, week: currentWeekKey })
  } catch (err: unknown) {
    console.error("[tablon/generate]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando tablón" },
      { status: 500 }
    )
  }
}
