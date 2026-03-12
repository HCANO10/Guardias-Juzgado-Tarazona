/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { buildFullName } from "@/lib/staff/normalize"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  UserX, 
  UserCheck, 
  Crown, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Briefcase,
  Calendar as CalendarIcon
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { StaffForm } from "@/components/staff/StaffForm"
import { EmptyState } from "@/components/ui/empty-state"
import { useRole } from "@/hooks/use-role"
import { 
  DSCard, 
  DSBadge, 
  DSPageHeader, 
  DSSectionHeading, 
  DSButton, 
  getPositionBadgeVariant 
} from "@/lib/design-system"
import { Input } from "@/components/ui/input"

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
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, type: 'deactivate' | 'reactivate', staff: any | null }>({
    open: false, type: 'deactivate', staff: null
  })
  const [actionLoading, setActionLoading] = useState(false)
  
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
      fetchStaff()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } finally {
      setActionLoading(false)
      setConfirmDialog({ open: false, type: 'deactivate', staff: null })
    }
  }

  const filteredData = data.filter((item) => {
    const matchesSearch = buildFullName(item).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? item.is_active : !item.is_active
    const matchesPosition = positionFilter === 'all' ? true : item.position_id === positionFilter

    return matchesSearch && matchesStatus && matchesPosition
  })

  // Skeleton view
  if (loading || roleLoading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-20 bg-[#F2F2F7] rounded-[24px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-[#F2F2F7] rounded-[24px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader 
          title={isHeadmaster ? "Gestión de Personal" : "Directorio del Juzgado"} 
          subtitle={isHeadmaster ? "Administra el personal, sus roles y estados de acceso." : "Consulta el personal activo y sus datos de contacto."}
        />
        {isHeadmaster && (
          <DSButton onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo trabajador
          </DSButton>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-black/[0.04]">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868B]" />
            <Input 
              placeholder="Buscar por nombre..." 
              className="pl-10 h-11 rounded-[12px] bg-white border-black/[0.08] text-[15px] focus:ring-[#0066CC]/20" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-11 rounded-[12px] bg-white border-black/[0.08] text-[15px]">
              <SelectValue placeholder="Puesto" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
              <SelectItem value="all">Todos los puestos</SelectItem>
              {positions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isHeadmaster && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px] h-11 rounded-[12px] bg-white border-black/[0.08] text-[15px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredData.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 py-20">
            <EmptyState 
              icon={Search}
              title="Sin resultados"
              description="No hay personal que coincida con los criterios de búsqueda."
            />
          </div>
        ) : (
          filteredData.map((staff) => {
            const isMan = isHeadmaster;
            const initials = `${staff.first_name[0]}${staff.last_name[0]}`;
            
            return (
              <DSCard key={staff.id} className={cn("group transition-all duration-300 hover:scale-[1.02]", !staff.is_active && "opacity-60 grayscale-[0.3]")}>
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-[16px] bg-[#F2F2F7] flex items-center justify-center text-neutral-900 font-black text-sm border border-black/[0.04]">
                    {initials}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <DSBadge variant={getPositionBadgeVariant(staff.positions?.name)}>{staff.positions?.name}</DSBadge>
                    {staff.role === 'headmaster' && (
                      <DSBadge variant="purple" className="flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Admin
                      </DSBadge>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h4 className="text-[17px] font-extrabold text-neutral-900 tracking-tight group-hover:text-[#0066CC] transition-colors">
                    {buildFullName(staff)}
                  </h4>
                  <div className="flex flex-col gap-1.5 pt-2">
                    <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                      <Mail className="h-3.5 w-3.5" /> <span className="truncate">{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
                        <Phone className="h-3.5 w-3.5" /> {staff.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-black/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight text-[#86868B]">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(new Date(staff.start_date), 'MMM yyyy', { locale: es })}
                  </div>

                  {isHeadmaster ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#F2F2F7] text-neutral-600 hover:bg-neutral-900 hover:text-white transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-[16px] border-black/[0.08] shadow-2xl p-1.5 w-48">
                        <DropdownMenuItem onClick={() => router.push(`/staff/${staff.id}`)} className="rounded-[10px] gap-2 py-2.5">
                          <Eye className="h-4 w-4" /> Ver Ficha
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(staff)} className="rounded-[10px] gap-2 py-2.5">
                          <Edit className="h-4 w-4" /> Editar Datos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 mx-2" />
                        {staff.role === 'worker' ? (
                          <DropdownMenuItem onClick={() => setRoleDialog({ open: true, staff, newRole: 'headmaster' })} className="rounded-[10px] gap-2 py-2.5 text-purple-600">
                            <Crown className="h-4 w-4" /> Convertir en Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setRoleDialog({ open: true, staff, newRole: 'worker' })} className="rounded-[10px] gap-2 py-2.5">
                            <User className="h-4 w-4" /> Quitar Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="my-1 mx-2" />
                        {staff.is_active ? (
                          <DropdownMenuItem 
                            className="text-red-600 rounded-[10px] gap-2 py-2.5"
                            onClick={() => setConfirmDialog({ open: true, type: 'deactivate', staff })}
                          >
                            <UserX className="h-4 w-4" /> Dar de Baja
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            className="text-green-600 rounded-[10px] gap-2 py-2.5"
                            onClick={() => setConfirmDialog({ open: true, type: 'reactivate', staff })}
                          >
                            <UserCheck className="h-4 w-4" /> Reactivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <DSBadge variant={staff.is_active ? "green" : "neutral"} className="px-2 py-0.5">
                      {staff.is_active ? "Activo" : "Inactivo"}
                    </DSBadge>
                  )}
                </div>
              </DSCard>
            )
          })
        )}
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

      {/* Action Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl p-8 max-w-md">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-[22px] font-bold text-neutral-900">
              {confirmDialog.type === 'deactivate' ? '¿Dar de baja?' : '¿Reactivar trabajador?'}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B] mt-2">
              {confirmDialog.type === 'deactivate' 
                ? `Dar de baja a ${confirmDialog.staff?.first_name} desactivará su acceso y liberará sus guardias automáticamente.`
                : `¿Reactivar a ${confirmDialog.staff?.first_name}? Recuperará su acceso a la plataforma.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <DSButton variant="secondary" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} disabled={actionLoading} className="flex-1">
              Cancelar
            </DSButton>
            <DSButton 
              variant={confirmDialog.type === 'deactivate' ? 'danger' : 'primary'} 
              onClick={handleConfirmAction} 
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? "Procesando..." : "Confirmar"}
            </DSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => !open && setRoleDialog({ ...roleDialog, open: false })}>
        <DialogContent className="rounded-[32px] border-none shadow-2xl p-8 max-w-md">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-[22px] font-bold text-neutral-900">
              {roleDialog.newRole === 'headmaster' ? '👑 Hacer Administrador' : '👤 Quitar Administrador'}
            </DialogTitle>
            <DialogDescription className="text-[15px] text-[#86868B] mt-2">
              {roleDialog.newRole === 'headmaster'
                ? `¿Dar permisos totales a ${roleDialog.staff ? buildFullName(roleDialog.staff) : ''}?`
                : `¿Quitar permisos de administración a ${roleDialog.staff ? buildFullName(roleDialog.staff) : ''}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <DSButton variant="secondary" onClick={() => setRoleDialog({ ...roleDialog, open: false })} disabled={roleChangeLoading} className="flex-1">
              Cancelar
            </DSButton>
            <DSButton
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
                  toast({ title: '✅ Rol actualizado' })
                  fetchStaff()
                } catch (error: any) {
                  toast({ variant: 'destructive', title: 'Error', description: error.message })
                } finally {
                  setRoleChangeLoading(false)
                  setRoleDialog({ open: false, staff: null, newRole: 'worker' })
                }
              }}
              disabled={roleChangeLoading}
              className={cn("flex-1", roleDialog.newRole === 'headmaster' && "bg-purple-600 hover:bg-purple-700")}
            >
              {roleChangeLoading ? '...' : 'Confirmar'}
            </DSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
