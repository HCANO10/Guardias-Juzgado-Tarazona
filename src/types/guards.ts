// src/types/guards.ts
export interface GuardWeekView {
  period_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  auxilio: { id: string; name: string } | null;
  tramitador: { id: string; name: string } | null;
  gestor: { id: string; name: string } | null;
  coverage: 0 | 1 | 2 | 3; // cuántos de los 3 puestos cubiertos
}
