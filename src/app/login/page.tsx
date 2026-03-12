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
import { Loader2, Shield, Eye, EyeOff, Activity, CheckCircle2, AlertCircle } from "lucide-react"

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
    <div className="flex min-h-screen w-full bg-white selection:bg-primary/20">
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
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-accent/50 p-1 rounded-2xl border border-border/50">
              <TabsTrigger value="login" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Crear cuenta</TabsTrigger>
            </TabsList>

            {/* ===== LOGIN TAB ===== */}
            <TabsContent value="login" className="space-y-0 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-6">
                <h1 className="text-3xl font-black tracking-tight text-foreground">Bienvenido</h1>
                <p className="text-sm text-muted-foreground mt-2 font-medium">Gestiona las guardias de Tarazona con inteligencia.</p>
              </div>

              <GoogleButton label="Continuar con Google" />
              <AuthDivider />

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Email corporativo</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="usuario@juzgado-tarazona.es"
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    required
                    className="h-12 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" title="Contraseña" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Contraseña</Label>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)} 
                      required 
                      className="h-12 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all pr-12" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]" 
                  disabled={isLoginLoading}
                >
                  {isLoginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accediendo...</> : "Entrar en el sistema"}
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
            <TabsContent value="register" className="space-y-0 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-6">
                <h1 className="text-3xl font-black tracking-tight text-foreground">Registro</h1>
                <p className="text-sm text-muted-foreground mt-2 font-medium">Únete al personal del Juzgado de Tarazona.</p>
              </div>

              <GoogleButton label="Registrarse con Google" />
              <AuthDivider />

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Nombre</Label>
                    <Input id="reg-name" placeholder="Hugo" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)} required className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-lastname" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Primer Apellido</Label>
                    <Input id="reg-lastname" placeholder="Cano" value={lastName}
                      onChange={(e) => setLastName(e.target.value)} required className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-lastname2" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Segundo Apellido</Label>
                    <Input id="reg-lastname2" placeholder="López" value={secondLastName}
                      onChange={(e) => setSecondLastName(e.target.value)} className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Teléfono</Label>
                    <Input id="reg-phone" type="tel" placeholder="600 000 000" value={phone}
                      onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Email</Label>
                  <Input id="reg-email" type="email" placeholder="usuario@juzgado-tarazona.es"
                    value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-pass" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Seguridad</Label>
                    <div className="relative">
                      <Input id="reg-pass" type={showRegPassword ? "text" : "password"}
                        placeholder="Mín. 8 car." value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)} required className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all pr-10" />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-pass2" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Confirmar</Label>
                    <Input id="reg-pass2" type="password" placeholder="Repite password"
                      value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      required className="h-11 rounded-2xl border-border/50 bg-accent/30 focus-visible:bg-white transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Puesto de trabajo</Label>
                  <Select onValueChange={setPositionId} value={positionId}>
                    <SelectTrigger className="h-11 rounded-2xl border-border/50 bg-accent/30 focus:bg-white transition-all">
                      <SelectValue placeholder="Selecciona tu puesto..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/50">
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="rounded-xl">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-3 py-1">
                  <Checkbox 
                    id="terms" 
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)} 
                    className="rounded-lg border-border/50"
                  />
                  <Label htmlFor="terms" className="text-[11px] text-muted-foreground font-medium leading-none cursor-pointer">
                    Acepto las condiciones de uso y política de privacidad
                  </Label>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]" 
                  disabled={isRegLoading}
                >
                  {isRegLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : "Completar Registro"}
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
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-slate-900">
        <img 
          src="/juzgado-tarazona.jpg" 
          alt="Juzgado de Tarazona"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-60 scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 flex flex-col justify-end p-16 pb-20 w-full">
          <div className="max-w-xl animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 shadow-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Sistema Operativo</span>
            </div>
            
            <h2 className="text-5xl font-black text-white mb-6 leading-[1.1] tracking-tight drop-shadow-2xl">
              Inteligencia aplicada <br />
              <span className="text-primary-foreground/80">a la justicia local.</span>
            </h2>
            <p className="text-white/80 text-lg leading-relaxed font-medium max-w-md">
              La plataforma definitiva para la gestión de personal, guardias y disponibilidad del Juzgado de Tarazona.
            </p>
          </div>
          
          <div className="flex gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-all cursor-default">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary-foreground" />
                <span className="text-3xl font-black text-white">52</span>
              </div>
              <div className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-none">Semanas anuales</div>
            </div>
            <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-all cursor-default">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-3xl font-black text-white">100%</span>
              </div>
              <div className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-none">Disponibilidad</div>
            </div>
            <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:bg-white/10 transition-all cursor-default relative overflow-hidden">
               <div className="absolute top-0 right-0 w-12 h-12 bg-primary/20 blur-2xl rounded-full" />
              <div className="flex items-center gap-2 mb-1 relative z-10">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span className="text-3xl font-black text-white italic">IA</span>
              </div>
              <div className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-none relative z-10">Groq Engine</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
