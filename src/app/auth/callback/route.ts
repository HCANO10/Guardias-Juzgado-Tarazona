/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError && sessionData?.user) {
      const user = sessionData.user;

      // Verificar si ya tiene perfil en staff
      const { data: existingStaff } = await supabaseAdmin
        .from('staff')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!existingStaff) {
        // Usuario nuevo de Google → completar perfil
        const response = NextResponse.redirect(`${origin}/auth/complete-profile`)
        response.cookies.set('staff-profile-status', 'false', { path: '/' })
        return response
      }

      // Usuario existente → dashboard
      const response = NextResponse.redirect(`${origin}/dashboard`)
      response.cookies.set('staff-profile-status', 'true', { path: '/', maxAge: 60 * 60 * 24 * 7 })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
