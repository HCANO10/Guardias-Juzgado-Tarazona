/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/vacations/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkVacationGuardConflict } from '@/lib/validators/vacation-guard';

export async function POST(request: NextRequest) {
  try {
    const { staff_id, start_date, end_date } = await request.json();

    if (!staff_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json({ error: 'La fecha de inicio debe ser anterior a la de fin' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await checkVacationGuardConflict(supabase, staff_id, start_date, end_date);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
