import { apiError } from '@/lib/validators/api'
export const dynamic = "force-dynamic"

// PATCH /api/guards/swap-request/[id]
// Accept, reject (requested person) or cancel (requester) a swap request.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAuth } from "@/lib/auth/require-role"
import { validateBody } from "@/lib/validators/api"
import { guardSwapRequestRespondSchema } from "@/lib/validators/schemas"
import { sendEmail, swapResponseEmail } from "@/lib/email/send"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params

  // Validar que el parámetro de ruta es un UUID válido antes de usarlo en DB
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'ID de solicitud inválido' }, { status: 400 })
  }

  const validation = await validateBody(request, guardSwapRequestRespondSchema)
  if (!validation.success) return validation.response

  const { action } = validation.data
  const admin = createAdminClient()

  try {
    // Fetch the swap request with all related data
    const { data: swapReq, error: fetchErr } = await admin
      .from("guard_swap_requests")
      .select(
        `id, status,
         requester_id, requested_id,
         period_id_requester, period_id_requested,
         message`
      )
      .eq("id", id)
      .single()

    if (fetchErr || !swapReq) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      )
    }

    if (swapReq.status !== "pending") {
      return NextResponse.json(
        { error: `La solicitud ya está en estado "${swapReq.status}"` },
        { status: 409 }
      )
    }

    const isRequester = swapReq.requester_id === auth.staffId
    const isRequested = swapReq.requested_id === auth.staffId
    const isHeadmaster = auth.role === "headmaster" || auth.role === "admin"

    // Authorization per action
    if (action === "cancel" && !isRequester && !isHeadmaster) {
      return NextResponse.json(
        { error: "Solo quien envió la solicitud puede cancelarla" },
        { status: 403 }
      )
    }
    if (
      (action === "accept" || action === "reject") &&
      !isRequested &&
      !isHeadmaster
    ) {
      return NextResponse.json(
        { error: "Solo el destinatario puede aceptar o rechazar la solicitud" },
        { status: 403 }
      )
    }

    // ── ACCEPT: execute the swap ───────────────────────────────
    if (action === "accept") {
      // Verify assignments still exist
      const { data: assign1 } = await admin
        .from("guard_assignments")
        .select("id")
        .eq("guard_period_id", swapReq.period_id_requester)
        .eq("staff_id", swapReq.requester_id)
        .single()

      const { data: assign2 } = await admin
        .from("guard_assignments")
        .select("id")
        .eq("guard_period_id", swapReq.period_id_requested)
        .eq("staff_id", swapReq.requested_id)
        .single()

      if (!assign1 || !assign2) {
        // Mark as cancelled since assignments no longer exist
        await admin
          .from("guard_swap_requests")
          .update({ status: "cancelled" })
          .eq("id", id)
        return NextResponse.json(
          {
            error:
              "No se puede ejecutar el intercambio: alguna de las asignaciones ya no existe",
          },
          { status: 400 }
        )
      }

      // Swap staff_id values
      const { error: upd1 } = await admin
        .from("guard_assignments")
        .update({ staff_id: swapReq.requested_id, assigned_by: "manual" })
        .eq("id", assign1.id)

      const { error: upd2 } = await admin
        .from("guard_assignments")
        .update({ staff_id: swapReq.requester_id, assigned_by: "manual" })
        .eq("id", assign2.id)

      if (upd1 || upd2) {
        throw new Error("Error al actualizar las asignaciones")
      }
    }

    // ── UPDATE REQUEST STATUS ─────────────────────────────────
    const newStatus =
      action === "accept"
        ? "accepted"
        : action === "reject"
        ? "rejected"
        : "cancelled"

    await admin
      .from("guard_swap_requests")
      .update({ status: newStatus })
      .eq("id", id)

    // ── LOG ───────────────────────────────────────────────────
    try {
      await admin.from("activity_log").insert({
        action: `guard_swap_request_${newStatus}`,
        entity_type: "guard_swap_request",
        entity_id: id,
        details: {
          requesterId: swapReq.requester_id,
          requestedId: swapReq.requested_id,
          periodIdRequester: swapReq.period_id_requester,
          periodIdRequested: swapReq.period_id_requested,
        },
        performed_by: auth.staffId,
      })
    } catch (logErr) {
      console.warn("[swap-request] activity_log failed:", logErr)
    }

    // ── EMAIL NOTIFICATION TO REQUESTER (only on accept/reject) ─
    if (action === "accept" || action === "reject") {
      try {
        type StaffRow = {
          id: string
          first_name: string
          last_name: string
          email: string
        }
        type PeriodRow = {
          id: string
          week_number: number
          start_date: string
          end_date: string
        }

        const { data: staffRows } = await admin
          .from("staff")
          .select("id, first_name, last_name, email")
          .in("id", [swapReq.requester_id, swapReq.requested_id])

        const { data: periodRows } = await admin
          .from("guard_periods")
          .select("id, week_number, start_date, end_date")
          .in("id", [swapReq.period_id_requester, swapReq.period_id_requested])

        const typedStaff = (staffRows ?? []) as unknown as StaffRow[]
        const typedPeriods = (periodRows ?? []) as unknown as PeriodRow[]

        const requester = typedStaff.find((s) => s.id === swapReq.requester_id)!
        const requested = typedStaff.find((s) => s.id === swapReq.requested_id)!
        const myPeriod = typedPeriods.find(
          (p) => p.id === swapReq.period_id_requester
        )!
        const theirPeriod = typedPeriods.find(
          (p) => p.id === swapReq.period_id_requested
        )!

        const formatDates = (p: PeriodRow) =>
          `${format(new Date(p.start_date + "T12:00:00"), "dd MMM", { locale: es })} – ${format(new Date(p.end_date + "T12:00:00"), "dd MMM", { locale: es })}`

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

        await sendEmail({
          to: requester.email,
          subject: `Tu solicitud de intercambio ha sido ${action === "accept" ? "aceptada" : "rechazada"}`,
          html: swapResponseEmail({
            requestedName: `${requested.first_name} ${requested.last_name}`,
            accepted: action === "accept",
            requesterWeek: myPeriod.week_number,
            requesterDates: formatDates(myPeriod),
            requestedWeek: theirPeriod.week_number,
            requestedDates: formatDates(theirPeriod),
            actionUrl: `${appUrl}/profile`,
          }),
        })
      } catch (emailErr) {
        console.warn("[swap-request] email notification failed:", emailErr)
      }
    }

    const messages: Record<string, string> = {
      accepted: "Intercambio aceptado y aplicado correctamente",
      rejected: "Solicitud rechazada",
      cancelled: "Solicitud cancelada",
    }

    return NextResponse.json({
      success: true,
      message: messages[newStatus],
    })
  } catch (error: unknown) {
    console.error("[swap-request PATCH]", error)
    return apiError(error)
  }
}
