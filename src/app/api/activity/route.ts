/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabaseAdmin
      .from('activity_log')
      .select(`
        *,
        staff:performed_by(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) query = query.eq('entity_type', type);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, entity_type, entity_id, details, performed_by } = body;

    const { data, error } = await supabaseAdmin
      .from('activity_log')
      .insert({ action, entity_type, entity_id, details, performed_by })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
