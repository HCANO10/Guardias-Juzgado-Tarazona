import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callGroq } from '@/lib/groq/client';
import { buildSystemPrompt, buildUserPrompt, PromptData } from '@/lib/groq/prompts';
import { validateProposal, ProposalAssignment } from '@/lib/groq/validator';

export async function POST(request: NextRequest) {
  try {
    const { year, respectExisting = true } = await request.json();

    if (!year) {
      return NextResponse.json({ error: 'Año no proporcionado' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Obtener Modelo desde app_settings
    const { data: settings } = await supabase.from('app_settings').select('groq_model').eq('id', 1).single();
    const model = settings?.groq_model || 'llama-3.3-70b-versatile';

    // 2. Traer Personal Activo
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, positions!inner(guard_role)')
      .eq('is_active', true)
      .not('positions.guard_role', 'is', null);

    if (staffError) throw new Error("Error obteniendo personal activo");

    const promptStaff = (staffData || []).map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      category: (s.positions as any).guard_role
    }));

    // 3. Traer Periodos de la BD
    const { data: periodsData, error: periodsError } = await supabase
      .from('guard_periods')
      .select('id, week_number, start_date, end_date')
      .eq('year', year)
      .order('week_number', { ascending: true });

    if (periodsError || !periodsData || periodsData.length === 0) {
      return NextResponse.json({ error: `No hay periodos generados para ${year}. Genéralos en Configuración.` }, { status: 400 });
    }

    // 4. Traer Vacaciones Aprobadas (dentro de los rangos de fechas de los periodos)
    const yearStart = periodsData[0].start_date;
    const yearEnd = periodsData[periodsData.length - 1].end_date;

    const { data: vacationsData, error: vacError } = await supabase
      .from('vacations')
      .select('staff_id, start_date, end_date, staff(first_name, last_name)')
      .eq('status', 'aprobado')
      .lte('start_date', yearEnd)
      .gte('end_date', yearStart);

    if (vacError) throw new Error("Error obteniendo vacaciones");

    const promptVacations = (vacationsData || []).map(v => ({
      staff_id: v.staff_id,
      staff_name: `${(v.staff as any).first_name} ${(v.staff as any).last_name}`,
      start_date: v.start_date,
      end_date: v.end_date
    }));

    // 5. Traer Asignaciones ya existentes
    let promptExisting: any[] = [];
    if (respectExisting) {
      const { data: existingData, error: existError } = await supabase
        .from('guard_assignments')
        .select(`
          guard_period_id,
          staff_id,
          guard_periods!inner(year, week_number),
          staff!inner(first_name, last_name, positions!inner(guard_role))
        `)
        .eq('guard_periods.year', year);

      if (existError) throw new Error("Error obteniendo asignaciones previas");

      promptExisting = (existingData || []).map(e => ({
        guard_period_id: e.guard_period_id,
        week_number: (e.guard_periods as any).week_number,
        staff_id: e.staff_id,
        staff_name: `${(e.staff as any).first_name} ${(e.staff as any).last_name}`,
        category: ((e.staff as any).positions as any).guard_role
      }));
    }

    // --- PREPARAR DATOS DEL PROMPT ---
    const promptData: PromptData = {
      year,
      staff: promptStaff as any,
      periods: periodsData,
      vacations: promptVacations,
      existingAssignments: promptExisting
    };

    const sysPrompt = buildSystemPrompt();
    const usrPrompt = buildUserPrompt(promptData);

    // --- LLAMAR A GROQ ---
    const groqResponseText = await callGroq(sysPrompt, usrPrompt, model);

    // --- PARSEO ROBUSTO DEL JSON ---
    let parsedData = null;
    try {
      parsedData = JSON.parse(groqResponseText);
    } catch (e) {
      // Intentar limpiar backticks
      const cleanJson = groqResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        parsedData = JSON.parse(cleanJson);
      } catch (e2) {
         console.error("Groq Raw Answer:", groqResponseText);
         throw new Error("Groq no devolvió un JSON válido. Intenta de nuevo.");
      }
    }

    if (!parsedData || !parsedData.assignments) {
       throw new Error("El JSON de Groq no contiene 'assignments'");
    }

    // --- VALIDACIÓN ESTRICTA LOCAL ---
    const validPeriodIds = new Set(periodsData.map(p => p.id));
    const staffIdsByCategory = {
      auxilio: new Set(promptStaff.filter(s => s.category === 'auxilio').map(s => s.id)),
      tramitador: new Set(promptStaff.filter(s => s.category === 'tramitador').map(s => s.id)),
      gestor: new Set(promptStaff.filter(s => s.category === 'gestor').map(s => s.id)),
    };
    
    const vacationRanges = promptVacations.map(v => ({
      staff_id: v.staff_id,
      start: new Date(v.start_date),
      end: new Date(v.end_date)
    }));

    const periodDates = new Map<string, { start: Date, end: Date }>();
    periodsData.forEach(p => {
      periodDates.set(p.id, { start: new Date(p.start_date), end: new Date(p.end_date) });
    });

    const validation = validateProposal(
      parsedData.assignments as ProposalAssignment[],
      validPeriodIds,
      staffIdsByCategory,
      vacationRanges,
      periodDates
    );

    // Add Groq's own warnings if any
    const allWarnings = [...(parsedData.warnings || []), ...validation.warnings];

    return NextResponse.json({
      success: true,
      proposal: parsedData,
      validation: {
         valid: validation.valid,
         errors: validation.errors,
         warnings: allWarnings
      }
    });

  } catch (error: any) {
    console.error("Error groq-generate:", error);
    return NextResponse.json(
      { error: error.message || 'Error interno contactando con Groq' },
      { status: 500 }
    );
  }
}
