/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { periodId1, staffId1, periodId2, staffId2, swapperStaffId } = body;

    // Verificar que ambas asignaciones existen
    const { data: assign1, error: err1 } = await supabaseAdmin
      .from('guard_assignments')
      .select('id, staff_id, guard_period_id')
      .eq('guard_period_id', periodId1)
      .eq('staff_id', staffId1)
      .single();

    const { data: assign2, error: err2 } = await supabaseAdmin
      .from('guard_assignments')
      .select('id, staff_id, guard_period_id')
      .eq('guard_period_id', periodId2)
      .eq('staff_id', staffId2)
      .single();

    if (err1 || !assign1 || err2 || !assign2) {
      return NextResponse.json({ error: 'No se encontraron las asignaciones a intercambiar' }, { status: 404 });
    }

    // Intercambiar: asign1 staff → staffId2, asign2 staff → staffId1
    const { error: upd1 } = await supabaseAdmin
      .from('guard_assignments')
      .update({ staff_id: staffId2, assigned_by: 'manual' })
      .eq('id', assign1.id);

    const { error: upd2 } = await supabaseAdmin
      .from('guard_assignments')
      .update({ staff_id: staffId1, assigned_by: 'manual' })
      .eq('id', assign2.id);

    if (upd1 || upd2) {
      throw new Error('Error al actualizar las asignaciones');
    }

    // Registrar en activity_log (si la tabla existe)
    try {
      await supabaseAdmin.from('activity_log').insert({
        action: 'guard_swapped',
        entity_type: 'guard_assignment',
        details: { periodId1, staffId1, periodId2, staffId2 },
        performed_by: swapperStaffId || null,
      });
    } catch (_) { /* Si no existe la tabla, ignorar */ }

    return NextResponse.json({ success: true, message: 'Guardia intercambiada correctamente' });
  } catch (error: any) {
    console.error('Error intercambiando guardias:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
