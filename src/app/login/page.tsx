"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { AuthDivider } from "@/components/auth/AuthDivider"
import {
  Loader2,
  Eye,
  EyeOff,
  Scale,
  ArrowRight,
} from "lucide-react"
import { DSButton, tokens } from "@/lib/design-system"

interface Position {
  id: string
  name: string
  guard_role: string | null
  requires_guard: boolean
}

function LoginContent() {
  const [activeTab, setActiveTab] = useState("login")

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [isForgotLoading, setIsForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Register state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("")
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false)
  const [positionId, setPositionId] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isRegLoading, setIsRegLoading] = useState(false)
  const [positions, setPositions] = useState<Position[]>([])

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    document.cookie =
      "staff-profile-status=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    if (searchParams.get("error") === "auth") {
      toast({ variant: "destructive", title: "Error de autenticación" })
    }
  }, [searchParams, toast])

  useEffect(() => {
    async function loadPositions() {
      try {
        const res = await fetch("/api/auth/positions")
        const data = await res.json()
        if (data.positions) setPositions(data.positions)
      } catch {
        console.error("Error cargando puestos")
      }
    }
    loadPositions()
  }, [])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast({ variant: "destructive", title: "Introduce tu email" })
      return
    }
    setIsForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setIsForgotLoading(false)
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo enviar el email de recuperación." })
      return
    }
    setForgotSent(true)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoginLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      toast({
        title: "Error de acceso",
        description: "Credenciales incorrectas.",
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
    if (!firstName || !lastName || !regEmail || !regPassword || !acceptTerms) {
      toast({ variant: "destructive", title: "Campos incompletos" })
      return
    }
    if (regPassword !== regPasswordConfirm) {
      toast({ variant: "destructive", title: "Error", description: "Las contraseñas no coinciden" })
      return
    }

    setIsRegLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: regEmail,
          password: regPassword,
          ...(positionId ? { position_id: positionId } : {}),
        }),
      })
      const data = await res.json() as { error?: string; needs_linking?: boolean }
      if (!res.ok) throw new Error(data.error)

      if (data.needs_linking) {
        // Cuenta creada sin perfil → iniciar sesión y vincular manualmente
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: regEmail,
          password: regPassword,
        })
        if (signInError) throw new Error("Cuenta creada pero no se pudo iniciar sesión automáticamente. Intenta entrar manualmente.")
        router.push("/auth/complete-profile")
        return
      }

      toast({ title: "Cuenta creada", description: "Ya puedes iniciar sesión." })
      setLoginEmail(regEmail)
      setActiveTab("login")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "Error", description: message })
    } finally {
      setIsRegLoading(false)
    }
  }

  const inputClasses =
    "h-12 rounded-xl bg-gray-50 border-gray-200 text-[15px] placeholder:text-gray-400 focus:bg-white focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC]/20 transition-all"

  return (
    <div className="flex min-h-screen w-full">
      {/* LEFT: Auth Form */}
      <div className="flex flex-col flex-1 justify-center px-6 py-12 lg:px-20 xl:px-28 bg-white">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="h-11 w-11 rounded-xl bg-[#0066CC] flex items-center justify-center">
              <Scale className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1
                className="text-xl font-semibold text-gray-900 tracking-tight"
                style={{ fontFamily: tokens.fonts.heading }}
              >
                Guardias Judiciales
              </h1>
              <p className="text-[13px] text-gray-500">
                Juzgado de Tarazona
              </p>
            </div>
          </div>

          {/* Auth Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-xl h-11 mb-8">
              <TabsTrigger
                value="login"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
              >
                Acceder
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm transition-all"
              >
                Registro
              </TabsTrigger>
            </TabsList>

            {/* LOGIN FORM */}
            <TabsContent value="login" className="mt-0 space-y-6">
              {!showForgotPassword ? (
                <>
                  <div className="space-y-2">
                    <h2 className="text-[28px] font-medium text-gray-900 tracking-tight" style={{ fontFamily: tokens.fonts.heading }}>
                      Bienvenido de vuelta
                    </h2>
                    <p className="text-sm text-gray-500">Introduce tus credenciales para acceder al sistema</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-gray-700">Correo electrónico</label>
                      <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="nombre@juzgado.es" className={inputClasses} autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] font-medium text-gray-700">Contraseña</label>
                        <button type="button" onClick={() => { setForgotEmail(loginEmail); setShowForgotPassword(true) }}
                          className="text-[12px] text-[#0066CC] hover:underline font-medium">
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                      <div className="relative">
                        <Input type={showLoginPassword ? "text" : "password"} value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••"
                          className={`${inputClasses} pr-11`} autoComplete="current-password" />
                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Mostrar contraseña">
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <DSButton type="submit" disabled={isLoginLoading} className="w-full h-12 mt-2">
                      {isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Acceder</span><ArrowRight className="h-4 w-4" /></>}
                    </DSButton>
                  </form>

                  <AuthDivider />
                  <GoogleButton label="Continuar con Google" />
                </>
              ) : (
                /* ── Panel recuperación de contraseña ── */
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-[26px] font-medium text-gray-900 tracking-tight" style={{ fontFamily: tokens.fonts.heading }}>
                      Recuperar contraseña
                    </h2>
                    <p className="text-sm text-gray-500">Te enviaremos un enlace para restablecer tu contraseña.</p>
                  </div>

                  {forgotSent ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center space-y-2">
                      <div className="text-2xl">📬</div>
                      <p className="text-[14px] font-semibold text-green-800">Email enviado</p>
                      <p className="text-[13px] text-green-700">Revisa tu bandeja de entrada y sigue las instrucciones.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-gray-700">Tu correo electrónico</label>
                        <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="nombre@juzgado.es" className={inputClasses} autoFocus autoComplete="email" />
                      </div>
                      <DSButton type="submit" disabled={isForgotLoading} className="w-full h-12">
                        {isForgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar enlace de recuperación"}
                      </DSButton>
                    </form>
                  )}

                  <button type="button" onClick={() => { setShowForgotPassword(false); setForgotSent(false) }}
                    className="w-full text-[13px] text-gray-500 hover:text-gray-900 transition-colors">
                    ← Volver al inicio de sesión
                  </button>
                </div>
              )}
            </TabsContent>

            {/* REGISTER FORM */}
            <TabsContent value="register" className="mt-0 space-y-6">
              <div className="space-y-2">
                <h2
                  className="text-[28px] font-medium text-gray-900 tracking-tight"
                  style={{ fontFamily: tokens.fonts.heading }}
                >
                  Crear cuenta
                </h2>
                <p className="text-sm text-gray-500">
                  Regístrate para acceder al sistema de guardias
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-gray-700">
                      Nombre
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-gray-700">
                      Apellido
                    </label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-gray-700">
                    Puesto
                  </label>
                  <Select onValueChange={setPositionId} value={positionId}>
                    <SelectTrigger
                      className={`${inputClasses} font-medium`}
                    >
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-gray-700">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Input
                        type={showRegPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className={`${inputClasses} pr-11`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Mostrar contraseña"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-gray-700">
                      Confirmar
                    </label>
                    <div className="relative">
                      <Input
                        type={showRegPasswordConfirm ? "text" : "password"}
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        className={`${inputClasses} pr-11`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPasswordConfirm(!showRegPasswordConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Mostrar contraseña"
                      >
                        {showRegPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-1">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(val) => setAcceptTerms(val === true)}
                    className="mt-0.5 rounded"
                  />
                  <label
                    htmlFor="terms"
                    className="text-[13px] text-gray-500 leading-tight cursor-pointer"
                  >
                    Acepto las condiciones de uso y la política de protección
                    de datos.
                  </label>
                </div>
                <DSButton
                  type="submit"
                  disabled={isRegLoading}
                  className="w-full h-12 mt-2"
                >
                  {isRegLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Crear cuenta"
                  )}
                </DSButton>
              </form>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Juzgado de Primera Instancia e Instrucción de Tarazona
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: Dark Visual Panel */}
      <div className="hidden lg:flex lg:w-[560px] relative overflow-hidden bg-[#0A1628]">
        <img
          src="/juzgado-tarazona.jpg"
          alt="Interior Juzgado"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/80 to-transparent" />

        <div className="relative z-10 w-full h-full flex flex-col justify-end p-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3
                className="text-[32px] font-semibold text-white leading-tight tracking-tight"
                style={{ fontFamily: tokens.fonts.heading }}
              >
                Sistema de Gestión
                <br />
                de Guardias Judiciales
              </h3>
              <p className="text-[15px] text-gray-400 leading-relaxed max-w-[380px]">
                Automatiza la asignación de guardias con inteligencia
                artificial. Gestión equitativa, transparente y eficiente.
              </p>
            </div>

            <div className="flex gap-10">
              <div>
                <p
                  className="text-3xl font-semibold text-white"
                  style={{ fontFamily: tokens.fonts.heading }}
                >
                  52
                </p>
                <p className="text-xs text-gray-500 mt-1">Semanas/año</p>
              </div>
              <div>
                <p
                  className="text-3xl font-semibold text-[#0066CC]"
                  style={{ fontFamily: tokens.fonts.heading }}
                >
                  100%
                </p>
                <p className="text-xs text-gray-500 mt-1">Cobertura</p>
              </div>
              <div>
                <p
                  className="text-3xl font-semibold text-emerald-400"
                  style={{ fontFamily: tokens.fonts.heading }}
                >
                  IA
                </p>
                <p className="text-xs text-gray-500 mt-1">Optimización</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
