import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Verificar sesión
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

    // 1. Obtener al trabajador
    const { data: staff, error: fetchError } = await adminClient
      .from('staff')
      .select('auth_user_id')
      .eq('id', staffId)
      .single()

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // 2. Reactivar en tabla staff
    const { error: staffError } = await adminClient
      .from('staff')
      .update({ is_active: true, end_date: null })
      .eq('id', staffId)

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    // 3. Desbanear al usuario en Supabase Auth
    if (staff.auth_user_id) {
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(
        staff.auth_user_id,
        { ban_duration: 'none' } // Retirar baneo
      )
      if (unbanError) {
         console.error("Error retirando el ban de auth user:", unbanError)
      }
    }

    return NextResponse.json({ success: true, message: 'Trabajador reactivado' })
  } catch (error: any) {
    console.error("Internal Error POST /api/staff/reactivate:", error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
