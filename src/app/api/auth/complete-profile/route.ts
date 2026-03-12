/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { normalizeStaffData } from '@/lib/staff/normalize';

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
      return NextResponse.json({ error: 'Nombre, primer apellido y puesto son obligatorios' }, { status: 400 });
    }

    const { data: position, error: posError } = await supabaseAdmin
      .from('positions')
      .select('id, name')
      .eq('id', position_id)
      .single();

    if (posError || !position) {
      return NextResponse.json({ error: 'Puesto no válido' }, { status: 400 });
    }

    const { data: existingStaff } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (existingStaff) {
      return NextResponse.json({ error: 'Ya tienes un perfil creado' }, { status: 409 });
    }

    // Usar normalizeStaffData para insertar datos coherentes
    const staffData = normalizeStaffData({
      auth_user_id: user.id,
      first_name, last_name, second_last_name,
      email: user.email!,
      phone, position_id, notes: null,
    });

    const { data: insertedStaff, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert(staffData)
      .select('*, positions(name)')
      .single();

    if (staffError) throw staffError;

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, profile_completed: true },
    });

    return NextResponse.json({ success: true, staff: insertedStaff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
