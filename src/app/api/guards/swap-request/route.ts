// POST /api/guards/swap-request
// Any authenticated worker can create a swap request.
// The headmaster can accept/execute directly from their admin panel;
// workers go through this request → accept/reject flow.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAuth } from "@/lib/auth/require-role"
import { validateBody } from "@/lib/validators/api"
import { guardSwapRequestCreateSchema } from "@/lib/validators/schemas"
import { sendEmail, swapRequestEmail } from "@/lib/email/send"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, guardSwapRequestCreateSchema)
  if (!validation.success) return validation.response

  const { periodIdRequester, staffIdRequested, periodIdRequested, message } =
    validation.data

  const admin = createAdminClient()

  try {
    // 1. Verify the requester actually has an assignment on their period
    const { data: myAssign } = await admin
      .from("guard_assignments")
      .select("id")
      .eq("guard_period_id", periodIdRequester)
      .eq("staff_id", auth.staffId)
      .single()

    if (!myAssign) {
      return NextResponse.json(
        { error: "No tienes una guardia asignada en esa semana" },
        { status: 400 }
      )
    }

    // 2. Verify the other person has an assignment on their period
    const { data: theirAssign } = await admin
      .from("guard_assignments")
      .select("id")
      .eq("guard_period_id", periodIdRequested)
      .eq("staff_id", staffIdRequested)
      .single()

    if (!theirAssign) {
      return NextResponse.json(
        { error: "El compañero no tiene guardia asignada en esa semana" },
        { status: 400 }
      )
    }

    // 3. Verify both are the same guard_role
    const { data: bothStaff } = await admin
      .from("staff")
      .select("id, first_name, last_name, email, positions(guard_role)")
      .in("id", [auth.staffId, staffIdRequested])

    if (!bothStaff || bothStaff.length !== 2) {
      return NextResponse.json(
        { error: "No se pudieron verificar los perfiles del personal" },
        { status: 400 }
      )
    }

    type StaffRow = {
      id: string
      first_name: string
      last_name: string
      email: string
      positions: { guard_role: string } | null
    }
    const typedStaff = bothStaff as unknown as StaffRow[]
    const me = typedStaff.find((s) => s.id === auth.staffId)!
    const them = typedStaff.find((s) => s.id === staffIdRequested)!

    if (
      !me?.positions?.guard_role ||
      me.positions.guard_role !== them?.positions?.guard_role
    ) {
      return NextResponse.json(
        {
          error:
            "Solo se puede intercambiar entre personas del mismo puesto de trabajo",
        },
        { status: 400 }
      )
    }

    // 4. Fetch period dates
    const { data: periods } = await admin
      .from("guard_periods")
      .select("id, week_number, start_date, end_date")
      .in("id", [periodIdRequester, periodIdRequested])

    type PeriodRow = {
      id: string
      week_number: number
      start_date: string
      end_date: string
    }
    const typedPeriods = (periods ?? []) as unknown as PeriodRow[]
    const myPeriod = typedPeriods.find((p) => p.id === periodIdRequester)!
    const theirPeriod = typedPeriods.find((p) => p.id === periodIdRequested)!

    // 5. Create the request record
    const { data: newRequest, error: insertError } = await admin
      .from("guard_swap_requests")
      .insert({
        requester_id: auth.staffId,
        requested_id: staffIdRequested,
        period_id_requester: periodIdRequester,
        period_id_requested: periodIdRequested,
        message: message ?? null,
        status: "pending",
      })
      .select("id")
      .single()

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Ya existe una solicitud pendiente para este intercambio" },
          { status: 409 }
        )
      }
      throw insertError
    }

    // 6. Send email notification to the requested person
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const formatDates = (p: PeriodRow) =>
      `${format(new Date(p.start_date + "T12:00:00"), "dd MMM", { locale: es })} – ${format(new Date(p.end_date + "T12:00:00"), "dd MMM", { locale: es })}`

    await sendEmail({
      to: them.email,
      subject: `${me.first_name} ${me.last_name} te solicita un intercambio de guardia`,
      html: swapRequestEmail({
        requesterName: `${me.first_name} ${me.last_name}`,
        requesterWeek: myPeriod.week_number,
        requesterDates: formatDates(myPeriod),
        requestedWeek: theirPeriod.week_number,
        requestedDates: formatDates(theirPeriod),
        message,
        actionUrl: `${appUrl}/profile`,
      }),
    })

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      message: "Solicitud enviada. Se ha notificado al compañero por email.",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno"
    console.error("[swap-request POST]", error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
