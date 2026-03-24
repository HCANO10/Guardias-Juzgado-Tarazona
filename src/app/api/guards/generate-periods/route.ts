import { NextRequest, NextResponse } from 'next/server'
import { requireHeadmaster } from '@/lib/auth/require-role'
import { validateBody } from '@/lib/validators/api'
import { guardGeneratePeriodsSchema } from '@/lib/validators/schemas'
import { generateGuardPeriods } from '@/lib/guards/period-generator'

export async function POST(request: NextRequest) {
  const auth = await requireHeadmaster()
  if (!auth.success) return auth.response

  const validation = await validateBody(request, guardGeneratePeriodsSchema)
  if (!validation.success) return validation.response

  const { year, force } = validation.data

  try {
    // Comprobar si ya existen periodos para ese año
    const { data: existing, error: checkError } = await auth.supabase
      .from('guard_periods')
      .select('id')
      .eq('year', year)

    if (checkError) throw checkError

    if (existing && existing.length > 0 && !force) {
      return NextResponse.json({
        exists: true,
        count: existing.length,
        message: `Ya existen ${existing.length} periodos para ${year}. Envía force: true para regenerar.`,
      })
    }

    // Si force=true, borrar existentes (CASCADE borra guard_assignments)
    if (force && existing && existing.length > 0) {
      const { error: deleteError } = await auth.supabase
        .from('guard_periods')
        .delete()
        .eq('year', year)
      if (deleteError) throw deleteError
    }

    // Generar e insertar periodos
    const periods = generateGuardPeriods(year)
    const { data: inserted, error: insertError } = await auth.supabase
      .from('guard_periods')
      .insert(periods)
      .select()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      first: periods[0],
      last: periods[periods.length - 1],
      message: `Generados ${inserted?.length} periodos de guardia para ${year}`,
      data: inserted,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
