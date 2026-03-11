// src/lib/groq/prompts.ts

interface StaffForPrompt {
  id: string;
  name: string;
  category: 'auxilio' | 'tramitador' | 'gestor';
}

interface PeriodForPrompt {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
}

interface VacationForPrompt {
  staff_id: string;
  staff_name: string;
  start_date: string;
  end_date: string;
}

interface ExistingAssignment {
  guard_period_id: string;
  week_number: number;
  staff_id: string;
  staff_name: string;
  category: string;
}

export interface PromptData {
  year: number;
  staff: StaffForPrompt[];
  periods: PeriodForPrompt[];
  vacations: VacationForPrompt[];
  existingAssignments: ExistingAssignment[];
}

export function buildSystemPrompt(): string {
  return `Eres un asistente experto en planificación de turnos de guardia para juzgados de instrucción en España.

REGLAS ESTRICTAS que debes cumplir sin excepción:

1. COMPOSICIÓN OBLIGATORIA: Cada guardia semanal debe tener exactamente 3 personas:
   - 1 persona de categoría "auxilio"
   - 1 persona de categoría "tramitador"
   - 1 persona de categoría "gestor"
   NUNCA pongas 2 personas de la misma categoría en la misma semana.

2. PERIODO: Cada guardia va de viernes a jueves (7 días naturales).

3. VACACIONES: NUNCA asignes a una persona en una semana donde tiene vacaciones aprobadas. Comprueba solapamiento: si las vacaciones coinciden con cualquier día del periodo viernes-jueves, esa persona NO puede hacer guardia esa semana.

4. EQUIDAD POR CATEGORÍA:
   - Los auxilios se reparten equitativamente ENTRE SÍ (diferencia máxima de 1).
   - Los tramitadores se reparten equitativamente ENTRE SÍ (diferencia máxima de 1).
   - Los gestores se reparten equitativamente ENTRE SÍ (diferencia máxima de 1).
   - NO compares entre categorías (los auxilios siempre tendrán más guardias porque son solo 2).

5. CONSECUTIVAS: Evita que la misma persona tenga guardia en semanas consecutivas. Con solo 2 auxilios será inevitable — alterna Cristina/Natalia semana a semana como patrón base.

6. ASIGNACIONES EXISTENTES: Si hay guardias ya asignadas, respétalas y completa solo lo que falta.

7. COBERTURA TOTAL: Asigna TODAS las semanas. No dejes ninguna vacía.

8. Los festivos NO eximen de guardia.

Responde ÚNICAMENTE con un JSON válido. Sin texto adicional, sin markdown, sin backticks.`;
}

export function buildUserPrompt(data: PromptData): string {
  const byCategory = {
    auxilio: data.staff.filter(s => s.category === 'auxilio'),
    tramitador: data.staff.filter(s => s.category === 'tramitador'),
    gestor: data.staff.filter(s => s.category === 'gestor'),
  };

  return `Genera la distribución de guardias para el año ${data.year} del Juzgado de Tarazona.

PERSONAL ACTIVO POR CATEGORÍA:

Auxilios Judiciales (${byCategory.auxilio.length} personas):
${JSON.stringify(byCategory.auxilio, null, 2)}

Tramitadores/as Procesales (${byCategory.tramitador.length} personas):
${JSON.stringify(byCategory.tramitador, null, 2)}

Gestores/as Procesales (${byCategory.gestor.length} personas):
${JSON.stringify(byCategory.gestor, null, 2)}

SEMANAS DE GUARDIA (${data.periods.length} semanas):
${JSON.stringify(data.periods, null, 2)}

${data.vacations.length > 0
    ? `VACACIONES APROBADAS:\n${JSON.stringify(data.vacations, null, 2)}`
    : 'VACACIONES: No hay vacaciones registradas.'}

${data.existingAssignments.length > 0
    ? `GUARDIAS YA ASIGNADAS (respetar):\n${JSON.stringify(data.existingAssignments, null, 2)}`
    : 'GUARDIAS PREVIAS: No hay guardias previamente asignadas.'}

Responde con este formato JSON exacto:
{
  "assignments": [
    {
      "guard_period_id": "uuid-del-periodo",
      "week_number": 1,
      "auxilio_staff_id": "uuid-del-auxilio",
      "tramitador_staff_id": "uuid-del-tramitador",
      "gestor_staff_id": "uuid-del-gestor"
    }
  ],
  "statistics": {
    "total_weeks": 52,
    "auxilio_distribution": { "Cristina": 26, "Natalia": 26 },
    "tramitador_distribution": { "Iris": 13, "Belén": 13, "Luis": 13, "Irene": 13 },
    "gestor_distribution": { "Mónica": 18, "Rocío": 17, "Valeria": 17 }
  },
  "warnings": []
}`;
}
