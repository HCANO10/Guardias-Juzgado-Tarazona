/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User, Shield, Palmtree, Mail, Briefcase, CalendarDays, Edit, Loader2,
  AlertTriangle, CheckCircle2, XCircle
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { GoogleButton } from "@/components/auth/GoogleButton"


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

  // Estado para edición de datos personales
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: staffData.first_name,
    last_name: staffData.last_name,
    notes: staffData.notes || "",
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Estado para cambiar contraseña
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [changingPwd, setChangingPwd] = useState(false)

  // Estado para cambio de email
  const [newEmail, setNewEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [updatingEmail, setUpdatingEmail] = useState(false)

  // Estado para vinculación de Google
  const [userIdentities, setUserIdentities] = useState<any[]>([])
  const [hasPassword, setHasPassword] = useState(true)

  useEffect(() => {
    const fetchIdentities = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserIdentities(user.identities || [])
        // Simplificación: asumimos que tiene contraseña si no es solo identidades externas
        // En una app real, podrías chequear si user.factors o similar indica contraseña.
        // Supabase no da un flag directo "hasPassword" fácilmente sin admin,
        // pero podemos chequear si existe una identidad 'email'.
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
      toast({ title: "✅ Perfil actualizado correctamente" })
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
      toast({ variant: "destructive", title: "La contraseña debe tener al menos 8 caracteres" })
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
      toast({ title: "✅ Contraseña actualizada correctamente" })
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setChangingPwd(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail) return
    if (newEmail !== confirmEmail) {
      toast({ variant: "destructive", title: "Los emails no coinciden" })
      return
    }

    setUpdatingEmail(true)
    try {
      const response = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail })
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      toast({ title: "✅ Email actualizado correctamente" })
      setNewEmail("")
      setConfirmEmail("")
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
      // toast se ejecutará después del callback si es exitoso
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al vincular", description: err.message })
    }
  }

  const handleUnlinkGoogle = async () => {
    if (!hasPassword && userIdentities.length === 1) {
      toast({ 
        variant: "destructive", 
        title: "No puedes desvincular Google", 
        description: "Debes establecer una contraseña primero para no perder el acceso." 
      })
      return
    }

    if (!googleIdentity) return

    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
      if (error) throw error
      toast({ title: "✅ Cuenta de Google desvinculada" })
      setUserIdentities(prev => prev.filter(i => i.provider !== 'google'))
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al desvincular", description: err.message })
    }
  }


  const handleCancelVacation = async (vacationId: string) => {
    const { error } = await supabase.from('vacations').delete().eq('id', vacationId)
    if (error) {
      toast({ variant: "destructive", title: "Error al cancelar las vacaciones" })
    } else {
      toast({ title: "Vacaciones canceladas" })
      router.refresh()
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">✅ Aprobada</Badge>
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">⌛ Pendiente</Badge>
    return <Badge variant="destructive">❌ Denegada</Badge>
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tus datos personales, seguridad y consulta tus estadísticas anuales.</p>
      </div>

      {/* DATOS PERSONALES */}
      {/* DATOS PERSONALES */}
      <Card className="card-modern border-none bg-white p-2">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-primary border border-primary/10 shadow-sm transition-transform hover:scale-105 duration-300">
              <User className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black tracking-tight">{staffData.first_name} {staffData.last_name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none font-bold rounded-lg px-2 py-0 text-xs flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {staffData.positions?.name || 'Sin puesto'}
                </Badge>
                {staffData.is_active ? (
                  <Badge className="bg-green-50 text-green-700 border-none font-bold rounded-lg px-2 py-0 text-xs">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="border-none font-bold rounded-lg px-2 py-0 text-xs">
                    Inactivo
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="rounded-xl border-border/50 hover:bg-accent/50 h-10 w-full sm:w-auto">
            <Edit className="mr-2 h-4 w-4" /> Editar perfil
          </Button>
        </CardHeader>
        <CardContent className="pt-6 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-accent/50 flex items-center justify-center border border-border/30 group-hover:bg-primary/5 transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Email de contacto</span>
                <span className="text-sm font-medium text-foreground">{staffData.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-accent/50 flex items-center justify-center border border-border/30 group-hover:bg-primary/5 transition-colors">
                <CalendarDays className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fecha de alta</span>
                <span className="text-sm font-medium text-foreground">
                  {staffData.start_date
                    ? format(new Date(staffData.start_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: es })
                    : "—"}
                </span>
              </div>
            </div>
            {staffData.notes && (
              <div className="md:col-span-2 lg:col-span-1">
                <div className="p-3 rounded-xl bg-accent/20 border border-dashed border-border/50 text-xs text-muted-foreground italic h-full flex items-center">
                  "{staffData.notes}"
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CORREO ELECTRÓNICO */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center">
              <Mail className="mr-2 h-4 w-4 text-primary" /> Correo electrónico
            </CardTitle>
            <CardDescription className="text-xs">Email actual: <span className="font-bold text-foreground">{staffData.email}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Nuevo email</Label>
              <Input 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)} 
                placeholder="nuevo@ejemplo.com" 
                className="rounded-xl border-border/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Confirmar nuevo email</Label>
              <Input 
                type="email" 
                value={confirmEmail} 
                onChange={e => setConfirmEmail(e.target.value)} 
                placeholder="Repetir email" 
                className="rounded-xl border-border/50 h-10"
              />
            </div>
            {newEmail && confirmEmail && newEmail !== confirmEmail && (
              <Alert variant="destructive" className="py-2 px-3 rounded-xl border-none bg-red-50 text-red-800">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-[11px] font-bold">Los emails no coinciden</AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={handleUpdateEmail} 
              disabled={updatingEmail || !newEmail || !confirmEmail} 
              className="w-full rounded-xl bg-primary h-11 shadow-sm hover:scale-[1.01] transition-all"
            >
              {updatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar email
            </Button>
          </CardContent>
        </Card>

        {/* CUENTA DE GOOGLE */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center">
              <svg className="mr-2 h-4 w-4" width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/>
              </svg>
              Cuenta de Google
            </CardTitle>
            <CardDescription className="text-xs">Usa Google para un acceso más seguro y rápido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {googleIdentity ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-green-200 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-900">Vinculado</span>
                    <span className="text-[10px] font-medium text-green-700 uppercase tracking-wider">Listo para usar</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleUnlinkGoogle} className="h-9 rounded-xl hover:bg-red-50 text-red-600 font-bold text-xs uppercase tracking-tight">
                  Desvincular
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed px-1">
                  Al vincular tu cuenta, podrás iniciar sesión al instante sin usar contraseña.
                </p>
                <div onClick={handleLinkGoogle}>
                  <GoogleButton label="Vincular con Google" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CAMBIAR CONTRASEÑA */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center text-foreground">
              <Shield className="mr-2 h-4 w-4 text-primary" /> Cambiar contraseña
            </CardTitle>
            <CardDescription className="text-xs">Seguridad reforzada (mínimo 8 caracteres)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Nueva contraseña</Label>
              <Input 
                type="password" 
                value={newPwd} 
                onChange={e => setNewPwd(e.target.value)} 
                placeholder="Introducir nueva contraseña" 
                className="rounded-xl border-border/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Confirmar contraseña</Label>
              <Input 
                type="password" 
                value={confirmPwd} 
                onChange={e => setConfirmPwd(e.target.value)} 
                placeholder="Repetir para confirmar" 
                className="rounded-xl border-border/50 h-10"
              />
            </div>
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <Alert variant="destructive" className="py-2 px-3 rounded-xl border-none bg-red-50 text-red-800">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-[11px] font-bold">Las contraseñas no coinciden</AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={handleChangePassword} 
              disabled={changingPwd || !newPwd || !confirmPwd} 
              className="w-full rounded-xl bg-primary h-11 shadow-sm hover:scale-[1.01] transition-all"
            >
              {changingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar seguridad
            </Button>
          </CardContent>
        </Card>

        {/* ESTADÍSTICAS */}
        <Card className="card-modern border-none bg-white p-2">
          <CardHeader className="pb-6">
            <CardTitle className="text-base font-bold flex items-center">
              <Activity className="mr-2 h-4 w-4 text-indigo-500" /> Resumen Anual {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/30 border border-border/50 group hover:bg-white transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground leading-tight">Total Guardias</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Asignadas</span>
                </div>
              </div>
              <span className="text-2xl font-black text-primary">{totalGuards}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/30 border border-border/50 group hover:bg-white transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground leading-tight">Próxima Guardia</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Cronograma</span>
                </div>
              </div>
              <span className="font-black text-sm text-purple-700">
                {nextGuard
                  ? `Sem. ${nextGuard.guard_periods?.week_number}`
                  : <span className="opacity-40">—</span>}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/30 border border-border/50 group hover:bg-white transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform shadow-sm">
                  <Palmtree className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground leading-tight">Días Consumidos</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Vacaciones</span>
                </div>
              </div>
              <span className="text-2xl font-black text-green-700">{totalVacationDays}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/30 border border-border/50 group hover:bg-white transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground leading-tight">Siguiente Salida</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Vacaciones</span>
                </div>
              </div>
              <span className="font-black text-xs text-indigo-700">
                {nextVacation
                  ? `${format(new Date(nextVacation.start_date + 'T00:00:00'), 'dd/MM')} - ${format(new Date(nextVacation.end_date + 'T00:00:00'), 'dd/MM')}`
                  : <span className="opacity-40">—</span>}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* MIS GUARDIAS */}
      <Card className="card-modern border-none bg-white p-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-4 w-4" />
            </div>
            Mis próximas guardias ({futureGuards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {futureGuards.length === 0 ? (
            <div className="py-12 text-center bg-accent/20 rounded-2xl border-2 border-dashed border-border/50">
              < Shield className="h-10 w-10 mx-auto mb-3 opacity-20 text-indigo-400" />
              <p className="text-sm text-muted-foreground font-medium">No tienes guardias asignadas próximamente.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-accent/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Semana</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Inicio</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Fin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {futureGuards.map((g: any) => (
                    <TableRow key={g.guard_period_id} className="h-12 border-border/50 hover:bg-accent/5 transition-colors">
                      <TableCell className="font-bold text-primary">Semana {g.guard_periods?.week_number}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.guard_periods?.start_date ? format(new Date(g.guard_periods.start_date + 'T00:00:00'), 'dd MMM yyyy', { locale: es }) : '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.guard_periods?.end_date ? format(new Date(g.guard_periods.end_date + 'T00:00:00'), 'dd MMM yyyy', { locale: es }) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MIS VACACIONES */}
      <Card className="card-modern border-none bg-white p-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <Palmtree className="h-4 w-4" />
            </div>
            Mis vacaciones {new Date().getFullYear()} ({vacations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vacations.length === 0 ? (
            <div className="py-12 text-center bg-accent/20 rounded-2xl border-2 border-dashed border-border/50">
              <Palmtree className="h-10 w-10 mx-auto mb-3 opacity-20 text-green-400" />
              <p className="text-sm text-muted-foreground font-medium">No tienes vacaciones registradas este año.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-accent/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Desde</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Hasta</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Días</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Estado</TableHead>
                    <TableHead className="text-right h-11"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((v: any) => {
                    const days = differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1
                    const canCancel = v.end_date >= today
                    return (
                      <TableRow key={v.id} className="h-14 border-border/50 hover:bg-accent/5 transition-colors">
                        <TableCell className="font-bold text-foreground">{format(new Date(v.start_date + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell className="text-muted-foreground font-medium">{format(new Date(v.end_date + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg border-border/50 text-foreground/70 bg-white font-bold px-2">
                            {days} días
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(v.status)}</TableCell>
                        <TableCell className="text-right pr-4">
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs uppercase tracking-tight"
                              onClick={() => handleCancelVacation(v.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG EDITAR PERFIL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl p-0 overflow-hidden sm:max-w-[440px]">
          <div className="bg-primary/5 p-6 flex items-center gap-4 border-b border-primary/10">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
              <User className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-foreground font-black tracking-tight">Editar Perfil</DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium text-xs">Actualiza tus datos públicos</DialogDescription>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Nombre</Label>
                <Input 
                  value={editForm.first_name} 
                  onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} 
                  className="rounded-xl border-border/50 h-10 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Apellidos</Label>
                <Input 
                  value={editForm.last_name} 
                  onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} 
                  className="rounded-xl border-border/50 h-10 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Notas Personales</Label>
              <Textarea 
                value={editForm.notes} 
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })} 
                placeholder="Ej: Disponibilidad limitada, puesto específico..." 
                className="rounded-xl border-border/50 min-h-[100px] resize-none focus-visible:ring-primary/20"
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={handleSaveProfile} 
                disabled={savingEdit}
                className="h-11 rounded-xl bg-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform"
              >
                {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setEditOpen(false)} 
                disabled={savingEdit}
                className="h-11 rounded-xl text-muted-foreground font-bold"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
