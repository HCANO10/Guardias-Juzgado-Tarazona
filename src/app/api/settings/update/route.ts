import { NextRequest, NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { settingsUpdateSchema } from '@/lib/validators/schemas'
import { setSetting } from '@/lib/settings'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, settingsUpdateSchema)
  if (!validation.success) return validation.response

  const { active_year, groq_model } = validation.data

  try {
    // Update each setting by key
    if (active_year !== undefined) {
      await setSetting(auth.supabase, 'current_year', String(active_year), 'Año activo para gestión de guardias')
    }
    if (groq_model !== undefined) {
      await setSetting(auth.supabase, 'groq_model', groq_model, 'Modelo de Groq para generación de guardias')
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno al actualizar settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
