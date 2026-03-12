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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[250px]" />
          {isHeadmaster && <Skeleton className="h-10 w-[150px]" />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isHeadmaster) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Personal</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo trabajador
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre..." 
              className="pl-8 bg-card" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-full md:w-[200px] bg-card">
              <SelectValue placeholder="Puesto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los puestos</SelectItem>
              {positions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px] bg-card">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Incorporación</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <EmptyState 
                      icon={Search}
                      title="No se han encontrado resultados"
                      description={searchTerm ? `No hay personal que coincida con "${searchTerm}"` : "No hay personal registrado en esta categoría."}
                      action={searchTerm ? (
                        <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPositionFilter("all"); }}>
                          Limpiar filtros
                        </Button>
                      ) : (
                        <Button onClick={handleCreate}>
                          <Plus className="mr-2 h-4 w-4" /> Nuevo trabajador
                        </Button>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{buildFullName(staff)}</TableCell>
                    <TableCell>{staff.positions?.name}</TableCell>
                    <TableCell>
                      {staff.role === 'headmaster' ? (
                        <Badge className="bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 dark:text-purple-400">
                          👑 Headmaster
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          👤 Trabajador
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      {staff.is_active ? (
                        <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400">Activo</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/15 text-red-700 hover:bg-red-500/25 dark:text-red-400">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(staff.start_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/staff/${staff.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(staff)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          {staff.is_active ? (
                            <DropdownMenuItem 
                              className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950" 
                              onClick={() => setConfirmDialog({ open: true, type: 'deactivate', staff })}
                            >
                              <UserX className="mr-2 h-4 w-4" /> Dar de baja
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-green-600 focus:bg-green-50 dark:focus:bg-green-950"
                              onClick={() => setConfirmDialog({ open: true, type: 'reactivate', staff })}
                            >
                              <UserCheck className="mr-2 h-4 w-4" /> Reactivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {staff.role === 'worker' ? (
                            <DropdownMenuItem onClick={() => setRoleDialog({ open: true, staff, newRole: 'headmaster' })}>
                              <Crown className="mr-2 h-4 w-4 text-purple-600" /> Hacer Headmaster
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setRoleDialog({ open: true, staff, newRole: 'worker' })}>
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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Directorio del Juzgado</h2>
        <p className="text-muted-foreground">Personal activo del Juzgado de Tarazona</p>
      </div>

      <div className="space-y-8">
        {/* Administrators Section */}
        {administrators.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" /> Administración
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {administrators.map((staff) => (
                <Card key={staff.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{buildFullName(staff)}</h4>
                        <Badge className="mt-1 bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 border-none">
                          {staff.positions?.name || 'Administrador'}
                        </Badge>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                        {staff.first_name[0]}{staff.last_name[0]}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 mr-2" />
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" /> Compañeros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularStaff.length > 0 ? (
              regularStaff.map((staff) => (
                <Card key={staff.id} className="p-6 hover:shadow-md transition-shadow border-border/60">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{buildFullName(staff)}</h4>
                        <Badge variant="secondary" className="mt-1">
                          {staff.positions?.name}
                        </Badge>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                        {staff.first_name[0]}{staff.last_name[0]}
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground italic">No hay otros compañeros registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
