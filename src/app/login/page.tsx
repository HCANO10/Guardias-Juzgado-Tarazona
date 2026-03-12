/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { AuthDivider } from "@/components/auth/AuthDivider"
import { Loader2, Shield, Eye, EyeOff } from "lucide-react"

interface Position {
  id: string
  name: string
  guard_role: string | null
  requires_guard: boolean
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("login")
  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  // Register state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [secondLastName, setSecondLastName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("")
  const [positionId, setPositionId] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [isRegLoading, setIsRegLoading] = useState(false)
  const [positions, setPositions] = useState<Position[]>([])

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  // Clear stale cookies on mount
  useEffect(() => {
    document.cookie = 'staff-profile-status=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    
    if (searchParams.get('error') === 'auth') {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: 'No se pudo completar el inicio de sesión con Google.',
      })
    }
  }, [searchParams, toast])

  // Load positions on mount
  useEffect(() => {
    async function loadPositions() {
      try {
        const res = await fetch('/api/auth/positions')
        const data = await res.json()
        if (data.positions) setPositions(data.positions)
      } catch {
        console.error('Error cargando puestos')
      }
    }
    loadPositions()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoginLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      toast({
        title: "Error de autenticación",
        description: "Email o contraseña incorrectos. Inténtalo de nuevo.",
        variant: "destructive",
      })
      setIsLoginLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // Frontend validations
    if (!firstName || !lastName || !regEmail || !regPassword || !positionId) {
      toast({ variant: "destructive", title: "Campos obligatorios", description: "Rellena todos los campos marcados con *" })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(regEmail)) {
      toast({ variant: "destructive", title: "Email no válido", description: "Introduce un email con formato válido" })
      return
    }
    if (regPassword.length < 8) {
      toast({ variant: "destructive", title: "Contraseña corta", description: "La contraseña debe tener al menos 8 caracteres" })
      return
    }
    if (regPassword !== regPasswordConfirm) {
      toast({ variant: "destructive", title: "Contraseñas no coinciden", description: "Las dos contraseñas deben ser iguales" })
      return
    }
    if (!acceptTerms) {
      toast({ variant: "destructive", title: "Acepta las condiciones", description: "Debes aceptar las condiciones de uso" })
      return
    }

    setIsRegLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          second_last_name: secondLastName || null,
          email: regEmail,
          phone: phone || null,
          password: regPassword,
          position_id: positionId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ variant: "destructive", title: "Error al crear cuenta", description: data.error })
        setIsRegLoading(false)
        return
      }

      toast({ title: "✅ Cuenta creada", description: `Ya puedes iniciar sesión con ${regEmail}` })
      setLoginEmail(regEmail)
      setActiveTab("login")
      // Reset form
      setFirstName(""); setLastName(""); setSecondLastName(""); setRegEmail("")
      setPhone(""); setRegPassword(""); setRegPasswordConfirm(""); setPositionId("")
      setAcceptTerms(false)
    } catch {
      toast({ variant: "destructive", title: "Error de red", description: "No se pudo conectar con el servidor" })
    } finally {
      setIsRegLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* LEFT SIDE - FORM */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8 lg:px-12 xl:px-20 overflow-y-auto">
        <div className="mx-auto w-full max-w-[440px]">
          {/* Branding */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Guardias Tarazona
              </span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Crear cuenta</TabsTrigger>
            </TabsList>

            {/* ===== LOGIN TAB ===== */}
            <TabsContent value="login" className="space-y-0 mt-0">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Bienvenido de nuevo</h1>
                <p className="text-sm text-muted-foreground mt-1">Introduce tus credenciales para acceder.</p>
              </div>

              <GoogleButton label="Continuar con Google" />
              <AuthDivider />

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="usuario@juzgado-tarazona.es"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required
                    className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <div className="relative">
                    <Input id="login-password" type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••" value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)} required className="h-11 pr-12" />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/25" disabled={isLoginLoading}>
                  {isLoginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando sesión...</> : "Iniciar sesión"}
                </Button>
              </form>

              <p className="text-sm text-center text-muted-foreground mt-6">
                ¿No tienes cuenta?{" "}
                <button onClick={() => setActiveTab("register")} className="text-blue-600 hover:underline font-medium">
                  Crear cuenta →
                </button>
              </p>
            </TabsContent>

            {/* ===== REGISTER TAB ===== */}
            <TabsContent value="register" className="space-y-0 mt-0">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Crear cuenta</h1>
                <p className="text-sm text-muted-foreground mt-1">Regístrate para acceder al sistema de guardias.</p>
              </div>

              <GoogleButton label="Registrarse con Google" />
              <AuthDivider />

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-name">Nombre *</Label>
                    <Input id="reg-name" placeholder="Hugo" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)} required className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-lastname">Primer apellido *</Label>
                    <Input id="reg-lastname" placeholder="García" value={lastName}
                      onChange={(e) => setLastName(e.target.value)} required className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-lastname2">Segundo apellido</Label>
                    <Input id="reg-lastname2" placeholder="López" value={secondLastName}
                      onChange={(e) => setSecondLastName(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-phone">Teléfono</Label>
                    <Input id="reg-phone" type="tel" placeholder="600 123 456" value={phone}
                      onChange={(e) => setPhone(e.target.value)} className="h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email *</Label>
                  <Input id="reg-email" type="email" placeholder="usuario@juzgado-tarazona.es"
                    value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="h-10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-pass">Contraseña *</Label>
                    <div className="relative">
                      <Input id="reg-pass" type={showRegPassword ? "text" : "password"}
                        placeholder="Mín. 8 caracteres" value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)} required className="h-10 pr-10" />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-pass2">Repetir contraseña *</Label>
                    <Input id="reg-pass2" type="password" placeholder="Repite la contraseña"
                      value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      required className="h-10" />
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
                  <Checkbox id="terms" checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)} />
                  <Label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                    He leído y acepto las condiciones de uso
                  </Label>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/25" disabled={isRegLoading}>
                  {isRegLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</> : "Crear cuenta"}
                </Button>
              </form>

              <p className="text-sm text-center text-muted-foreground mt-5">
                ¿Ya tienes cuenta?{" "}
                <button onClick={() => setActiveTab("login")} className="text-blue-600 hover:underline font-medium">
                  Inicia sesión →
                </button>
              </p>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Sistema de gestión de guardias — Juzgado de Primera Instancia e Instrucción de Tarazona
              <br />
              <span className="text-muted-foreground/60">© {new Date().getFullYear()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - IMAGE */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <img src="/juzgado-tarazona.jpg" alt="Juzgado de Tarazona"
          className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="max-w-lg">
            <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg leading-tight">
              Gestión integral de guardias judiciales
            </h2>
            <p className="text-white/85 text-base leading-relaxed drop-shadow-md">
              Organiza turnos de guardia, gestiona vacaciones y festivos, y genera calendarios automáticos con inteligencia artificial.
            </p>
          </div>
          <div className="flex gap-6 mt-8">
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20">
              <div className="text-xl font-bold text-white">52</div>
              <div className="text-xs text-white/70">Semanas/año</div>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20">
              <div className="text-xl font-bold text-white">3</div>
              <div className="text-xs text-white/70">Roles/guardia</div>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20">
              <div className="text-xl font-bold text-white">IA</div>
              <div className="text-xs text-white/70">Generación auto.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
