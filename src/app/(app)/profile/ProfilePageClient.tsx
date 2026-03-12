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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Mi Perfil</h2>

      {/* DATOS PERSONALES */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-start justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{staffData.first_name} {staffData.last_name}</CardTitle>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <Briefcase className="h-4 w-4" />
                {staffData.positions?.name || 'Sin puesto'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
        </CardHeader>
        <CardContent className="pt-4 grid gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            {staffData.email}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Activo desde: {staffData.start_date
              ? format(new Date(staffData.start_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: es })
              : "—"}
          </div>
          <div className="flex items-center gap-2">
            {staffData.is_active
              ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
              : <Badge variant="destructive">Inactivo</Badge>}
          </div>
          {staffData.notes && (
            <p className="text-xs text-muted-foreground italic bg-muted/30 rounded px-3 py-2">{staffData.notes}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CORREO ELECTRÓNICO */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Correo electrónico</CardTitle>
            <CardDescription>Email actual: {staffData.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nuevo email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nuevo@ejemplo.com" />
            </div>
            <div className="space-y-1">
              <Label>Confirmar nuevo email</Label>
              <Input type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} placeholder="Repetir email" />
            </div>
            {newEmail && confirmEmail && newEmail !== confirmEmail && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">Los emails no coinciden</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleUpdateEmail} disabled={updatingEmail || !newEmail || !confirmEmail} className="w-full">
              {updatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar email
            </Button>
          </CardContent>
        </Card>

        {/* CUENTA DE GOOGLE */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Cuenta de Google</CardTitle>
            <CardDescription>Acceso rápido con tu cuenta de Google</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleIdentity ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/5 border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center border shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 18 18">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Vinculado como Google</p>
                      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 text-[10px] h-4">Activo</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleUnlinkGoogle} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    Desvincular
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Vincula tu cuenta para iniciar sesión con un clic.</p>
                <div onClick={handleLinkGoogle}>
                  <GoogleButton label="Vincular cuenta de Google" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CAMBIAR CONTRASEÑA */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Cambiar contraseña</CardTitle>
            <CardDescription>Mínimo 8 caracteres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="space-y-1">
              <Label>Repetir nueva contraseña</Label>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repetir contraseña" />
            </div>
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">Las contraseñas no coinciden</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleChangePassword} disabled={changingPwd || !newPwd || !confirmPwd} className="w-full">
              {changingPwd && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar contraseña
            </Button>
          </CardContent>
        </Card>

        {/* ESTADÍSTICAS */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Mis estadísticas {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Total guardias asignadas
              </div>
              <span className="font-bold text-lg">{totalGuards}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Próxima guardia
              </div>
              <span className="font-medium text-sm">
                {nextGuard
                  ? `Sem. ${nextGuard.guard_periods?.week_number}`
                  : <span className="text-muted-foreground">—</span>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palmtree className="h-4 w-4 text-green-500" />
                Días de vacaciones
              </div>
              <span className="font-bold text-lg">{totalVacationDays}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-green-500" />
                Próximas vacaciones
              </div>
              <span className="font-medium text-sm">
                {nextVacation
                  ? `${format(new Date(nextVacation.start_date + 'T00:00:00'), 'dd/MM')} - ${format(new Date(nextVacation.end_date + 'T00:00:00'), 'dd/MM')}`
                  : <span className="text-muted-foreground">—</span>}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* MIS GUARDIAS */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Mis próximas guardias ({futureGuards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {futureGuards.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tienes guardias asignadas próximamente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semana</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {futureGuards.map((g: any) => (
                  <TableRow key={g.guard_period_id}>
                    <TableCell className="font-medium">Sem. {g.guard_periods?.week_number}</TableCell>
                    <TableCell>{g.guard_periods?.start_date ? format(new Date(g.guard_periods.start_date + 'T00:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell>{g.guard_periods?.end_date ? format(new Date(g.guard_periods.end_date + 'T00:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MIS VACACIONES */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-green-500" />
            Mis vacaciones {new Date().getFullYear()} ({vacations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vacations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tienes vacaciones registradas este año.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((v: any) => {
                  const days = differenceInDays(new Date(v.end_date), new Date(v.start_date)) + 1
                  const canCancel = v.end_date >= today
                  return (
                    <TableRow key={v.id}>
                      <TableCell>{format(new Date(v.start_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(v.end_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{days} días</TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell className="text-right">
                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          )}
        </CardContent>
      </Card>

      {/* DIALOG EDITAR PERFIL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>Puedes modificar tu nombre y añadir notas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Apellidos</Label>
                <Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Ej: Sustitución por maternidad" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveProfile} disabled={savingEdit}>
                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
