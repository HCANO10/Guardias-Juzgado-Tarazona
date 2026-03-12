/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { buildFullName } from "@/lib/staff/normalize"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Eye, Edit, UserX, UserCheck, Crown, User, Mail, Phone } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { StaffForm } from "@/components/staff/StaffForm"
import { EmptyState } from "@/components/ui/empty-state"
import { useRole } from "@/hooks/use-role"

interface Position {
  id: string
  name: string
}

export default function StaffPageClient({ positions }: { positions: Position[] }) {
  const { isHeadmaster, isLoading: roleLoading } = useRole()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [positionFilter, setPositionFilter] = useState("all")
  
  // Modales states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  
  // Dialog de confirmación (baja/reactivación)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, type: 'deactivate' | 'reactivate', staff: any | null }>({
    open: false, type: 'deactivate', staff: null
  })
  const [actionLoading, setActionLoading] = useState(false)
  
  // Dialog de cambio de rol
  const [roleDialog, setRoleDialog] = useState<{ open: boolean, staff: any | null, newRole: string }>({
    open: false, staff: null, newRole: 'worker'
  })
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const fetchStaff = async () => {
    setLoading(true)
    const { data: staffData, error } = await supabase
      .from('staff')
      .select(`
        *,
        positions(name)
      `)
      .order('last_name', { ascending: true })

    if (!error && staffData) {
      setData(staffData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleCreate = () => {
    setEditingStaff(null)
    setIsFormOpen(true)
  }

  const handleEdit = (staff: any) => {
    setEditingStaff(staff)
    setIsFormOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!confirmDialog.staff) return
    setActionLoading(true)
    
    try {
      const endpoint = confirmDialog.type === 'deactivate' ? '/api/staff/deactivate' : '/api/staff/reactivate'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: confirmDialog.staff.id })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast({ title: result.message })
      fetchStaff() // Recargar datos
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setActionLoading(false)
      setConfirmDialog({ open: false, type: 'deactivate', staff: null })
    }
  }

  // Filtrado
  const filteredData = data.filter((item) => {
    const matchesSearch = buildFullName(item).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? item.is_active : !item.is_active
    const matchesPosition = positionFilter === 'all' ? true : item.position_id === positionFilter

    return matchesSearch && matchesStatus && matchesPosition
  })

  if (loading || roleLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-[250px] rounded-lg" />
            <Skeleton className="h-4 w-[350px] rounded-lg" />
          </div>
          <Skeleton className="h-10 w-[150px] rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="card-modern p-6 border-none bg-white">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-[140px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isHeadmaster) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Gestión de Personal</h1>
            <p className="text-muted-foreground">Administra el personal, sus roles, puestos y estado de acceso.</p>
          </div>
          <Button onClick={handleCreate} className="rounded-xl bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
            <Plus className="mr-2 h-4 w-4" /> Nuevo trabajador
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre..." 
              className="pl-10 h-10 rounded-xl border-border/50 bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-10 rounded-xl border-border/50 bg-white">
              <SelectValue placeholder="Puesto" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos los puestos</SelectItem>
              {positions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px] h-10 rounded-xl border-border/50 bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl border border-border/50 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-accent/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-bold">Nombre Completo</TableHead>
                <TableHead className="font-bold">Puesto / Rol</TableHead>
                <TableHead className="font-bold">Email / Contacto</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="font-bold">Incorporación</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20">
                    <EmptyState 
                      icon={Search}
                      title="No se han encontrado resultados"
                      description={searchTerm ? `No hay personal que coincida con "${searchTerm}"` : "No hay personal registrado en esta categoría."}
                      action={searchTerm ? (
                        <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPositionFilter("all"); }} className="rounded-xl">
                          Limpiar filtros
                        </Button>
                      ) : (
                        <Button onClick={handleCreate} className="rounded-xl">
                          <Plus className="mr-2 h-4 w-4" /> Nuevo trabajador
                        </Button>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((staff) => (
                  <TableRow key={staff.id} className="h-16 hover:bg-accent/5 transition-colors border-border/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {staff.first_name[0]}{staff.last_name[0]}
                        </div>
                        <span className="font-bold text-foreground">{buildFullName(staff)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{staff.positions?.name}</span>
                        {staff.role === 'headmaster' ? (
                          <Badge variant="purple" className="w-fit">
                            Headmaster
                          </Badge>
                        ) : (
                          <Badge variant="indigo" className="w-fit">
                            Trabajador
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {staff.email}</span>
                        {staff.phone && <span className="flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {staff.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {staff.is_active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(staff.start_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-xl">
                          <DropdownMenuItem onClick={() => router.push(`/staff/${staff.id}`)} className="rounded-lg">
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(staff)} className="rounded-lg">
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          {staff.is_active ? (
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg" 
                              onClick={() => setConfirmDialog({ open: true, type: 'deactivate', staff })}
                            >
                              <UserX className="mr-2 h-4 w-4" /> Dar de baja
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-green-600 focus:text-green-600 focus:bg-green-50 rounded-lg"
                              onClick={() => setConfirmDialog({ open: true, type: 'reactivate', staff })}
                            >
                              <UserCheck className="mr-2 h-4 w-4" /> Reactivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {staff.role === 'worker' ? (
                            <DropdownMenuItem onClick={() => setRoleDialog({ open: true, staff, newRole: 'headmaster' })} className="rounded-lg">
                              <Crown className="mr-2 h-4 w-4 text-purple-600" /> Hacer Headmaster
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setRoleDialog({ open: true, staff, newRole: 'worker' })} className="rounded-lg">
                              <User className="mr-2 h-4 w-4" /> Hacer Trabajador
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {isFormOpen && (
          <StaffForm 
            open={isFormOpen} 
            onOpenChange={setIsFormOpen} 
            positions={positions} 
            initialData={editingStaff} 
            onSuccess={fetchStaff} 
          />
        )}

        {/* Dialogo de confirmación Baja/Reactivación */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmDialog.type === 'deactivate' ? '¿Dar de baja?' : '¿Reactivar trabajador?'}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog.type === 'deactivate' 
                  ? `¿Estás seguro de dar de baja a ${confirmDialog.staff?.first_name}? Se desactivará su acceso al instante y se liberarán de forma automática todas sus guardias futuras asignadas.`
                  : `¿Estás seguro de reactivar a ${confirmDialog.staff?.first_name}? Volverá a tener acceso a la plataforma.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} disabled={actionLoading}>
                Cancelar
              </Button>
              <Button 
                variant={confirmDialog.type === 'deactivate' ? 'destructive' : 'default'} 
                onClick={handleConfirmAction} 
                disabled={actionLoading}
              >
                {actionLoading ? "Procesando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogo de cambio de rol */}
        <Dialog open={roleDialog.open} onOpenChange={(open) => !open && setRoleDialog({ ...roleDialog, open: false })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {roleDialog.newRole === 'headmaster' ? '👑 ¿Hacer Headmaster?' : '👤 ¿Hacer Trabajador?'}
              </DialogTitle>
              <DialogDescription>
                {roleDialog.newRole === 'headmaster'
                  ? `¿Estás seguro de dar permisos de Headmaster a ${roleDialog.staff ? buildFullName(roleDialog.staff) : ''}? Tendrá acceso total a la gestión.`
                  : `¿Estás seguro de quitar permisos de Headmaster a ${roleDialog.staff ? buildFullName(roleDialog.staff) : ''}? Solo podrá consultar sus propios datos.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRoleDialog({ ...roleDialog, open: false })} disabled={roleChangeLoading}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setRoleChangeLoading(true)
                try {
                  const res = await fetch('/api/staff/change-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ staff_id: roleDialog.staff?.id, new_role: roleDialog.newRole }),
                  })
                  const result = await res.json()
                  if (!res.ok) throw new Error(result.error)
                  toast({ title: '✅ Rol actualizado', description: result.message })
                  fetchStaff()
                } catch (error: any) {
                  toast({ variant: 'destructive', title: 'Error', description: error.message })
                } finally {
                  setRoleChangeLoading(false)
                  setRoleDialog({ open: false, staff: null, newRole: 'worker' })
                }
              }}
              disabled={roleChangeLoading}
              className={roleDialog.newRole === 'headmaster' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {roleChangeLoading ? 'Procesando...' : 'Confirmar'}
            </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // WORKER VIEW: Directory
  const activeStaff = data.filter(s => s.is_active)
  const administrators = activeStaff.filter(s => !s.is_guard_eligible || s.role === 'headmaster')
  const regularStaff = activeStaff.filter(s => s.is_guard_eligible && s.role !== 'headmaster')

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Directorio del Juzgado</h1>
        <p className="text-muted-foreground">Consulta el personal activo y sus datos de contacto.</p>
      </div>

      <div className="space-y-12">
        {/* Administrators Section */}
        {administrators.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 group cursor-pointer px-1">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                <Crown className="h-4 w-4" />
              </div>
              <span>Administración</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {administrators.map((staff) => (
                <Card key={staff.id} className="card-modern border-none bg-white p-6 hover:shadow-xl transition-all group">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{buildFullName(staff)}</h4>
                        <Badge className="bg-purple-50 text-purple-700 border-none rounded-lg text-[10px] uppercase font-bold px-2 py-0">
                          {staff.positions?.name || 'Administrador'}
                        </Badge>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/20 flex items-center justify-center text-purple-700 font-extrabold text-sm border border-purple-100 group-hover:scale-110 transition-transform shadow-sm">
                        {staff.first_name[0]}{staff.last_name[0]}
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-auto pt-4 border-t border-border/30 border-dashed">
                      <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-accent/50 flex items-center justify-center mr-3">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="h-7 w-7 rounded-lg bg-accent/50 flex items-center justify-center mr-3">
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          <span>{staff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Staff Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2 group cursor-pointer px-1">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <User className="h-4 w-4" />
            </div>
            <span>Compañeros</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularStaff.length > 0 ? (
              regularStaff.map((staff) => (
                <Card key={staff.id} className="card-modern border-none bg-white p-6 hover:shadow-xl transition-all group">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{buildFullName(staff)}</h4>
                        <Badge className="bg-blue-50 text-blue-700 border-none rounded-lg text-[10px] uppercase font-bold px-2 py-0">
                          {staff.positions?.name}
                        </Badge>
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 flex items-center justify-center text-blue-700 font-extrabold text-sm border border-blue-100 group-hover:scale-110 transition-transform shadow-sm">
                        {staff.first_name[0]}{staff.last_name[0]}
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-auto pt-4 border-t border-border/30 border-dashed">
                      <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-accent/50 flex items-center justify-center mr-3">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="h-7 w-7 rounded-lg bg-accent/50 flex items-center justify-center mr-3">
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          <span>{staff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-accent/20 rounded-2xl border-2 border-dashed border-border/50">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground italic">No hay otros compañeros registrados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
