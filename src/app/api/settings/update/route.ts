/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();

  if (staff?.role !== 'headmaster') {
    return NextResponse.json({ error: 'No autorizado. Se requiere rol headmaster.' }, { status: 403 });
  }

  try {
    const { active_year, groq_model } = await request.json();

    if (!active_year || !groq_model) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('app_settings')
      .update({ active_year, groq_model })
      .eq('id', 1);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno al actualizar settings' },
      { status: 500 }
    );
  }
}
