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
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { first_name, last_name, second_last_name, phone, position_id } = await request.json();

    if (!first_name || !last_name || !position_id) {
      return NextResponse.json(
        { error: 'Nombre, primer apellido y puesto son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar puesto
    const { data: position, error: posError } = await supabaseAdmin
      .from('positions')
      .select('id, name')
      .eq('id', position_id)
      .single();

    if (posError || !position) {
      return NextResponse.json({ error: 'Puesto no válido' }, { status: 400 });
    }

    // Verificar que no exista ya en staff
    const { data: existingStaff } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (existingStaff) {
      return NextResponse.json({ error: 'Ya tienes un perfil creado' }, { status: 409 });
    }

    // Crear registro en staff
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        auth_user_id: user.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        second_last_name: second_last_name?.trim() || null,
        email: user.email!.toLowerCase(),
        phone: phone?.trim() || null,
        position_id,
        is_active: true,
        start_date: new Date().toISOString().split('T')[0],
      })
      .select('*, positions(name)')
      .single();

    if (staffError) throw staffError;

    // Marcar perfil como completado en Auth metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, profile_completed: true },
    });

    return NextResponse.json({ success: true, staff: staffData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
