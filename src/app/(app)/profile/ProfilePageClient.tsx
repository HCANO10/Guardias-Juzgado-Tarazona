"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Mail,
  Briefcase,
  CalendarDays,
  Edit,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronRight,
  Lock,
  Globe,
  ArrowLeftRight
} from "lucide-react"
import { format, differenceInDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { GuardSwapDialog } from "@/components/guards/GuardSwapDialog"
import { SwapRequestsPanel } from "@/components/guards/SwapRequestsPanel"
import type { SwapRequest } from "@/components/guards/SwapRequestsPanel"
import {
  DSCard,
  DSBadge,
  DSIconBox,
  DSPageHeader,
  DSSectionHeading,
  DSButton
} from "@/lib/design-system"
import { cn } from "@/lib/utils"

interface StaffData {
  id: string
  first_name: string
  last_name: string
  email: string
  start_date: string
  notes?: string
  positions?: { name: string }
}

interface FutureGuard {
  id: string
  guard_period_id: string
  guard_periods?: {
    week_number: number
    start_date: string
    end_date: string
  } | null
}

interface VacationRecord {
  id: string
  start_date: string
  end_date: string
  status: string
  notes?: string
}

// Use Supabase's own UserIdentity type for compatibility with unlinkIdentity()
type UserIdentity = { provider: string; id: string; identity_id: string; user_id: string; [key: string]: unknown }

interface ProfilePageClientProps {
  staffData: StaffData
  futureGuards: FutureGuard[]
  totalGuards: number
  nextGuard: FutureGuard | null
  vacations: VacationRecord[]
  vacacionesPendientesDias: number
  vacacionesAsignadasDias: number
  vacacionesGastadasDias: number
  nextVacation: VacationRecord | null
  sameRoleStaff: { id: string; first_name: string; last_name: string }[]
  guardRole: 'auxilio' | 'tramitador' | 'gestor' | null
  swapRequests: SwapRequest[]
}

export function ProfilePageClient({
  staffData,
  futureGuards,
  totalGuards,
  nextGuard,
  vacations,
  vacacionesPendientesDias,
  vacacionesAsignadasDias,
  vacacionesGastadasDias,
  nextVacation,
  sameRoleStaff,
  guardRole,
  swapRequests,
}: ProfilePageClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Swap dialog state
  const [swapDialog, setSwapDialog] = useState<{
    open: boolean
    periodId: string
    weekNumber: number
  }>({ open: false, periodId: '', weekNumber: 0 })

  // Personal data edit
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: staffData.first_name,
    last_name: staffData.last_name,
    notes: staffData.notes || "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Password change
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [changingPwd, setChangingPwd] = useState(false)

  // Email change
  const [newEmail, setNewEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [updatingEmail, setUpdatingEmail] = useState(false)

  // Vacation cancel
  const [cancellingVacation, setCancellingVacation] = useState<string | null>(null)

  // Google link state
  const [userIdentities, setUserIdentities] = useState<UserIdentity[]>([])
  const [hasPassword, setHasPassword] = useState(true)

  useEffect(() => {
    const fetchIdentities = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const identities = (user.identities || []).map(i => ({
          provider: i.provider,
          id: i.id,
          identity_id: i.identity_id,
          user_id: i.user_id,
        }))
        setUserIdentities(identities as UserIdentity[])
        setHasPassword(identities.some(i => i.provider === 'email'))
      }
    }
    fetchIdentities()
  }, [supabase.auth])

  const googleIdentity = userIdentities.find(i => i.provider === 'google')

  const handleSaveProfile = async () => {
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          notes: editForm.notes || null,
        })
        .eq('id', staffData.id)

      if (error) throw error
      toast({ title: "Perfil actualizado correctamente" })
      setEditOpen(false)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPwd.length < 8) {
      toast({ variant: "destructive", title: "Mínimo 8 caracteres" })
      return
    }
    if (newPwd !== confirmPwd) {
      toast({ variant: "destructive", title: "Las contraseñas no coinciden" })
      return
    }
    setChangingPwd(true)
    try {
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPwd }),
      })
      const result = await resp.json() as { error?: string }
      if (!resp.ok) throw new Error(result.error)
      toast({ title: "Contraseña actualizada", description: "Te hemos enviado un aviso a tu correo." })
      setNewPwd(""); setConfirmPwd("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      setChangingPwd(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail !== confirmEmail) return
    setUpdatingEmail(true)
    try {
      const resp = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail })
      })
      const result = await resp.json()
      if (!resp.ok) throw new Error(result.error)
      toast({ title: "Email actualizado" })
      setNewEmail(""); setConfirmEmail("")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handleLinkGoogle = async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al vincular", description: message })
    }
  }

  const handleUnlinkGoogle = async () => {
    if (!hasPassword && userIdentities.length === 1) {
      toast({ variant: "destructive", title: "Acción bloqueada", description: "Establece una contraseña primero." })
      return
    }
    if (!googleIdentity) return
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (error) throw error
      toast({ title: "Cuenta desvinculada" })
      setUserIdentities(prev => prev.filter(i => i.provider !== 'google'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error al desvincular", description: message })
    }
  }

  const handleCancelVacation = async (vacationId: string) => {
    setCancellingVacation(vacationId)
    try {
      const { error } = await supabase
        .from('vacations')
        .update({ status: 'cancelled' })
        .eq('id', vacationId)
      if (error) throw error
      toast({ title: "Periodo de ausencia anulado" })
      router.refresh()
    } catch {
      toast({ variant: "destructive", title: "Error al anular el periodo" })
    } finally {
      setCancellingVacation(null)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader 
          title="Configuración de Perfil" 
          subtitle="Gestiona tu identidad, credenciales de acceso y preferencias del sistema."
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Left Column: Data & Stats */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Main Info Card */}
          <DSCard className="overflow-hidden p-0">
             <div className="bg-gradient-to-r from-[#0066CC] to-[#004C99] p-5 sm:p-8 text-white relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-[28px] md:rounded-[32px] bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-[28px] md:text-[32px] font-black shadow-2xl flex-shrink-0">
                    {staffData.first_name[0]}{staffData.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl md:text-[28px] font-extrabold tracking-tight truncate">{staffData.first_name} {staffData.last_name}</h2>
                      <DSBadge variant="blue" className="bg-white/10 text-white border-white/20 shrink-0">Activo</DSBadge>
                    </div>
                    <p className="text-white/70 text-[14px] md:text-[16px] font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 shrink-0" /> {staffData.positions?.name || 'Personal'}
                    </p>
                  </div>
                  <DSButton
                    variant="secondary"
                    onClick={() => setEditOpen(true)}
                    className="self-start md:ml-auto h-10 md:h-11 px-4 md:px-6 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                  </DSButton>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
             </div>
             
             <div className="p-5 md:p-8 grid md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-1.5 pt-1">
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Correo Institucional</p>
                   <p className="text-[15px] md:text-[17px] font-bold text-slate-800 flex items-center gap-2 break-all">
                      <Mail className="h-4 w-4 text-[#60A5FA] shrink-0" /> <span className="min-w-0 truncate">{staffData.email}</span>
                   </p>
                </div>
                <div className="space-y-1.5 pt-1 border-slate-100 md:border-l md:pl-8">
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Fecha de Alta</p>
                   <p className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-400" />
                      {staffData.start_date ? format(parseISO(staffData.start_date), "dd 'de' MMMM, yyyy", { locale: es }) : '—'}
                   </p>
                </div>
                {staffData.notes && (
                  <div className="md:col-span-2 p-5 bg-slate-50 rounded-[20px] border border-slate-200 italic text-[14px] text-slate-600">
                     &ldquo;{staffData.notes}&rdquo;
                  </div>
                )}
             </div>
          </DSCard>

          {/* Grid for forms */}
          <div className="grid gap-10 md:grid-cols-2">
             {/* Security Card */}
             <DSCard>
                <div className="flex items-center gap-3 mb-8">
                   <DSIconBox icon={Lock} variant="blue" />
                   <div>
                      <h3 className="text-[18px] font-bold text-slate-900">Seguridad</h3>
                      <p className="text-[12px] text-slate-500">Actualiza tu contraseña de acceso.</p>
                   </div>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">Nueva Contraseña</label>
                      <Input
                        type="password"
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="h-11 rounded-[12px] bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 text-[15px]"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">Confirmar Contraseña</label>
                      <Input
                        type="password"
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="h-11 rounded-[12px] bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 text-[15px]"
                      />
                   </div>
                   {newPwd && confirmPwd && newPwd !== confirmPwd && (
                     <div className="flex items-center gap-2 text-red-600 text-[12px] font-bold px-1">
                        <AlertCircle className="h-3 w-3" /> No coinciden
                     </div>
                   )}
                   <DSButton 
                     onClick={handleChangePassword} 
                     disabled={changingPwd || !newPwd}
                     className="w-full h-11 mt-4"
                   >
                     {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar Contraseña"}
                   </DSButton>
                </div>
             </DSCard>

             {/* Email Card */}
             <DSCard>
                <div className="flex items-center gap-3 mb-8">
                   <DSIconBox icon={Globe} variant="indigo" />
                   <div>
                      <h3 className="text-[18px] font-bold text-slate-900">Correo Electrónico</h3>
                      <p className="text-[12px] text-slate-500">Cambia tu dirección institucional.</p>
                   </div>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">Nuevo Email</label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="nuevo@juzgado.local"
                        className="h-11 rounded-[12px] bg-white border-slate-200 text-slate-800 text-[15px]"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">Confirmar Email</label>
                      <Input
                        type="email"
                        value={confirmEmail}
                        onChange={e => setConfirmEmail(e.target.value)}
                        className="h-11 rounded-[12px] bg-white border-slate-200 text-slate-800 text-[15px]"
                      />
                   </div>
                   <DSButton 
                     onClick={handleUpdateEmail} 
                     disabled={updatingEmail || !newEmail || newEmail !== confirmEmail}
                     className="w-full h-11 mt-4"
                   >
                     {updatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar Correo"}
                   </DSButton>
                </div>
             </DSCard>
          </div>

          {/* Connected Accounts */}
          <DSCard>
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <DSIconBox icon={CheckCircle2} variant="green" />
                   <div>
                      <h3 className="text-[18px] font-bold text-slate-900">Cuentas Vinculadas</h3>
                      <p className="text-[12px] text-slate-500">Gestiona tus métodos de inicio de sesión social.</p>
                   </div>
                </div>
             </div>

             <div className="p-4 md:p-6 rounded-[24px] bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200">
                      <svg width="20" height="20" viewBox="0 0 18 18">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/>
                      </svg>
                   </div>
                   <div>
                      <p className="font-bold text-slate-900 text-[16px]">Google Account</p>
                      <p className="text-[13px] text-slate-500">{googleIdentity ? "Vinculada correctamente" : "No vinculada"}</p>
                   </div>
                </div>
                {googleIdentity ? (
                  <DSButton variant="secondary" className="bg-red-50 text-red-600 border-none hover:bg-red-600 hover:text-white" onClick={handleUnlinkGoogle}>
                     Desvincular
                  </DSButton>
                ) : (
                  <div onClick={handleLinkGoogle}>
                    <GoogleButton label="Vincular con Google" />
                  </div>
                )}
             </div>
          </DSCard>
        </div>

        {/* Right Column: Summaries & History */}
        <div className="lg:col-span-4 space-y-10">
           <div className="lg:sticky lg:top-12 space-y-10">
              
              {/* Annual Stats */}
              <div style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }} className="rounded-[32px] p-5 md:p-8 text-white relative overflow-hidden group shadow-2xl">
                 <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <DSIconBox icon={Activity} variant="indigo" className="bg-white/10 text-indigo-400" />
                       <p className="text-[11px] text-white/40 uppercase font-black tracking-widest">Global {new Date().getFullYear()}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 p-5 rounded-[24px] border border-white/10 col-span-2">
                          <p className="text-[11px] text-white/40 uppercase font-bold mb-1">Guardias este año</p>
                          <p className="text-[32px] font-bold">{totalGuards}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="bg-white/5 p-4 rounded-[20px] border border-white/10 text-center">
                          <p className="text-[9px] text-amber-300/80 uppercase font-bold mb-1 leading-tight">Pend. asignar</p>
                          <p className="text-[24px] font-bold text-amber-300">{vacacionesPendientesDias}</p>
                          <p className="text-[9px] text-white/30 font-medium">días</p>
                       </div>
                       <div className="bg-white/5 p-4 rounded-[20px] border border-white/10 text-center">
                          <p className="text-[9px] text-blue-300/80 uppercase font-bold mb-1 leading-tight">Asignadas</p>
                          <p className="text-[24px] font-bold text-blue-300">{vacacionesAsignadasDias}</p>
                          <p className="text-[9px] text-white/30 font-medium">días</p>
                       </div>
                       <div className="bg-white/5 p-4 rounded-[20px] border border-white/10 text-center">
                          <p className="text-[9px] text-emerald-300/80 uppercase font-bold mb-1 leading-tight">Gastadas</p>
                          <p className="text-[24px] font-bold text-emerald-300">{vacacionesGastadasDias}</p>
                          <p className="text-[9px] text-white/30 font-medium">días</p>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4">
                       <div className="flex items-center justify-between text-[14px]">
                          <span className="text-white/40 font-bold uppercase text-[10px] tracking-wider">Próxima Guardia</span>
                          <span className="font-black text-blue-400">{nextGuard ? `Sem. ${nextGuard.guard_periods?.week_number}` : '—'}</span>
                       </div>
                       <div className="flex items-center justify-between text-[14px]">
                          <span className="text-white/40 font-bold uppercase text-[10px] tracking-wider">Siguiente Salida</span>
                          <span className="font-black text-green-400">
                             {nextVacation ? format(parseISO(nextVacation.start_date), 'dd/MM') : '—'}
                          </span>
                       </div>
                    </div>
                 </div>
                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
              </div>

              {/* Quick History List */}
              <div className="space-y-4">
                 <DSSectionHeading className="px-2">Guardias Futuras</DSSectionHeading>
                 {futureGuards.length === 0 ? (
                   <p className="text-[14px] text-[#86868B] px-2 italic">Sin asignaciones próximas.</p>
                 ) : (
                   <div className="space-y-3">
                      {futureGuards.slice(0, 5).map((g, i) => (
                        <div key={i} className="bg-white rounded-[20px] p-4 border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-indigo-50 rounded-[10px] flex items-center justify-center text-[12px] font-black text-indigo-700">
                                 {g.guard_periods?.week_number ?? '—'}
                              </div>
                              <div>
                                <p className="text-[14px] font-bold text-slate-800">
                                   {g.guard_periods?.start_date ? format(parseISO(g.guard_periods.start_date), 'dd MMM', { locale: es }) : '—'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium">Sem. {g.guard_periods?.week_number ?? '—'}</p>
                              </div>
                           </div>
                           {guardRole && sameRoleStaff.length > 0 ? (
                             <button
                               onClick={() => setSwapDialog({ open: true, periodId: g.guard_period_id, weekNumber: g.guard_periods?.week_number ?? 0 })}
                               className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                               title="Solicitar intercambio"
                             >
                               <ArrowLeftRight className="h-3.5 w-3.5" />
                             </button>
                           ) : (
                             <ChevronRight className="h-4 w-4 text-slate-200" />
                           )}
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Swap Requests Panel — full width below the two-column grid */}
      {swapRequests.length > 0 && (
        <SwapRequestsPanel
          currentStaffId={staffData.id}
          requests={swapRequests}
        />
      )}

      {/* Guard Swap Dialog */}
      {guardRole && (
        <GuardSwapDialog
          open={swapDialog.open}
          onOpenChange={(v) => setSwapDialog(prev => ({ ...prev, open: v }))}
          periodId={swapDialog.periodId}
          weekNumber={swapDialog.weekNumber}
          currentStaffId={staffData.id}
          currentStaffName={`${staffData.first_name} ${staffData.last_name}`}
          role={guardRole}
          sameRoleStaff={sameRoleStaff}
        />
      )}

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-[95vw] md:max-w-md bg-white">
           <div className="bg-slate-50 p-8 border-b border-slate-100">
              <DialogHeader>
                <DialogTitle className="text-[24px] font-bold text-slate-900 tracking-tight">Editar Perfil</DialogTitle>
                <DialogDescription className="text-[15px] text-slate-500 font-medium">Modifica tus datos personales públicos.</DialogDescription>
              </DialogHeader>
           </div>

           <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-500 px-1">Nombre</label>
                    <Input
                      value={editForm.first_name}
                      onChange={e => setEditForm(prev => ({...prev, first_name: e.target.value}))}
                      className="h-11 rounded-[12px] bg-white border-slate-200 text-slate-800 text-[15px]"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-500 px-1">Apellidos</label>
                    <Input
                      value={editForm.last_name}
                      onChange={e => setEditForm(prev => ({...prev, last_name: e.target.value}))}
                      className="h-11 rounded-[12px] bg-white border-slate-200 text-slate-800 text-[15px]"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-black uppercase text-slate-500 px-1">Notas / Bio</label>
                 <Textarea
                   value={editForm.notes}
                   onChange={e => setEditForm(prev => ({...prev, notes: e.target.value}))}
                   className="rounded-[12px] bg-white border-slate-200 p-4 text-slate-800 text-[15px] min-h-[100px] resize-none"
                   placeholder="Escribe algo sobre ti..."
                 />
              </div>
           </div>

           <DialogFooter className="p-8 pt-0 gap-3">
              <DSButton variant="secondary" onClick={() => setEditOpen(false)} className="flex-1 h-12">Cancelar</DSButton>
              <DSButton onClick={handleSaveProfile} disabled={savingEdit} className="flex-1 h-12">
                 {savingEdit ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar Cambios"}
              </DSButton>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
