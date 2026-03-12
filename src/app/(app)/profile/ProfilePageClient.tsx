/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  User, 
  Shield, 
  Palmtree, 
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
  Globe
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { 
  DSCard, 
  DSBadge, 
  DSPageHeader, 
  DSSectionHeading, 
  DSButton 
} from "@/lib/design-system"
import { cn } from "@/lib/utils"

interface ProfilePageClientProps {
  staffData: any
  futureGuards: any[]
  totalGuards: number
  nextGuard: any | null
  vacations: any[]
  totalVacationDays: number
  nextVacation: any | null
}

export function ProfilePageClient({
  staffData,
  futureGuards,
  totalGuards,
  nextGuard,
  vacations,
  totalVacationDays,
  nextVacation,
}: ProfilePageClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

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

  // Google link state
  const [userIdentities, setUserIdentities] = useState<any[]>([])
  const [hasPassword, setHasPassword] = useState(true)

  useEffect(() => {
    const fetchIdentities = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserIdentities(user.identities || [])
        setHasPassword(user.identities?.some(i => i.provider === 'email') || false)
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
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
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
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast({ title: "Contraseña actualizada" })
      setNewPwd(""); setConfirmPwd("")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
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
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handleLinkGoogle = async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
      if (error) throw error
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al vincular", description: err.message })
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
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al desvincular", description: err.message })
    }
  }

  const handleCancelVacation = async (vacationId: string) => {
    const { error } = await supabase.from('vacations').delete().eq('id', vacationId)
    if (error) {
      toast({ variant: "destructive", title: "Error al cancelar" })
    } else {
      toast({ title: "Periodo cancelado" })
      router.refresh()
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
             <div className="bg-gradient-to-r from-[#0066CC] to-[#004C99] p-8 text-white relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
                  <div className="h-24 w-24 rounded-[32px] bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-[32px] font-black shadow-2xl">
                    {staffData.first_name[0]}{staffData.last_name[0]}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h2 className="text-[28px] font-extrabold tracking-tight">{staffData.first_name} {staffData.last_name}</h2>
                      <DSBadge variant="blue" className="bg-white/10 text-white border-white/20">Activo</DSBadge>
                    </div>
                    <p className="text-white/70 text-[16px] font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> {staffData.positions?.name || 'Personal'}
                    </p>
                  </div>
                  <DSButton 
                    variant="secondary" 
                    onClick={() => setEditOpen(true)}
                    className="md:ml-auto h-11 px-6 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                  </DSButton>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
             </div>
             
             <div className="p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-1.5 pt-1">
                   <p className="text-[11px] font-black uppercase tracking-widest text-[#86868B]">Correo Institucional</p>
                   <p className="text-[17px] font-bold text-neutral-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#0066CC]" /> {staffData.email}
                   </p>
                </div>
                <div className="space-y-1.5 pt-1 border-black/[0.04] md:border-l md:pl-8">
                   <p className="text-[11px] font-black uppercase tracking-widest text-[#86868B]">Fecha de Alta</p>
                   <p className="text-[17px] font-bold text-neutral-900 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#34C759]" /> 
                      {staffData.start_date ? format(new Date(staffData.start_date), "dd 'de' MMMM, yyyy", { locale: es }) : '—'}
                   </p>
                </div>
                {staffData.notes && (
                  <div className="md:col-span-2 p-5 bg-[#F2F2F7]/50 rounded-[20px] border border-black/[0.04] italic text-[14px] text-neutral-600">
                     "{staffData.notes}"
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
                      <h3 className="text-[18px] font-bold text-neutral-900">Seguridad</h3>
                      <p className="text-[12px] text-[#86868B]">Actualiza tu contraseña de acceso.</p>
                   </div>
                </div>
                
                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] px-1">Nueva Contraseña</label>
                      <Input 
                        type="password" 
                        value={newPwd}
                        onChange={e => setNewPwd(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] px-1">Confirmar Contraseña</label>
                      <Input 
                        type="password"
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
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
                      <h3 className="text-[18px] font-bold text-neutral-900">Correo Electrónico</h3>
                      <p className="text-[12px] text-[#86868B]">Cambia tu dirección institucional.</p>
                   </div>
                </div>
                
                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] px-1">Nuevo Email</label>
                      <Input 
                        type="email" 
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="nuevo@juzgado.local"
                        className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#86868B] px-1">Confirmar Email</label>
                      <Input 
                        type="email"
                        value={confirmEmail}
                        onChange={e => setConfirmEmail(e.target.value)}
                        className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
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
                      <h3 className="text-[18px] font-bold text-neutral-900">Cuentas Vinculadas</h3>
                      <p className="text-[12px] text-[#86868B]">Gestiona tus métodos de inicio de sesión social.</p>
                   </div>
                </div>
             </div>
             
             <div className="p-6 rounded-[24px] bg-[#F2F2F7]/50 border border-black/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-black/[0.04]">
                      <svg width="20" height="20" viewBox="0 0 18 18">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/>
                      </svg>
                   </div>
                   <div>
                      <p className="font-bold text-neutral-900 text-[16px]">Google Account</p>
                      <p className="text-[13px] text-[#86868B]">{googleIdentity ? "Vinculada correctamente" : "No vinculada"}</p>
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
              <div className="bg-neutral-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-2xl">
                 <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <DSIconBox icon={Activity} variant="indigo" className="bg-white/10 text-indigo-400" />
                       <p className="text-[11px] text-white/40 uppercase font-black tracking-widest">Global {new Date().getFullYear()}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 p-5 rounded-[24px] border border-white/10">
                          <p className="text-[11px] text-white/40 uppercase font-bold mb-1">Guardias</p>
                          <p className="text-[32px] font-bold">{totalGuards}</p>
                       </div>
                       <div className="bg-white/5 p-5 rounded-[24px] border border-white/10">
                          <p className="text-[11px] text-white/40 uppercase font-bold mb-1">Vacaciones</p>
                          <p className="text-[32px] font-bold text-[#34C759]">{totalVacationDays}</p>
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
                             {nextVacation ? format(new Date(nextVacation.start_date), 'dd/MM') : '—'}
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
                      {futureGuards.slice(0, 3).map((g, i) => (
                        <div key={i} className="bg-white rounded-[20px] p-4 border border-black/[0.04] flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-[#F2F2F7] rounded-[10px] flex items-center justify-center text-[12px] font-black text-[#0066CC]">
                                 {g.guard_periods?.week_number}
                              </div>
                              <p className="text-[14px] font-bold text-neutral-900">
                                 {format(new Date(g.guard_periods?.start_date), 'dd MMM', { locale: es })}
                              </p>
                           </div>
                           <ChevronRight className="h-4 w-4 text-black/10" />
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden max-w-md">
           <div className="bg-[#F2F2F7] p-8 border-b border-black/[0.04]">
              <DialogHeader>
                <DialogTitle className="text-[24px] font-extrabold text-neutral-900 tracking-tight">Editar Perfil</DialogTitle>
                <DialogDescription className="text-[15px] text-[#86868B] font-medium">Modifica tus datos personales públicos.</DialogDescription>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Nombre</label>
                    <Input 
                      value={editForm.first_name}
                      onChange={e => setEditForm(prev => ({...prev, first_name: e.target.value}))}
                      className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Apellidos</label>
                    <Input 
                      value={editForm.last_name}
                      onChange={e => setEditForm(prev => ({...prev, last_name: e.target.value}))}
                      className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" 
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Notas / Bio</label>
                 <Textarea 
                   value={editForm.notes}
                   onChange={e => setEditForm(prev => ({...prev, notes: e.target.value}))}
                   className="rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] p-4 text-[15px] min-h-[100px] resize-none" 
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
