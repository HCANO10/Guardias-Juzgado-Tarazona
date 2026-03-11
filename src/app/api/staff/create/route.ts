/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { first_name, last_name, email, position_id, start_date, notes, password } = body;

    if (!first_name || !last_name || !email || !position_id) {
      return NextResponse.json(
        { error: 'Campos obligatorios: nombre, apellidos, email y puesto' },
        { status: 400 }
      );
    }

    const userPassword = password || 'Tarazona123456';

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (authError) {
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        return NextResponse.json(
          { error: `Ya existe un usuario con el email ${email}` },
          { status: 409 }
        );
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario en Auth');
    }

    // 2. Insertar en tabla staff
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        auth_user_id: authData.user.id,
        first_name,
        last_name,
        email,
        position_id,
        is_active: true,
        start_date: start_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select('*, positions(name, guard_role)')
      .single();

    if (staffError) {
      // Rollback: eliminar usuario Auth si falla la inserción en staff
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw staffError;
    }

    return NextResponse.json({
      success: true,
      staff: staffData,
      message: `Usuario creado: ${first_name} ${last_name} (${email}). Contraseña: ${userPassword}`,
    });
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear usuario' },
      { status: 500 }
    );
  }
}
