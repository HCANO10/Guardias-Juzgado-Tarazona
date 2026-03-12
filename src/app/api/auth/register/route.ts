/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeStaffData } from '@/lib/staff/normalize';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const {
      first_name, last_name, second_last_name,
      email, phone, password, position_id,
    } = await request.json();

    if (!first_name || !last_name || !email || !password || !position_id) {
      return NextResponse.json(
        { error: 'Los campos nombre, primer apellido, email, contraseña y puesto son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El formato del email no es válido' }, { status: 400 });
    }

    const { data: position, error: posError } = await supabaseAdmin
      .from('positions')
      .select('id, name, guard_role')
      .eq('id', position_id)
      .single();

    if (posError || !position) {
      return NextResponse.json({ error: 'Debes seleccionar un puesto de trabajo válido' }, { status: 400 });
    }

    const { data: existingStaff } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingStaff) {
      return NextResponse.json({ error: 'Ya existe un usuario registrado con ese email' }, { status: 409 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name, last_name,
        second_last_name: second_last_name || null,
        phone: phone || null,
        profile_completed: true,
      },
    });

    if (authError) {
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        return NextResponse.json({ error: 'Ya existe un usuario con ese email en el sistema' }, { status: 409 });
      }
      throw authError;
    }

    if (!authData.user) throw new Error('No se pudo crear el usuario');

    // Usar normalizeStaffData para insertar datos coherentes
    const staffData = normalizeStaffData({
      auth_user_id: authData.user.id,
      first_name, last_name, second_last_name,
      email, phone, position_id, notes: null,
    });

    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert(staffData);

    if (staffError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw staffError;
    }

    return NextResponse.json({
      success: true,
      message: `Cuenta creada correctamente. Ya puedes iniciar sesión con ${email}`,
      staff: {
        name: [first_name, last_name, second_last_name].filter(Boolean).join(' '),
        position: position.name,
        email: email.toLowerCase().trim(),
      },
    });
  } catch (error: any) {
    console.error('Error en registro:', error);
    return NextResponse.json({ error: error.message || 'Error al crear la cuenta' }, { status: 500 });
  }
}
