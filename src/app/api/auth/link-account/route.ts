import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const linkAccountSchema = z.object({
  staff_id: z.string().uuid(),
  // Campos opcionales: el usuario puede actualizar nombre/apellido desde Google si quiere
  update_name: z.boolean().optional().default(false),
})

// Vincula el auth_user_id del usuario Google actual a un registro de staff existente.
// Actualiza también el email del staff al email real de Google.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 })
  }

  const parsed = linkAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { staff_id, update_name } = parsed.data

  const adminClient = createAdminClient()

  // Verificar que el staff_id existe, es activo y tiene email .local (no vinculado)
  const { data: targetStaff, error: staffError } = await adminClient
    .from('staff')
    .select('id, first_name, last_name, email, auth_user_id')
    .eq('id', staff_id)
    .eq('is_active', true)
    .single()

  if (staffError || !targetStaff) {
    return NextResponse.json({ error: 'Perfil de personal no encontrado' }, { status: 404 })
  }

  // Seguridad: solo permitir vinculación a cuentas con email .local (cuentas de prueba)
  if (!targetStaff.email?.endsWith('.local')) {
    return NextResponse.json({ error: 'Esta cuenta ya tiene un email real vinculado. Contacta con el administrador.' }, { status: 400 })
  }

  // Verificar que no haya otro staff ya vinculado a este auth_user_id (no duplicados)
  const { data: alreadyLinked } = await adminClient
    .from('staff')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (alreadyLinked) {
    return NextResponse.json({ error: 'Tu cuenta de Google ya está vinculada a otro perfil.' }, { status: 400 })
  }

  // Preparar datos de actualización
  const updateData: Record<string, unknown> = {
    auth_user_id: user.id,
    email: user.email,
    updated_at: new Date().toISOString(),
  }

  // Si el usuario quiere actualizar nombre con el de Google
  if (update_name && user.user_metadata) {
    const meta = user.user_metadata as Record<string, string>
    const fullName = meta.full_name || meta.name || ''
    if (fullName) {
      const parts = fullName.trim().split(/\s+/)
      updateData.first_name = parts[0] || targetStaff.first_name
      if (parts.length > 1) {
        updateData.last_name = parts.slice(1).join(' ')
      }
    }
  }

  // Actualizar el registro de staff
  const { data: updatedStaff, error: updateError } = await adminClient
    .from('staff')
    .update(updateData)
    .eq('id', staff_id)
    .select('id, first_name, last_name, email')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Marcar el perfil como completado en auth metadata
  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      profile_completed: true,
    },
  })

  return NextResponse.json({ success: true, staff: updatedStaff })
}
