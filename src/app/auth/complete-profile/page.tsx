/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      // Check user & existing profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email || '')
      // Pre-fill name from Google metadata
      const meta = user.user_metadata
      if (meta?.full_name) {
        const parts = meta.full_name.split(' ')
        setFirstName(parts[0] || '')
        if (parts.length > 1) setLastName(parts.slice(1).join(' '))
      } else if (meta?.name) {
        const parts = meta.name.split(' ')
        setFirstName(parts[0] || '')
        if (parts.length > 1) setLastName(parts.slice(1).join(' '))
      }
      if (meta?.first_name) setFirstName(meta.first_name)

      // Check if already has staff profile → redirect
      const res = await fetch('/api/auth/positions')
      const posData = await res.json()
      if (posData.positions) setPositions(posData.positions)

      // Check existing staff record using admin
      if (meta?.profile_completed) {
        router.push('/dashboard')
        return
      }

      // Check DB for existing staff record (safety net)
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      
      if (staff) {
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
      const data = await res.json()

      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error })
        setIsLoading(false)
        return
      }

      toast({ title: "✅ Perfil completado", description: "¡Bienvenido al sistema!" })
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Completa tu perfil</CardTitle>
          <CardDescription>
            Has iniciado sesión con Google. Necesitamos algunos datos más para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-email">Email</Label>
              <Input id="cp-email" value={email} disabled className="h-10 bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-name">Nombre *</Label>
                <Input id="cp-name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  required placeholder="Hugo" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-last">Primer apellido *</Label>
                <Input id="cp-last" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  required placeholder="García" className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-last2">Segundo apellido</Label>
                <Input id="cp-last2" value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)}
                  placeholder="López" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-phone">Teléfono</Label>
                <Input id="cp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="600 123 456" className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Puesto de trabajo *</Label>
              <Select onValueChange={setPositionId} value={positionId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecciona tu puesto de trabajo..." />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox id="cp-terms" checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)} />
              <Label htmlFor="cp-terms" className="text-xs text-muted-foreground cursor-pointer">
                He leído y acepto las condiciones de uso
              </Label>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/25" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar y continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
