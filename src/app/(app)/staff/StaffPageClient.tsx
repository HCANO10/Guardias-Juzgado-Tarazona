/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Eye, Edit, UserX, UserCheck } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { StaffForm } from "@/components/staff/StaffForm"
import { EmptyState } from "@/components/ui/empty-state"

interface Position {
  id: string
  name: string
}

export default function StaffPageClient({ positions }: { positions: Position[] }) {
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
    const matchesSearch = `${item.first_name} ${item.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? item.is_active : !item.is_active
    const matchesPosition = positionFilter === 'all' ? true : item.position_id === positionFilter

    return matchesSearch && matchesStatus && matchesPosition
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Personal del Juzgado</h2>
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
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Incorporación</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
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
                  <TableCell className="font-medium">{staff.first_name} {staff.last_name}</TableCell>
                  <TableCell>{staff.positions?.name}</TableCell>
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
    </div>
  )
}
