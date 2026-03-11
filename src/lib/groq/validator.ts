// src/lib/groq/validator.ts

export interface ProposalAssignment {
  guard_period_id: string;
  week_number: number;
  auxilio_staff_id: string;
  tramitador_staff_id: string;
  gestor_staff_id: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProposal(
  assignments: ProposalAssignment[],
  validPeriodIds: Set<string>,
  staffIds: {
    auxilio: Set<string>;
    tramitador: Set<string>;
    gestor: Set<string>;
  },
  vacationRanges: Array<{ staff_id: string; start: Date; end: Date }>,
  periodDates: Map<string, { start: Date; end: Date }>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const a of assignments) {
    // Periodo válido
    if (!validPeriodIds.has(a.guard_period_id)) {
      errors.push(`Semana ${a.week_number}: guard_period_id no existe en la BD`);
    }
    // Categorías correctas
    if (!staffIds.auxilio.has(a.auxilio_staff_id)) {
      errors.push(`Semana ${a.week_number}: auxilio_staff_id no es un auxilio válido`);
    }
    if (!staffIds.tramitador.has(a.tramitador_staff_id)) {
      errors.push(`Semana ${a.week_number}: tramitador_staff_id no es un tramitador válido`);
    }
    if (!staffIds.gestor.has(a.gestor_staff_id)) {
      errors.push(`Semana ${a.week_number}: gestor_staff_id no es un gestor válido`);
    }
    // Conflictos con vacaciones
    const period = periodDates.get(a.guard_period_id);
    if (period) {
      for (const staffId of [a.auxilio_staff_id, a.tramitador_staff_id, a.gestor_staff_id]) {
        for (const vac of vacationRanges) {
          if (vac.staff_id === staffId && vac.start <= period.end && vac.end >= period.start) {
            errors.push(`Semana ${a.week_number}: persona ${staffId} tiene vacaciones que solapan`);
          }
        }
      }
    }
  }

  // Equidad por categoría
  const countBy = (key: keyof Pick<ProposalAssignment, 'auxilio_staff_id' | 'tramitador_staff_id' | 'gestor_staff_id'>) => {
    const counts = new Map<string, number>();
    for (const a of assignments) {
      counts.set(a[key], (counts.get(a[key]) || 0) + 1);
    }
    return counts;
  };

  for (const [label, key] of [
    ['auxilios', 'auxilio_staff_id'],
    ['tramitadores', 'tramitador_staff_id'],
    ['gestores', 'gestor_staff_id'],
  ] as const) {
    const counts = countBy(key);
    const values = Array.from(counts.values());
    if (values.length > 0) {
      const diff = Math.max(...values) - Math.min(...values);
      if (diff > 2) {
        warnings.push(`Distribución desigual en ${label}: diferencia de ${diff} guardias`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
