/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfilePageClient } from "./ProfilePageClient"
import { format } from "date-fns"

export default async function ProfilePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar datos del staff vinculado
  const { data: staffData } = await supabase
    .from('staff')
    .select('*, positions(name, guard_role)')
    .eq('auth_user_id', user.id)
    .single()

  if (!staffData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Perfil no encontrado</h2>
          <p className="text-muted-foreground">
            Tu cuenta de usuario no está vinculada a ningún registro de personal.
            Contacta con el administrador.
          </p>
        </div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]

  // Mis guardias futuras
  const { data: myGuards } = await supabase
    .from('guard_assignments')
    .select('guard_period_id, guard_periods(week_number, start_date, end_date, year)')
    .eq('staff_id', staffData.id)
    .order('guard_period_id', { ascending: true })

  const futureGuards = (myGuards || [])
    .filter((g: any) => g.guard_periods?.start_date >= today && g.guard_periods?.year === currentYear)
    .slice(0, 10)

  const totalGuards = (myGuards || []).filter((g: any) => g.guard_periods?.year === currentYear).length

  // Próxima guardia
  const nextGuard = futureGuards[0] || null

  // Mis vacaciones este año
  const { data: myVacations } = await supabase
    .from('vacations')
    .select('*')
    .eq('staff_id', staffData.id)
    .gte('start_date', `${currentYear}-01-01`)
    .lte('end_date', `${currentYear}-12-31`)
    .order('start_date', { ascending: true })

  // Total días de vacaciones aprobadas
  const approvedVacations = (myVacations || []).filter((v: any) => v.status === 'approved')
  const totalVacationDays = approvedVacations.reduce((acc: number, v: any) => {
    const start = new Date(v.start_date)
    const end = new Date(v.end_date)
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return acc + diff
  }, 0)

  // Próximas vacaciones
  const nextVacation = approvedVacations.find((v: any) => v.end_date >= today) || null

  return (
    <ProfilePageClient
      staffData={staffData}
      futureGuards={futureGuards}
      totalGuards={totalGuards}
      nextGuard={nextGuard}
      vacations={myVacations || []}
      totalVacationDays={totalVacationDays}
      nextVacation={nextVacation}
    />
  )
}
