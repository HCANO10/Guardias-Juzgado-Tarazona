"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Shield, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        title: "Error de autenticación",
        description: "Email o contraseña incorrectos. Inténtalo de nuevo.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* LADO IZQUIERDO - FORMULARIO */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Logo / Branding */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Guardias Tarazona
              </span>
            </div>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Bienvenido de nuevo
            </h1>
            <p className="text-muted-foreground text-[15px]">
              Introduce tus credenciales para acceder al sistema.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@juzgado-tarazona.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg border-border/60 bg-background px-4 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg border-border/60 bg-background px-4 pr-12 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-border/40">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Sistema de gestión de guardias del Juzgado de Primera Instancia e Instrucción de Tarazona.
              <br />
              <span className="text-muted-foreground/60">© {new Date().getFullYear()} Juzgado de Tarazona</span>
            </p>
          </div>
        </div>
      </div>

      {/* LADO DERECHO - IMAGEN */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Imagen real del juzgado */}
        <img
          src="/juzgado-tarazona.jpg"
          alt="Juzgado de Tarazona"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-transparent" />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
          <div className="max-w-lg">
            <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg leading-tight">
              Gestión integral de guardias judiciales
            </h2>
            <p className="text-white/85 text-base leading-relaxed drop-shadow-md">
              Organiza turnos de guardia, gestiona vacaciones y festivos, y genera calendarios automáticos con inteligencia artificial.
            </p>
          </div>

          {/* Indicadores */}
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
