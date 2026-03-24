import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Devuelve los miembros del personal que aún NO tienen una cuenta Google vinculada.
// Se identifican como los que tienen un email que termina en .local (cuentas de prueba creadas
// por el administrador antes de que el usuario hiciera su primer login con Google).
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  const { data: staff, error } = await adminClient
    .from('staff')
    .select('id, first_name, last_name, second_last_name, email, positions(name)')
    .eq('is_active', true)
    .ilike('email', '%.local')
    .order('first_name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ staff: staff ?? [] })
}
