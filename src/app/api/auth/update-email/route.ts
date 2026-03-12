import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { newEmail } = await request.json();

    if (!newEmail) {
      return NextResponse.json(
        { error: 'El nuevo email es obligatorio' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Actualizar el usuario en Supabase Auth
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { email: newEmail, email_confirm: true }
    );

    if (updateAuthError) {
      console.error('Error updating auth email:', updateAuthError);
      return NextResponse.json(
        { error: 'Error al actualizar las credenciales de acceso' },
        { status: 500 }
      );
    }

    // 2. Actualizar el email en la tabla staff para mantener la sincronización
    const { error: updateStaffError } = await adminClient
      .from('staff')
      .update({ email: newEmail })
      .eq('auth_user_id', user.id);

    if (updateStaffError) {
      console.error('Error updating staff email:', updateStaffError);
      // No devolvemos error fatal aquí porque el Auth ya se actualizó, 
      // pero es un estado inconsistente. El admin debería revisarlo.
    }

    return NextResponse.json({
      success: true,
      message: 'Email actualizado correctamente. Por favor, usa tu nuevo email la próxima vez que inicies sesión.'
    });

  } catch (error: any) {
    console.error('Unexpected error updating email:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
