/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: requester } = await supabaseAdmin
      .from('staff')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (requester?.role !== 'headmaster') {
      return NextResponse.json({ error: 'Solo un Headmaster puede cambiar roles' }, { status: 403 });
    }

    const { staff_id, new_role } = await request.json();

    if (!staff_id || !['headmaster', 'worker'].includes(new_role)) {
      return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
    }

    if (new_role === 'worker') {
      const { data: headmasters } = await supabaseAdmin
        .from('staff')
        .select('id')
        .eq('role', 'headmaster')
        .eq('is_active', true);

      if (headmasters && headmasters.length <= 1) {
        const isLastHeadmaster = headmasters.some(h => h.id === staff_id);
        if (isLastHeadmaster) {
          return NextResponse.json(
            { error: 'No se puede quitar el rol de Headmaster al último administrador. Nombra otro Headmaster primero.' },
            { status: 400 }
          );
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('staff')
      .update({ role: new_role })
      .eq('id', staff_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Rol actualizado a ${new_role === 'headmaster' ? 'Headmaster' : 'Trabajador'}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
