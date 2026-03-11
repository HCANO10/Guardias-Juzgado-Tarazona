// src/lib/guards/period-generator.ts

export interface GuardPeriod {
  year: number;
  week_number: number;
  start_date: string; // YYYY-MM-DD (viernes)
  end_date: string;   // YYYY-MM-DD (jueves)
}

/**
 * Genera todos los periodos de guardia viernes→jueves para un año completo.
 * - El primer periodo empieza el primer viernes >= 1 de enero del año.
 * - Los periodos son consecutivos sin huecos (cada viernes siguiente).
 * - El último periodo incluye al menos un día del año objetivo.
 */
export function generateGuardPeriods(year: number): GuardPeriod[] {
  const periods: GuardPeriod[] = [];

  // Encontrar el primer viernes del año (o el más cercano al 1 de enero)
  const janFirst = new Date(year, 0, 1); // 1 de enero
  let firstFriday = new Date(janFirst);

  // Avanzar hasta el primer viernes (día 5 = viernes)
  while (firstFriday.getDay() !== 5) {
    firstFriday.setDate(firstFriday.getDate() + 1);
  }

  // Si el primer viernes es después del 4 de enero, retroceder una semana
  // para cubrir los primeros días del año
  if (firstFriday.getDate() > 4) {
    firstFriday.setDate(firstFriday.getDate() - 7);
  }

  let currentFriday = new Date(firstFriday);
  let weekNumber = 1;

  // Generar periodos hasta cubrir todo el año
  while (true) {
    const thursday = new Date(currentFriday);
    thursday.setDate(thursday.getDate() + 6); // viernes + 6 = jueves

    // Formatear fechas
    const startStr = formatDate(currentFriday);
    const endStr = formatDate(thursday);

    periods.push({
      year,
      week_number: weekNumber,
      start_date: startStr,
      end_date: endStr,
    });

    // Avanzar al siguiente viernes
    currentFriday.setDate(currentFriday.getDate() + 7);
    weekNumber++;

    // Parar cuando el viernes ya está en el año siguiente
    // Y el jueves anterior ya cubría el último día del año
    if (currentFriday.getFullYear() > year && thursday.getFullYear() >= year) {
      // Verificar si necesitamos un periodo más para cubrir el 31 de diciembre
      const lastDayOfYear = new Date(year, 11, 31);
      if (thursday < lastDayOfYear) {
        // Necesitamos un periodo más
        const extraThursday = new Date(currentFriday);
        extraThursday.setDate(extraThursday.getDate() + 6);
        periods.push({
          year,
          week_number: weekNumber,
          start_date: formatDate(currentFriday),
          end_date: formatDate(extraThursday),
        });
      }
      break;
    }
  }

  return periods;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
