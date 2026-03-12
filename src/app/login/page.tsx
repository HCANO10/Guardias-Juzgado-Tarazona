/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { GoogleButton } from "@/components/auth/GoogleButton"
import { AuthDivider } from "@/components/auth/AuthDivider"
import { 
  Loader2, 
  Shield, 
  Eye, 
  EyeOff, 
  Activity, 
  CheckCircle2, 
  Scale,
  Lock,
  Mail,
  Smartphone,
  ChevronRight,
  Globe
} from "lucide-react"
import { 
  DSBadge, 
  DSButton,
  DSIconBox
} from "@/lib/design-system"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    document.cookie = 'staff-profile-status=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    if (searchParams.get('error') === 'auth') {
      toast({ variant: 'destructive', title: 'Error de autenticación' })
    }
  }, [searchParams, toast])

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
    if (!firstName || !lastName || !regEmail || !regPassword || !positionId || !acceptTerms) {
      toast({ variant: "destructive", title: "Campos incompletos" })
      return
    }
    if (regPassword !== regPasswordConfirm) {
      toast({ variant: "destructive", title: "Error", description: "Las contraseñas no coinciden" })
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
      if (!res.ok) throw new Error(data.error)

      toast({ title: "Cuenta creada", description: "Ya puedes iniciar sesión." })
      setLoginEmail(regEmail)
      setActiveTab("login")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsRegLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#F2F2F7] selection:bg-[#0066CC]/20">
      
      {/* LEFT: Auth Flow */}
      <div className="flex flex-col flex-1 justify-center px-6 py-12 lg:px-20 xl:px-32 bg-white relative overflow-hidden">
         {/* Subtle pattern or gradient background for the white side */}
         <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#F2F2F7]/50 to-transparent pointer-events-none" />

         <div className="mx-auto w-full max-w-[440px] relative z-10">
            {/* Logo Section */}
            <div className="flex items-center gap-4 mb-12">
               <div className="h-12 w-12 rounded-[14px] bg-gradient-to-br from-[#0066CC] to-[#004C99] flex items-center justify-center shadow-lg shadow-[#0066CC]/20">
                  <Shield className="h-6 w-6 text-white" />
               </div>
               <div>
                  <h1 className="text-[20px] font-black tracking-tighter text-neutral-900 leading-tight">Guardias Judiciales</h1>
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#86868B]">Tarazona · v2.0</p>
               </div>
            </div>

            {/* Auth Toggle */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
               <TabsList className="grid w-full grid-cols-2 p-1 bg-[#F2F2F7] rounded-[18px] h-12 border border-black/[0.04] mb-10">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-[14px] text-[13px] font-bold data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-md transition-all"
                  >
                    Acceder
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    className="rounded-[14px] text-[13px] font-bold data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-md transition-all"
                  >
                    Registro
                  </TabsTrigger>
               </TabsList>

               {/* LOGIN FORM */}
               <TabsContent value="login" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="space-y-2">
                     <h2 className="text-[32px] font-black tracking-tight text-neutral-900 leading-tight">Bienvenido</h2>
                     <p className="text-[15px] font-medium text-[#86868B]">Identifícate para gestionar el cuadrante.</p>
                  </div>

                  <div className="space-y-6">
                     <GoogleButton label="Acceder con Google" />
                     <AuthDivider />

                     <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Email Corporativo</label>
                           <Input 
                             type="email" 
                             value={loginEmail} 
                             onChange={e => setLoginEmail(e.target.value)}
                             placeholder="nombre@juzgado.local"
                             className="h-12 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px] focus:bg-white transition-all shadow-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black uppercase text-[#86868B] px-1 flex justify-between">
                              Contraseña
                              <span className="text-[#0066CC] font-bold normal-case cursor-pointer hover:underline">¿Olvido?</span>
                           </label>
                           <div className="relative">
                              <Input 
                                type={showLoginPassword ? "text" : "password"}
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                className="h-12 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px] pr-12 focus:bg-white transition-all shadow-sm"
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B]"
                              >
                                {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                           </div>
                        </div>
                        <DSButton type="submit" disabled={isLoginLoading} className="w-full h-12 text-[14px] font-black uppercase tracking-widest mt-4">
                           {isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Iniciar Sesión"}
                        </DSButton>
                     </form>
                  </div>
               </TabsContent>

               {/* REGISTER FORM */}
               <TabsContent value="register" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="space-y-2">
                     <h2 className="text-[32px] font-black tracking-tight text-neutral-900 leading-tight">Nueva Cuenta</h2>
                     <p className="text-[15px] font-medium text-[#86868B]">Únete al cuadrante inteligente de Tarazona.</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-5">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Nombre</label>
                           <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-11 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Apellido</label>
                           <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-11 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Email</label>
                        <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="h-11 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Puesto Judicial</label>
                        <Select onValueChange={setPositionId} value={positionId}>
                           <SelectTrigger className="h-11 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] font-bold">
                              <SelectValue placeholder="Selecciona..." />
                           </SelectTrigger>
                           <SelectContent className="rounded-[18px]">
                              {positions.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Contraseña</label>
                           <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="h-11 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black uppercase text-[#86868B] px-1">Confirma</label>
                           <Input type="password" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} className="h-11 rounded-[14px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]" />
                        </div>
                     </div>
                     <div className="flex items-start gap-3 py-2">
                        <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(val) => setAcceptTerms(val === true)} className="mt-1 rounded-md" />
                        <label htmlFor="terms" className="text-[13px] text-[#86868B] leading-tight font-medium cursor-pointer">
                           Acepto las condiciones de seguridad y política de tratamiento de datos.
                        </label>
                     </div>
                     <DSButton type="submit" disabled={isRegLoading} className="w-full h-12 text-[14px] font-black uppercase tracking-widest">
                        {isRegLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear Mi Cuenta"}
                     </DSButton>
                  </form>
               </TabsContent>
            </Tabs>
            
            {/* System Tag */}
            <div className="mt-16 pt-8 border-t border-black/[0.04] flex items-center justify-center gap-4">
               <div className="flex items-center gap-1.5 opacity-40">
                  <Scale className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider italic">Justicia Tarazona</span>
               </div>
               <div className="h-1 w-1 bg-[#86868B] rounded-full opacity-20" />
               <p className="text-[11px] font-bold text-[#86868B] opacity-50">© {new Date().getFullYear()}</p>
            </div>
         </div>
      </div>

      {/* RIGHT: Visual Content */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-neutral-900">
         <img 
            src="/juzgado-tarazona.jpg" 
            alt="Interior Juzgado"
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110"
         />
         {/* Premium Overlay */}
         <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900/40 to-transparent" />
         
         <div className="relative z-10 w-full h-full flex flex-col justify-end p-16 xl:p-24">
            <div className="max-w-xl space-y-12 animate-in fade-in slide-in-from-right-12 duration-1000">
               
               <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                  <span className="relative flex h-2.5 w-2.5">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066CC] opacity-60"></span>
                     <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0066CC]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Cloud Engine Online</span>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[54px] font-black text-white leading-[1.05] tracking-tight">
                     Inteligencia Aplicada a la <span className="text-[#0066CC]">Justicia Local.</span>
                  </h3>
                  <p className="text-[18px] text-white/50 font-medium leading-relaxed max-w-[480px]">
                     Optimiza el cuadrante de guardias y sincroniza tus vacaciones de forma automática con la potencia de Meta Llama 3.3.
                  </p>
               </div>

               <div className="flex gap-8 pt-4">
                  <div className="space-y-1">
                     <p className="text-[32px] font-black text-white">52</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#0066CC]">Semanas</p>
                  </div>
                  <div className="w-[1px] h-12 bg-white/10" />
                  <div className="space-y-1">
                     <p className="text-[32px] font-black text-white">100%</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-green-500">Cobertura</p>
                  </div>
                  <div className="w-[1px] h-12 bg-white/10" />
                  <div className="space-y-1">
                     <p className="text-[32px] font-black text-white italic underline decoration-[#0066CC]/50">IA</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Groq Engine</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
