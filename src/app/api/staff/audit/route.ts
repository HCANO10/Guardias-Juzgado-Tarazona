/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    const { data: allStaff } = await supabaseAdmin
      .from('staff')
      .select('id, first_name, last_name, second_last_name, email, phone, position_id, auth_user_id, role, is_active');

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

    const issues: string[] = [];

    for (const s of allStaff || []) {
      if (!s.auth_user_id) issues.push(`Staff "${s.first_name} ${s.last_name}" (${s.email}) no tiene auth_user_id vinculado`);
      if (!s.first_name || s.first_name === '(pendiente)') issues.push(`Staff ID ${s.id} tiene nombre pendiente`);
      if (!s.last_name || s.last_name === '(pendiente)') issues.push(`Staff "${s.first_name}" (${s.email}) tiene apellido pendiente`);
      if (!s.position_id) issues.push(`Staff "${s.first_name} ${s.last_name}" no tiene puesto asignado`);
      if (!s.role) issues.push(`Staff "${s.first_name} ${s.last_name}" no tiene rol asignado`);
    }

    for (const u of authUsers?.users || []) {
      const hasStaff = allStaff?.some(s => s.auth_user_id === u.id);
      if (!hasStaff) issues.push(`Auth user ${u.email} (${u.id}) existe en Auth pero NO tiene registro en staff`);
    }

    const emails = allStaff?.map(s => s.email?.toLowerCase()) || [];
    const duplicates = emails.filter((e, i) => emails.indexOf(e) !== i);
    for (const dup of Array.from(new Set(duplicates))) {
      issues.push(`Email duplicado en staff: ${dup}`);
    }

    return NextResponse.json({
      total_staff: allStaff?.length || 0,
      total_auth_users: authUsers?.users?.length || 0,
      issues_found: issues.length,
      issues,
      status: issues.length === 0 ? '✅ Todo correcto' : '⚠️ Hay problemas por resolver',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
