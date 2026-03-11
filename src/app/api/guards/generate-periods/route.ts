/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGuardPeriods } from '@/lib/guards/period-generator';

export async function POST(request: NextRequest) {
  try {
    const { year, force } = await request.json();

    if (!year || year < 2024 || year > 2030) {
      return NextResponse.json(
        { error: 'Año no válido (2024-2030)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Comprobar si ya existen periodos para ese año
    const { data: existing, error: checkError } = await supabase
      .from('guard_periods')
      .select('id')
      .eq('year', year);

    if (checkError) throw checkError;

    if (existing && existing.length > 0 && !force) {
      return NextResponse.json({
        exists: true,
        count: existing.length,
        message: `Ya existen ${existing.length} periodos para ${year}. Envía force: true para regenerar.`,
      });
    }

    // Si force=true, borrar existentes (CASCADE borra guard_assignments)
    if (force && existing && existing.length > 0) {
      const { error: deleteError } = await supabase
        .from('guard_periods')
        .delete()
        .eq('year', year);
      if (deleteError) throw deleteError;
    }

    // Generar periodos
    const periods = generateGuardPeriods(year);

    // Insertar en batch
    const { data: inserted, error: insertError } = await supabase
      .from('guard_periods')
      .insert(periods)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      first: periods[0],
      last: periods[periods.length - 1],
      message: `Generados ${inserted?.length} periodos de guardia para ${year}`,
      data: inserted
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
