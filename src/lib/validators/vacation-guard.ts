/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/validators/vacation-guard.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from '@supabase/supabase-js';

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

  const vacStart = new Date(startDate);
  const vacEnd = new Date(endDate);
  const conflicts: VacationConflict[] = [];

  for (const assignment of assignments || []) {
    const gp = assignment.guard_periods as any;
    const guardStart = new Date(gp.start_date);
    const guardEnd = new Date(gp.end_date);

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
