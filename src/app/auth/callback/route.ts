export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const supabaseAdmin = createAdminClient();
  const { searchParams, origin } = new URL(request.url);

  // Prevenir open redirect por Host-header injection: solo aceptar orígenes conocidos
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const safeOrigin = origin === allowedOrigin ? origin : allowedOrigin
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError && sessionData?.user) {
      const user = sessionData.user;

      // Reconciliación de identidad: busca por auth_user_id O por email
      // Cubre el caso de perfiles pre-creados manualmente (auth_user_id IS NULL)
      const { data: reconciliationRaw } = await supabaseAdmin
        .rpc('reconcile_staff_identity', {
          p_auth_user_id: user.id,
          p_email: user.email ?? '',
        })
        .single();

      const reconciliation = reconciliationRaw as { staff_id: string | null; was_linked: boolean } | null

      if (reconciliation?.staff_id) {
        // Perfil encontrado (ya vinculado o recién enlazado) → dashboard
        return NextResponse.redirect(`${safeOrigin}/dashboard`);
      }

      // Sin perfil → necesita completar datos por primera vez
      return NextResponse.redirect(`${safeOrigin}/auth/complete-profile`);
    }
  }

  return NextResponse.redirect(`${safeOrigin}/login?error=auth`);
}
