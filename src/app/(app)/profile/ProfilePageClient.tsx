/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
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
