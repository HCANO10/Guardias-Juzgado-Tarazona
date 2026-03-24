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
import { Loader2, Shield } from "lucide-react"

interface Position {
  id: string
  name: string
}

export default function CompleteProfilePage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [secondLastName, setSecondLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [positionId, setPositionId] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [email, setEmail] = useState("")
  const [positions, setPositions] = useState<Position[]>([])

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email || '')
      const meta = user.user_metadata
      if (meta?.full_name) {
        const parts = (meta.full_name as string).split(' ')
        setFirstName(parts[0] || '')
        if (parts.length > 1) setLastName(parts.slice(1).join(' '))
      } else if (meta?.name) {
        const parts = (meta.name as string).split(' ')
        setFirstName(parts[0] || '')
        if (parts.length > 1) setLastName(parts.slice(1).join(' '))
      }
      if (meta?.first_name) setFirstName(meta.first_name as string)

      const res = await fetch('/api/auth/positions')
      const posData = await res.json() as { positions?: Position[] }
      if (posData.positions) setPositions(posData.positions)

      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (staff) {
        document.cookie = 'staff-profile-status=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        router.push('/dashboard')
        return
      }

      setIsCheckingProfile(false)
    }
    init()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName || !lastName || !positionId) {
      toast({ variant: "destructive", title: "Campos obligatorios", description: "Rellena nombre, primer apellido y puesto" })
      return
    }
    if (!acceptTerms) {
      toast({ variant: "destructive", title: "Acepta las condiciones", description: "Debes aceptar las condiciones de uso" })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          second_last_name: secondLastName || null,
          phone: phone || null,
          position_id: positionId,
        }),
      })
      const data = await res.json() as { error?: string }

      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error })
        setIsLoading(false)
        return
      }

      toast({ title: "Perfil completado", description: "Bienvenido al sistema!" })
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast({ variant: "destructive", title: "Error de red", description: "No se pudo conectar con el servidor" })
      setIsLoading(false)
    }
  }

  if (isCheckingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4 py-8">
      <DSCard className="w-full max-w-lg p-0 overflow-hidden">
        <div className="h-1.5 bg-[#0066CC] w-full" />
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-[14px] bg-[#0066CC] flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight">Completa tu perfil</h1>
            <p className="text-[15px] text-[#86868B] mt-2">
              Has iniciado sesión con Google. Necesitamos algunos datos más para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="cp-email" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Email</Label>
              <Input id="cp-email" value={email} disabled className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-name" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Nombre *</Label>
                <Input id="cp-name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  required placeholder="Hugo" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-last" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Primer apellido *</Label>
                <Input id="cp-last" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  required placeholder="García" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-last2" className="text-[12px] font-bold uppercase tracking-wider text-[#86868B]">Segundo apellido</Label>
                <Input id="cp-last2" value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)}
                  placeholder="López" className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white" />
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
                  <SelectValue placeholder="Selecciona tu puesto de trabajo..." />
                </SelectTrigger>
                <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="cp-terms" checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)} />
              <Label htmlFor="cp-terms" className="text-[13px] text-[#86868B] cursor-pointer">
                He leído y acepto las condiciones de uso
              </Label>
            </div>
            <DSButton type="submit" className="w-full h-12 text-[15px] font-semibold mt-2" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar y continuar"}
            </DSButton>
          </form>
        </div>
      </DSCard>
    </div>
  )
}
