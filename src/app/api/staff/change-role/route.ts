import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { staffChangeRoleSchema } from '@/lib/validators/schemas'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, staffChangeRoleSchema)
  if (!validation.success) return validation.response

  const { staff_id, new_role } = validation.data

  try {
    const adminClient = createAdminClient()

    // Prevenir eliminar el último headmaster
    if (new_role === 'worker') {
      const { data: headmasters } = await adminClient
        .from('staff')
        .select('id')
        .eq('role', 'headmaster')
        .eq('is_active', true)

      if (headmasters && headmasters.length <= 1) {
        const isLastHeadmaster = headmasters.some(h => h.id === staff_id)
        if (isLastHeadmaster) {
          return NextResponse.json(
            { error: 'No se puede quitar el rol de Headmaster al último administrador. Nombra otro Headmaster primero.' },
            { status: 400 }
          )
        }
      }
    }

    const { error } = await adminClient
      .from('staff')
      .update({ role: new_role })
      .eq('id', staff_id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Rol actualizado a ${new_role === 'headmaster' ? 'Headmaster' : 'Trabajador'}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
