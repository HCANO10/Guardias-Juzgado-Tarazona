import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Key, Mail, User, Briefcase, FileText } from "lucide-react"

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Obtener perfil
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*, positions(name, guard_role)')
    .eq('id', params.id)
    .single()

  if (error || !staff) {
    notFound()
  }

  // Obtener guardias pasadas y futuras (relación con periodos)
  const { data: guardAssignments } = await supabase
    .from('guard_assignments')
    .select('*, guard_periods(*)')
    .eq('staff_id', staff.id)
    .order('guard_periods(start_date)', { ascending: false })

  // Obtener vacaciones
  const { data: vacations } = await supabase
    .from('vacations')
    .select('*')
    .eq('staff_id', staff.id)
    .order('start_date', { ascending: false })

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/staff">
             <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Detalle del Trabajador</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tarjeta Perfil */}
        <Card className="col-span-1 lg:col-span-1 border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle>{staff.first_name} {staff.last_name}</CardTitle>
            <CardDescription>
              {staff.is_active ? (
                 <Badge className="bg-green-500/15 text-green-700">Activo</Badge>
              ) : (
                 <Badge variant="destructive">Inactivo</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-sm">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium mr-2">Nombre: </span> {staff.first_name} {staff.last_name}
            </div>
            <div className="flex items-center text-sm">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium mr-2">Email: </span> {staff.email}
            </div>
            <div className="flex items-center text-sm">
              <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium mr-2">Puesto: </span> {staff.positions?.name}
            </div>
            <div className="flex items-center text-sm">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="font-medium mr-2">Incorporación: </span> {format(new Date(staff.start_date), 'dd MMM yyyy', { locale: es })}
            </div>
            {!staff.is_active && staff.end_date && (
               <div className="flex items-center text-sm text-red-600/90 dark:text-red-400">
                 <CalendarDays className="mr-2 h-4 w-4" />
                 <span className="font-medium mr-2">Baja: </span> {format(new Date(staff.end_date), 'dd MMM yyyy', { locale: es })}
               </div>
            )}
            {staff.notes && (
              <div className="flex items-start text-sm mt-4 pt-4 border-t border-border/50">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground italic">{staff.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Guardias */}
        <Card className="col-span-1 lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader>
            <CardTitle>Historial de Guardias</CardTitle>
            <CardDescription>Participación en turnos de guardia</CardDescription>
          </CardHeader>
          <CardContent>
            {guardAssignments && guardAssignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana / Año</TableHead>
                    <TableHead>Desde - Hasta</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardAssignments.map((assignment: any) => {
                    const period = assignment.guard_periods
                    const start = new Date(period.start_date)
                    const end = new Date(period.end_date)
                    
                    let status = "Pasada"
                    let statusColor = "bg-secondary text-secondary-foreground"
                    
                    if (period.start_date <= today && period.end_date >= today) {
                      status = "Activa"
                      statusColor = "bg-primary/20 text-primary"
                    } else if (period.start_date > today) {
                      status = "Futura"
                      statusColor = "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    }

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>S. {period.week_number} - {period.year}</TableCell>
                        <TableCell>
                          {format(start, 'dd MMM', { locale: es })} - {format(end, 'dd MMM', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor} variant="outline" style={{border: 'none'}}>{status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                No tiene asignaciones de guardia registradas.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Vacaciones */}
        <Card className="col-span-1 lg:col-span-3 border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader>
            <CardTitle>Historial de Vacaciones</CardTitle>
            <CardDescription>Ausencias o días solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            {vacations && vacations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((vac: any) => (
                    <TableRow key={vac.id}>
                      <TableCell>{format(new Date(vac.start_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                      <TableCell>{format(new Date(vac.end_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                      <TableCell>
                        {vac.status === 'cancelado' || vac.status === 'cancelled' ? (
                          <Badge variant="destructive">Cancelado</Badge>
                        ) : (
                          <Badge className="bg-green-500/15 text-green-700">Aprobadas</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-sm truncate">
                        {vac.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                No tiene periodos de vacaciones registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
