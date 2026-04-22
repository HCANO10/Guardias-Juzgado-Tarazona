"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DSButton, DSCard } from "@/lib/design-system"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Shield, Link2, UserPlus, ChevronRight, CheckCircle2 } from "lucide-react"

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Position {
  id: string
  name: string
}

interface UnlinkedStaffMember {
  id: string
  first_name: string
  last_name: string
  second_last_name?: string | null
  email: string
  positions?: { name: string } | null
}

type Step =
  | 'checking'   // comprobando sesión / perfil existente
  | 'choose'     // ¿Ya tienes cuenta? Sí / No
  | 'link'       // selector de cuenta existente
  | 'link-confirm' // confirmación antes de vincular
  | 'new'        // formulario cuenta nueva
  | 'done'       // vinculación completada

// ── Componente ───────────────────────────────────────────────────────────────

export default function CompleteProfilePage() {
  // Estado del flujo
  const [step, setStep] = useState<Step>('checking')

  // Datos del usuario Google
  const [email, setEmail] = useState("")
  const [googleName, setGoogleName] = useState("")

  // Lista de staff sin vincular
  const [unlinkedStaff, setUnlinkedStaff] = useState<UnlinkedStaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [isLinkingLoading, setIsLinkingLoading] = useState(false)
  const [updateNameFromGoogle, setUpdateNameFromGoogle] = useState(false)

  // Formulario cuenta nueva
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [secondLastName, setSecondLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [positionId, setPositionId] = useState("")
  const [positions, setPositions] = useState<Position[]>([])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isNewLoading, setIsNewLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // ── Inicialización ──────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEmail(user.email || '')

      // Construir nombre visible desde metadata de Google
      const meta = user.user_metadata as Record<string, string> | undefined
      const gName = meta?.full_name || meta?.name || ''
      setGoogleName(gName)
      if (gName) {
        const parts = gName.trim().split(/\s+/)
        setFirstName(parts[0] || '')
        if (parts.length > 1) setLastName(parts.slice(1).join(' '))
      }
      if (meta?.first_name) setFirstName(meta.first_name)

      // ¿Ya tiene perfil vinculado?
      const { data: existing } = await supabase
        .from('staff')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (existing) {
        document.cookie = 'staff-profile-status=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        router.replace('/dashboard')
        return
      }

      // Cargar puestos y staff pendiente de vincular en paralelo
      const [posRes, unlRes] = await Promise.all([
        fetch('/api/auth/positions'),
        fetch('/api/auth/unlinked-staff'),
      ])
      const posData = await posRes.json() as { positions?: Position[] }
      const unlData = await unlRes.json() as { staff?: UnlinkedStaffMember[] }
      if (posData.positions) setPositions(posData.positions)
      const unlinked = unlData.staff ?? []
      if (unlData.staff) setUnlinkedStaff(unlinked)

      if (unlinked.length > 0) {
        // Existen perfiles pre-creados sin vincular → mostrar flujo de vinculación
        setStep('choose')
      } else {
        // No hay perfiles pendientes → flujo de nuevo registro
        setStep('new')
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Vincular cuenta existente ───────────────────────────────────────────

  const handleLink = async () => {
    if (!selectedStaffId) return
    setIsLinkingLoading(true)
    try {
      const res = await fetch('/api/auth/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: selectedStaffId, update_name: updateNameFromGoogle }),
      })
      const data = await res.json() as { error?: string; staff?: UnlinkedStaffMember }
      if (!res.ok) {
        toast({ variant: "destructive", title: "Error al vincular", description: data.error })
        return
      }
      setStep('done')
      setTimeout(() => { router.push('/dashboard'); router.refresh() }, 2000)
    } catch {
      toast({ variant: "destructive", title: "Error de red", description: "No se pudo conectar con el servidor" })
    } finally {
      setIsLinkingLoading(false)
    }
  }

  // ── Crear perfil nuevo ──────────────────────────────────────────────────

  const handleNewProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !positionId) {
      toast({ variant: "destructive", title: "Campos obligatorios", description: "Rellena nombre, primer apellido y puesto" })
      return
    }
    if (!acceptTerms) {
      toast({ variant: "destructive", title: "Acepta las condiciones", description: "Debes aceptar las condiciones de uso" })
      return
    }
    setIsNewLoading(true)
    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName, last_name: lastName,
          second_last_name: secondLastName || null,
          phone: phone || null, position_id: positionId,
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error })
        return
      }
      toast({ title: "Perfil completado", description: "¡Bienvenido al sistema!" })
      router.push('/dashboard'); router.refresh()
    } catch {
      toast({ variant: "destructive", title: "Error de red", description: "No se pudo conectar con el servidor" })
    } finally {
      setIsNewLoading(false)
    }
  }

  // ── Helpers de UI ───────────────────────────────────────────────────────

  const selectedStaff = unlinkedStaff.find(s => s.id === selectedStaffId)

  // ── Render ──────────────────────────────────────────────────────────────

  if (step === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4">
        <DSCard className="w-full max-w-md p-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-[24px] font-bold text-neutral-900 mb-2">¡Cuenta vinculada!</h1>
          <p className="text-[15px] text-[#86868B]">Tu cuenta de Google se ha asociado correctamente. Redirigiendo…</p>
        </DSCard>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4 py-8">
      <DSCard className="w-full max-w-lg p-0 overflow-hidden">
        <div className="h-1.5 bg-[#0066CC] w-full" />
        <div className="p-8">

          {/* ── PASO: elegir si tiene cuenta ── */}
          {step === 'choose' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-[14px] bg-[#0066CC] flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h1 className="text-[26px] font-bold text-neutral-900 tracking-tight">Bienvenido/a</h1>
                <p className="text-[14px] text-[#86868B] mt-1">Has iniciado sesión con Google como <strong>{email}</strong></p>
              </div>

              <div className="bg-[#F2F2F7]/60 rounded-[14px] p-4 text-center">
                <p className="text-[15px] font-semibold text-neutral-800">
                  ¿Ya tienes una cuenta creada en el sistema del juzgado?
                </p>
                <p className="text-[13px] text-[#86868B] mt-1">
                  El administrador puede haber creado tu perfil previamente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DSButton
                  variant="secondary"
                  className="h-14 flex-col gap-1 text-[13px]"
                  onClick={() => setStep('link')}
                  disabled={unlinkedStaff.length === 0}
                >
                  <Link2 className="h-5 w-5" />
                  Sí, vincular cuenta
                </DSButton>
                <DSButton
                  className="h-14 flex-col gap-1 text-[13px]"
                  onClick={() => setStep('new')}
                >
                  <UserPlus className="h-5 w-5" />
                  No, crear cuenta nueva
                </DSButton>
              </div>

              {unlinkedStaff.length === 0 && (
                <p className="text-center text-[12px] text-[#86868B]">
                  (No hay cuentas pendientes de vincular)
                </p>
              )}
            </div>
          )}

          {/* ── PASO: seleccionar cuenta a vincular ── */}
          {step === 'link' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-[22px] font-bold text-neutral-900">Selecciona tu perfil</h1>
                <p className="text-[13px] text-[#86868B] mt-1">
                  Elige tu nombre en la lista para vincular tu cuenta de Google.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">
                  Tu nombre en el sistema
                </Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]">
                    <SelectValue placeholder="Selecciona tu nombre..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                    {unlinkedStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                        {s.second_last_name ? ` ${s.second_last_name}` : ''}
                        {s.positions ? ` — ${(s.positions as { name: string }).name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStaffId && googleName && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-[12px] p-3">
                  <Checkbox
                    id="update-name"
                    checked={updateNameFromGoogle}
                    onCheckedChange={(v) => setUpdateNameFromGoogle(v === true)}
                  />
                  <Label htmlFor="update-name" className="text-[13px] text-neutral-700 cursor-pointer">
                    Actualizar nombre a <strong>{googleName}</strong> (de Google)
                  </Label>
                </div>
              )}

              <div className="flex gap-3">
                <DSButton variant="secondary" className="flex-1 h-11" onClick={() => setStep('choose')}>
                  Volver
                </DSButton>
                <DSButton
                  className="flex-1 h-11 gap-1.5"
                  disabled={!selectedStaffId}
                  onClick={() => setStep('link-confirm')}
                >
                  Continuar <ChevronRight className="h-4 w-4" />
                </DSButton>
              </div>
            </div>
          )}

          {/* ── PASO: confirmación ── */}
          {step === 'link-confirm' && selectedStaff && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-[22px] font-bold text-neutral-900">Confirma la vinculación</h1>
                <p className="text-[13px] text-[#86868B] mt-1">
                  Vas a asociar tu cuenta de Google a este perfil del juzgado.
                </p>
              </div>

              <div className="bg-[#F2F2F7]/70 rounded-[14px] p-5 space-y-3">
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#86868B]">Perfil seleccionado</span>
                  <span className="font-semibold text-neutral-900">
                    {selectedStaff.first_name} {selectedStaff.last_name}
                    {selectedStaff.second_last_name ? ` ${selectedStaff.second_last_name}` : ''}
                  </span>
                </div>
                {selectedStaff.positions && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#86868B]">Puesto</span>
                    <span className="font-semibold text-neutral-900">
                      {(selectedStaff.positions as { name: string }).name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[14px]">
                  <span className="text-[#86868B]">Email Google</span>
                  <span className="font-semibold text-neutral-900">{email}</span>
                </div>
                {updateNameFromGoogle && googleName && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#86868B]">Nuevo nombre</span>
                    <span className="font-semibold text-neutral-900">{googleName}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <DSButton variant="secondary" className="flex-1 h-11" onClick={() => setStep('link')}>
                  Volver
                </DSButton>
                <DSButton
                  className="flex-1 h-11 gap-1.5"
                  onClick={handleLink}
                  disabled={isLinkingLoading}
                >
                  {isLinkingLoading
                    ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Vinculando…</>
                    : <><CheckCircle2 className="h-4 w-4" />Confirmar y vincular</>
                  }
                </DSButton>
              </div>
            </div>
          )}

          {/* ── PASO: formulario cuenta nueva ── */}
          {step === 'new' && (
            <div>
              <div className="text-center mb-6">
                <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight">Completa tu perfil</h1>
                <p className="text-[13px] text-[#86868B] mt-1">
                  Sesión Google: <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleNewProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cp-name" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Nombre *</Label>
                    <Input id="cp-name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      required placeholder="Nombre" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cp-last" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Primer apellido *</Label>
                    <Input id="cp-last" value={lastName} onChange={(e) => setLastName(e.target.value)}
                      required placeholder="Apellido" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cp-last2" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Segundo apellido</Label>
                    <Input id="cp-last2" value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)}
                      placeholder="(opcional)" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cp-phone" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Teléfono</Label>
                    <Input id="cp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="600 123 456" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Puesto de trabajo *</Label>
                  <Select onValueChange={setPositionId} value={positionId}>
                    <SelectTrigger className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]">
                      <SelectValue placeholder="Selecciona tu puesto..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="cp-terms" checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)} />
                  <Label htmlFor="cp-terms" className="text-[13px] text-[#86868B] cursor-pointer">
                    He leído y acepto las condiciones de uso
                  </Label>
                </div>
                <div className="flex gap-3">
                  {unlinkedStaff.length > 0 && (
                    <DSButton type="button" variant="secondary" className="flex-1 h-12" onClick={() => setStep('choose')}>
                      Volver
                    </DSButton>
                  )}
                  <DSButton type="submit" className={`h-12 text-[15px] font-semibold ${unlinkedStaff.length > 0 ? 'flex-1' : 'w-full'}`} disabled={isNewLoading}>
                    {isNewLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : "Guardar y continuar"}
                  </DSButton>
                </div>
              </form>
            </div>
          )}

        </div>
      </DSCard>
    </div>
  )
}
