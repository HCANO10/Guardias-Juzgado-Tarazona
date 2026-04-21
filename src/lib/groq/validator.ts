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

  // --- Verificación de cobertura total ---
  const assignedPeriodIds = new Set(assignments.map(a => a.guard_period_id));
  const missingPeriods: string[] = [];
  const validPeriodArray = Array.from(validPeriodIds);
  for (const pid of validPeriodArray) {
    if (!assignedPeriodIds.has(pid)) {
      const period = periodDates.get(pid);
      missingPeriods.push(period ? `${period.start.toISOString().split('T')[0]}` : pid);
    }
  }
  if (missingPeriods.length > 0) {
    errors.push(`La IA no asignó ${missingPeriods.length} semana(s) — propuesta incompleta: ${missingPeriods.slice(0, 5).join(', ')}${missingPeriods.length > 5 ? ` (+${missingPeriods.length - 5} más)` : ''}. Regenera la propuesta antes de aplicar.`);
  }

  for (const a of assignments) {
    // Periodo válido
    if (!validPeriodIds.has(a.guard_period_id)) {
      errors.push(`Semana ${a.week_number}: guard_period_id no existe en la BD`);
    }
    // Categorías correctas (solo si el campo no es nulo — permite asignaciones parciales)
    if (a.auxilio_staff_id && !staffIds.auxilio.has(a.auxilio_staff_id)) {
      errors.push(`Semana ${a.week_number}: auxilio_staff_id no es un auxilio válido`);
    }
    if (a.tramitador_staff_id && !staffIds.tramitador.has(a.tramitador_staff_id)) {
      errors.push(`Semana ${a.week_number}: tramitador_staff_id no es un tramitador válido`);
    }
    if (a.gestor_staff_id && !staffIds.gestor.has(a.gestor_staff_id)) {
      errors.push(`Semana ${a.week_number}: gestor_staff_id no es un gestor válido`);
    }

    // Campos obligatorios — cada semana necesita las 3 categorías
    if (!a.auxilio_staff_id) {
      errors.push(`Semana ${a.week_number}: falta auxilio_staff_id`);
    }
    if (!a.tramitador_staff_id) {
      errors.push(`Semana ${a.week_number}: falta tramitador_staff_id`);
    }
    if (!a.gestor_staff_id) {
      errors.push(`Semana ${a.week_number}: falta gestor_staff_id`);
    }

    // Conflictos con vacaciones (solo para campos con valor)
    const period = periodDates.get(a.guard_period_id);
    if (period) {
      const assignedIds = [a.auxilio_staff_id, a.tramitador_staff_id, a.gestor_staff_id].filter(Boolean);
      for (const staffId of assignedIds) {
        for (const vac of vacationRanges) {
          if (vac.staff_id === staffId && vac.start <= period.end && vac.end >= period.start) {
            errors.push(`Semana ${a.week_number}: persona ${staffId} tiene vacaciones que solapan`);
          }
        }
      }
    }
  }

  // Equidad por categoría (umbral=1 — coherente con el prompt del sistema)
  const countBy = (key: keyof Pick<ProposalAssignment, 'auxilio_staff_id' | 'tramitador_staff_id' | 'gestor_staff_id'>) => {
    const counts = new Map<string, number>();
    for (const a of assignments) {
      if (a[key]) counts.set(a[key], (counts.get(a[key]) || 0) + 1);
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
      if (diff > 1) {
        warnings.push(`Distribución desigual en ${label}: diferencia de ${diff} guardias`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
