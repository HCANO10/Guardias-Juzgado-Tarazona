import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Verificar sesión (solo usuarios autenticados pueden desactivar staff)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { staffId } = body

    if (!staffId) {
      return NextResponse.json({ error: 'Falta staffId' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Obtener al trabajador para saber su auth_user_id
    const { data: staff, error: fetchError } = await adminClient
      .from('staff')
      .select('auth_user_id')
      .eq('id', staffId)
      .single()

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // 2. Desactivar en tabla staff y marcar end_date
    const today = new Date().toISOString().split('T')[0]
    const { error: staffError } = await adminClient
      .from('staff')
      .update({ is_active: false, end_date: today })
      .eq('id', staffId)

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    // 3. Banear al usuario en Supabase Auth para que no pueda loguear
    if (staff.auth_user_id) {
      const { error: banError } = await adminClient.auth.admin.updateUserById(
        staff.auth_user_id,
        { ban_duration: '876000h' } // Baneo muy largo (100 años)
      )
      if (banError) {
         console.error("Error baneando auth user:", banError)
         // Continuamos a pesar de haber fallado el baneo en Auth, la app de todas formás validará is_active si hacemos chequeos adicionales, 
         // o idealmente el middleware debería comprobar is_active para evitar el acceso, pero RLS nos protege.
      }
    }

    // 4. Eliminar guard_assignments futuras
    // Buscamos periodos de guardia donde la fecha de inicio es en el futuro
    const { data: futurePeriods, error: periodsError } = await adminClient
      .from('guard_periods')
      .select('id')
      .gt('start_date', today)

    if (!periodsError && futurePeriods && futurePeriods.length > 0) {
      const periodIds = futurePeriods.map(p => p.id)
      
      const { error: deleteGuardsError } = await adminClient
        .from('guard_assignments')
        .delete()
        .eq('staff_id', staffId)
        .in('guard_period_id', periodIds)

      if (deleteGuardsError) {
        console.error("Error borrando asignaciones futuras:", deleteGuardsError)
      }
    }

    return NextResponse.json({ success: true, message: 'Trabajador dado de baja' })
  } catch (error: any) {
    console.error("Internal Error POST /api/staff/deactivate:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
