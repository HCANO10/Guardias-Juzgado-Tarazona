// src/lib/validators/vacation-guard.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { parseISO } from 'date-fns';

export interface VacationConflict {
  guard_period_id: string;
  guard_week_number: number;
  guard_start_date: string;
  guard_end_date: string;
  overlap_start: string;
  overlap_end: string;
}

export interface VacationConflictResult {
  valid: boolean;
  conflicts: VacationConflict[];
}

interface GuardPeriodData {
  week_number: number;
  start_date: string;
  end_date: string;
}

export async function checkVacationGuardConflict(
  supabase: SupabaseClient,
  staffId: string,
  startDate: string,
  endDate: string
): Promise<VacationConflictResult> {
  // Obtener todas las guardias asignadas a esta persona
  const { data: assignments, error } = await supabase
    .from('guard_assignments')
    .select(`
      guard_period_id,
      guard_periods!inner(week_number, start_date, end_date)
    `)
    .eq('staff_id', staffId);

  if (error) throw error;

  const vacStart = parseISO(startDate);
  const vacEnd = parseISO(endDate);
  const conflicts: VacationConflict[] = [];

  for (const assignment of assignments || []) {
    const gp = (assignment as unknown as { guard_periods: GuardPeriodData }).guard_periods;
    const guardStart = parseISO(gp.start_date);
    const guardEnd = parseISO(gp.end_date);

    // Hay solapamiento si: vacStart <= guardEnd AND vacEnd >= guardStart
    if (vacStart <= guardEnd && vacEnd >= guardStart) {
      // Calcular el rango exacto de solapamiento
      const overlapStart = vacStart > guardStart ? vacStart : guardStart;
      const overlapEnd = vacEnd < guardEnd ? vacEnd : guardEnd;

      conflicts.push({
        guard_period_id: assignment.guard_period_id,
        guard_week_number: gp.week_number,
        guard_start_date: gp.start_date,
        guard_end_date: gp.end_date,
        overlap_start: overlapStart.toISOString().split('T')[0],
        overlap_end: overlapEnd.toISOString().split('T')[0],
      });
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts,
  };
}
