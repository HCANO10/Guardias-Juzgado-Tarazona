export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import IntercambiosPageClient from "./IntercambiosPageClient"

export default async function IntercambiosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Get current staff member
  const { data: currentStaff } = await supabase
    .from("staff")
    .select("id, first_name, last_name, role")
    .eq("email", user.email!)
    .single()

  if (!currentStaff) redirect("/login")

  const isHeadmaster = currentStaff.role === "headmaster"

  // Fetch swap requests — headmaster sees all, worker sees only their own
  const query = supabase
    .from("guard_swap_requests")
    .select(
      `id, status, message, created_at,
       requester:staff!guard_swap_requests_requester_id_fkey(id, first_name, last_name),
       requested:staff!guard_swap_requests_requested_id_fkey(id, first_name, last_name),
       period_requester:guard_periods!guard_swap_requests_period_id_requester_fkey(week_number, start_date, end_date),
       period_requested:guard_periods!guard_swap_requests_period_id_requested_fkey(week_number, start_date, end_date)`
    )
    .order("created_at", { ascending: false })
    .limit(50)

  const filteredQuery = isHeadmaster
    ? query
    : query.or(`requester_id.eq.${currentStaff.id},requested_id.eq.${currentStaff.id}`)

  const { data: rawRequests } = await filteredQuery

  // Fetch my upcoming guard assignments so user can initiate a swap
  const today = new Date().toISOString().split("T")[0]
  const { data: myGuards } = await supabase
    .from("guard_assignments")
    .select(
      `guard_period_id,
       guard_periods!inner(id, week_number, start_date, end_date)`
    )
    .eq("staff_id", currentStaff.id)
    .gte("guard_periods.start_date", today)
    .order("guard_periods.start_date")
    .limit(10)

  // Fetch same-role staff for the swap dialog
  const { data: myStaffFull } = await supabase
    .from("staff")
    .select("id, positions(guard_role)")
    .eq("id", currentStaff.id)
    .single()

  type GuardRole = "auxilio" | "tramitador" | "gestor"
  type PositionsRow = { guard_role: GuardRole | null }
  const myRole = (myStaffFull as unknown as { positions: PositionsRow | null })
    ?.positions?.guard_role ?? null

  const { data: sameRoleStaff } = myRole
    ? await supabase
        .from("staff")
        .select("id, first_name, last_name, positions!inner(guard_role)")
        .eq("positions.guard_role", myRole)
        .eq("is_active", true)
        .neq("id", currentStaff.id)
    : { data: [] }

  type SwapRequestRaw = {
    id: string
    status: "pending" | "accepted" | "rejected" | "cancelled"
    message?: string | null
    created_at: string
    requester: { id: string; first_name: string; last_name: string }
    requested: { id: string; first_name: string; last_name: string }
    period_requester: { week_number: number; start_date: string; end_date: string }
    period_requested: { week_number: number; start_date: string; end_date: string }
  }

  type GuardPeriodInfo = {
    id: string
    week_number: number
    start_date: string
    end_date: string
  }

  type MyGuardRow = {
    guard_period_id: string
    guard_periods: GuardPeriodInfo
  }

  const requests = (rawRequests ?? []) as unknown as SwapRequestRaw[]
  const upcomingGuards = ((myGuards ?? []) as unknown as MyGuardRow[]).map(
    (g) => g.guard_periods
  )

  return (
    <IntercambiosPageClient
      currentStaffId={currentStaff.id}
      currentStaffName={`${currentStaff.first_name} ${currentStaff.last_name}`}
      isHeadmaster={isHeadmaster}
      requests={requests}
      upcomingGuards={upcomingGuards}
      sameRoleStaff={
        (sameRoleStaff ?? []) as { id: string; first_name: string; last_name: string }[]
      }
      myGuardRole={myRole ?? null}
    />
  )
}
