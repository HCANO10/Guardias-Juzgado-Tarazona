import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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
