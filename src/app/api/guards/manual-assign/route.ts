import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { periodId, assignments } = await request.json();

    if (!periodId || !assignments) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Eliminar las asignaciones manuales / actuales previas de ese periodo en general,
    // o simplemente actualizamos las que viajan.
    // Lo más seguro es borrar las de ese periodo y recrearlas (o hacer upsert).
    // Usaremos un barrido = borra para este periodo y las inserta.
    const { error: deleteError } = await supabase
      .from('guard_assignments')
      .delete()
      .eq('guard_period_id', periodId);

    if (deleteError) throw deleteError;

    const inserts = [];
    if (assignments.auxilio) {
      inserts.push({
        guard_period_id: periodId,
        staff_id: assignments.auxilio,
        assigned_by: 'manual'
      });
    }
    if (assignments.tramitador) {
      inserts.push({
        guard_period_id: periodId,
        staff_id: assignments.tramitador,
        assigned_by: 'manual'
      });
    }
    if (assignments.gestor) {
      inserts.push({
        guard_period_id: periodId,
        staff_id: assignments.gestor,
        assigned_by: 'manual'
      });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('guard_assignments')
        .insert(inserts);

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, message: 'Guardia actualizada correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
