"use client"

import { useState } from "react"
import { ArrowLeftRight, Plus } from "lucide-react"
import {
  DSPageHeader,
  DSButton,
  DSCard,
  DSEmptyState,
} from "@/lib/design-system"
import { SwapRequestsPanel } from "@/components/guards/SwapRequestsPanel"
import type { SwapRequest } from "@/components/guards/SwapRequestsPanel"
import { GuardSwapDialog } from "@/components/guards/GuardSwapDialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface GuardPeriodInfo {
  id: string
  week_number: number
  start_date: string
  end_date: string
}

interface IntercambiosPageClientProps {
  currentStaffId: string
  currentStaffName: string
  isHeadmaster: boolean
  requests: SwapRequest[]
  upcomingGuards: GuardPeriodInfo[]
  sameRoleStaff: { id: string; first_name: string; last_name: string }[]
  myGuardRole: "auxilio" | "tramitador" | "gestor" | null
}

export default function IntercambiosPageClient({
  currentStaffId,
  currentStaffName,
  isHeadmaster,
  requests,
  upcomingGuards,
  sameRoleStaff,
  myGuardRole,
}: IntercambiosPageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")

  const selectedGuard = upcomingGuards.find((g) => g.id === selectedPeriodId)

  const hasRequests =
    requests.length > 0

  const canRequestSwap =
    !isHeadmaster &&
    upcomingGuards.length > 0 &&
    sameRoleStaff.length > 0 &&
    myGuardRole !== null

  return (
    <div className="space-y-8 pb-16">
      <DSPageHeader
        title="Intercambios de Guardia"
        subtitle={
          isHeadmaster
            ? "Gestión de todas las solicitudes de intercambio"
            : "Solicita o gestiona tus intercambios de guardia"
        }
        actions={
          canRequestSwap ? (
            <DSButton
              variant="primary"
              onClick={() => {
                if (!selectedPeriodId && upcomingGuards.length > 0) {
                  setSelectedPeriodId(upcomingGuards[0].id)
                }
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Solicitar Intercambio
            </DSButton>
          ) : undefined
        }
      />

      {/* Guard selector + action button for workers */}
      {canRequestSwap && (
        <DSCard padding="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-700 mb-1">
                Selecciona tu guardia para solicitar un intercambio
              </p>
              <Select
                value={selectedPeriodId}
                onValueChange={setSelectedPeriodId}
              >
                <SelectTrigger className="h-10 rounded-[10px] w-full sm:max-w-xs">
                  <SelectValue placeholder="Elige una semana de guardia" />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  {upcomingGuards.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      Sem. {g.week_number} ·{" "}
                      {format(parseISO(g.start_date), "dd MMM", { locale: es })} –{" "}
                      {format(parseISO(g.end_date), "dd MMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DSButton
              variant="primary"
              disabled={!selectedPeriodId}
              onClick={() => setDialogOpen(true)}
              className="shrink-0"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Solicitar intercambio
            </DSButton>
          </div>
        </DSCard>
      )}

      {!canRequestSwap && !isHeadmaster && upcomingGuards.length === 0 && (
        <DSCard padding="p-6">
          <p className="text-[14px] text-slate-500 text-center">
            No tienes guardias próximas asignadas para solicitar un intercambio.
          </p>
        </DSCard>
      )}

      {/* Swap Requests Panel */}
      {hasRequests ? (
        <SwapRequestsPanel
          currentStaffId={currentStaffId}
          requests={requests}
        />
      ) : (
        <DSEmptyState
          icon={ArrowLeftRight}
          title="Sin solicitudes de intercambio"
          description={
            isHeadmaster
              ? "No hay solicitudes de intercambio registradas todavía."
              : "No tienes solicitudes de intercambio enviadas o recibidas todavía."
          }
        />
      )}

      {/* Guard Swap Dialog */}
      {selectedGuard && myGuardRole && (
        <GuardSwapDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          periodId={selectedGuard.id}
          weekNumber={selectedGuard.week_number}
          currentStaffId={currentStaffId}
          currentStaffName={currentStaffName}
          role={myGuardRole}
          sameRoleStaff={sameRoleStaff}
        />
      )}
    </div>
  )
}
