'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { EventInput } from '@fullcalendar/core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DSCard,
  DSBadge
} from '@/lib/design-system';
import { Layers, Users } from 'lucide-react';

// Loaded only on the client to avoid SSR hydration issues with date-dependent state
const ExportPDFButton = dynamic(
  () => import('./ExportPDFButton').then(m => ({ default: m.ExportPDFButton })),
  { ssr: false },
);

/**
 * Adds 1 day to a YYYY-MM-DD string using LOCAL calendar arithmetic.
 * Avoids timezone offset bugs that occur with toISOString() in UTC+N zones.
 */
function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1); // local midnight
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

interface CalendarStaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface CalendarGuard {
  id: string;
  week_number?: number;
  start_date: string;
  end_date: string;
  auxilio: { id: string; first_name: string; last_name?: string } | null;
  tramitador: { id: string; first_name: string; last_name?: string } | null;
  gestor: { id: string; first_name: string; last_name?: string } | null;
}

interface CalendarVacation {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  tipo?: string | null;
  staff: { first_name: string; last_name?: string } | null;
}

interface CalendarHoliday {
  id: string;
  date: string;
  name: string;
  scope: string;
}

interface UnifiedCalendarProps {
  guards: CalendarGuard[];
  vacations: CalendarVacation[];
  holidays: CalendarHoliday[];
  staff: CalendarStaffMember[];
  /** Pre-select a person in the filter dropdown (e.g. current user on dashboard) */
  defaultPersonFilter?: string;
  /** Render the PDF export button inside the filter card */
  showExport?: boolean;
}

export default function UnifiedCalendar({
  guards,
  vacations,
  holidays,
  staff,
  defaultPersonFilter,
  showExport,
}: UnifiedCalendarProps) {
  const [personFilter, setPersonFilter] = useState(defaultPersonFilter ?? 'all');
  const [showGuards, setShowGuards] = useState(true);
  const [showVacations, setShowVacations] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);

  const events = useMemo(() => {
    const allEvents: EventInput[] = [];

    // 1. Guardias (Rojo)
    if (showGuards) {
      guards.forEach(g => {
        if (personFilter !== 'all') {
          const hasPerson =
            g.auxilio?.id === personFilter ||
            g.tramitador?.id === personFilter ||
            g.gestor?.id === personFilter;
          if (!hasPerson) return;
        }

        const titleParts = [
          `A: ${g.auxilio?.first_name || '—'}`,
          `T: ${g.tramitador?.first_name || '—'}`,
          `G: ${g.gestor?.first_name || '—'}`,
        ];
        const isUncovered = !g.auxilio && !g.tramitador && !g.gestor;

        allEvents.push({
          id: `guard-${g.id}`,
          title: isUncovered ? '🛡️ SIN CUBRIR' : `🛡️ ${titleParts.join(' | ')}`,
          start: g.start_date,
          end: nextDay(g.end_date),   // exclusive end → spans Fri–Thu inclusive
          allDay: true,
          backgroundColor: isUncovered ? '#991B1B' : '#DC2626',
          borderColor: 'transparent',
          textColor: '#ffffff',
          extendedProps: { type: 'guard' },
        });
      });
    }

    // 2. Vacaciones (Verde)
    if (showVacations) {
      vacations.forEach(v => {
        if (personFilter !== 'all' && v.staff_id !== personFilter) return;

        allEvents.push({
          id: `vac-${v.id}`,
          title: `🌴 ${v.staff?.first_name}`,
          start: v.start_date,
          end: nextDay(v.end_date),
          allDay: true,
          backgroundColor: '#34C759',
          borderColor: 'transparent',
          textColor: '#ffffff',
          extendedProps: { type: 'vacation' },
        });
      });
    }

    // 3. Festivos
    if (showHolidays) {
      holidays.forEach(h => {
        let bgColor = '#FEF3C7';
        let borderColor = '#F59E0B';
        let textColor = '#92400E';
        if (h.scope === 'aragon') {
          bgColor = '#FFF7ED'; borderColor = '#F97316'; textColor = '#9A3412';
        } else if (h.scope === 'zaragoza_provincia') {
          bgColor = '#EFF6FF'; borderColor = '#3B82F6'; textColor = '#1E3A8A';
        } else if (h.scope === 'tarazona') {
          bgColor = '#EEF2FF'; borderColor = '#6366F1'; textColor = '#312E81';
        }

        allEvents.push({
          id: `holiday-bg-${h.id}`,
          title: '',
          start: h.date,
          allDay: true,
          display: 'background',
          backgroundColor: bgColor,
          extendedProps: { type: 'holiday' },
        });

        allEvents.push({
          id: `holiday-${h.id}`,
          title: `🎉 ${h.name}`,
          start: h.date,
          allDay: true,
          backgroundColor: bgColor,
          borderColor: borderColor,
          textColor: textColor,
          classNames: ['holiday-event'],
          extendedProps: { type: 'holiday', scope: h.scope },
        });
      });
    }

    return allEvents;
  }, [guards, vacations, holidays, personFilter, showGuards, showVacations, showHolidays]);

  // ── Filtered data passed to PDF export ────────────────────────────────────
  const guardsForExport = useMemo(() => {
    if (!showGuards) return [];
    if (personFilter === 'all') return guards;
    return guards.filter(
      g =>
        g.auxilio?.id === personFilter ||
        g.tramitador?.id === personFilter ||
        g.gestor?.id === personFilter,
    );
  }, [guards, personFilter, showGuards]);

  const vacationsForExport = useMemo(() => {
    if (!showVacations) return [];
    if (personFilter === 'all') return vacations;
    return vacations.filter(v => v.staff_id === personFilter);
  }, [vacations, personFilter, showVacations]);

  const holidaysForExport = useMemo(
    () => (showHolidays ? holidays : []),
    [holidays, showHolidays],
  );

  const filterLabel = useMemo(() => {
    if (personFilter === 'all') return undefined;
    const p = staff.find(s => s.id === personFilter);
    return p ? `${p.first_name} ${p.last_name}` : undefined;
  }, [personFilter, staff]);

  return (
    <div className="space-y-8">
      <DSCard className="p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-6 items-center">
            {/* Person filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">
                <Users className="h-3.5 w-3.5" /> Filtrar Personal
              </div>
              <Select value={personFilter} onValueChange={setPersonFilter}>
                <SelectTrigger className="w-full sm:w-[220px] h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]">
                  <SelectValue placeholder="Cualquier persona" />
                </SelectTrigger>
                <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                  <SelectItem value="all">Todo el personal</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layer toggles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">
                <Layers className="h-3.5 w-3.5" /> Capas Visibles
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-h-[44px] px-3 sm:px-4 py-2 sm:py-0 sm:h-11 rounded-[12px] bg-[#F2F2F7]/50 border border-black/[0.04]">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="guards"
                    checked={showGuards}
                    onCheckedChange={(v) => setShowGuards(!!v)}
                    className="rounded-[4px] border-black/20 data-[state=checked]:bg-[#DC2626] data-[state=checked]:border-[#DC2626]"
                  />
                  <label htmlFor="guards" className="text-[14px] font-medium text-neutral-900 cursor-pointer">
                    Guardias
                  </label>
                </div>
                <div className="w-[1px] h-4 bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vacations"
                    checked={showVacations}
                    onCheckedChange={(v) => setShowVacations(!!v)}
                    className="rounded-[4px] border-black/20 data-[state=checked]:bg-[#34C759] data-[state=checked]:border-[#34C759]"
                  />
                  <label htmlFor="vacations" className="text-[14px] font-medium text-neutral-900 cursor-pointer">
                    Vacaciones
                  </label>
                </div>
                <div className="w-[1px] h-4 bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="holidays"
                    checked={showHolidays}
                    onCheckedChange={(v) => setShowHolidays(!!v)}
                    className="rounded-[4px] border-black/20 data-[state=checked]:bg-[#0066CC] data-[state=checked]:border-[#0066CC]"
                  />
                  <label htmlFor="holidays" className="text-[14px] font-medium text-neutral-900 cursor-pointer">
                    Festivos
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Legend + optional export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-2 p-2 bg-[#F2F2F7]/50 rounded-[14px] border border-black/[0.02]">
              <DSBadge variant="red"    className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Guardias</DSBadge>
              <DSBadge variant="green"  className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">vacaciones</DSBadge>
              <DSBadge variant="amber"  className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Nacional</DSBadge>
              <DSBadge variant="orange" className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Regional</DSBadge>
              <DSBadge variant="blue"   className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Local</DSBadge>
            </div>

            {showExport && (
              <ExportPDFButton
                guards={guardsForExport}
                vacations={vacationsForExport}
                holidays={holidaysForExport}
                staff={staff}
                filterLabel={filterLabel}
              />
            )}
          </div>
        </div>
      </DSCard>

      <DSCard className="p-4 md:p-6 overflow-hidden">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            events={events}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek',
            }}
            buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana' }}
            firstDay={5}
            height="auto"
            dayMaxEvents={true}
            eventContent={(arg) => {
              if (arg.event.display === 'background') return null;
              const isHoliday = arg.event.extendedProps?.type === 'holiday';
              if (isHoliday) {
                return (
                  <div
                    className="px-1.5 py-0.5 text-[10px] rounded-[4px] overflow-hidden text-ellipsis whitespace-nowrap font-semibold border"
                    style={{
                      backgroundColor: arg.event.backgroundColor ?? '#FEF3C7',
                      borderColor: arg.event.borderColor ?? '#F59E0B',
                      color: arg.event.textColor ?? '#92400E',
                    }}
                  >
                    {arg.event.title}
                  </div>
                );
              }
              return (
                <div className="px-2 py-1 text-[11px] rounded-[6px] shadow-sm transform hover:scale-[1.02] transition-transform overflow-hidden text-ellipsis whitespace-nowrap font-bold flex items-center gap-1.5 border-none">
                  {arg.event.title}
                </div>
              );
            }}
          />
        </div>
      </DSCard>

      <style jsx global>{`
        .fc {
          --fc-border-color: rgba(0, 0, 0, 0.04);
          --fc-today-bg-color: rgba(0, 102, 204, 0.04);
          --fc-neutral-bg-color: transparent;
          font-family: inherit;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1d1d1f;
          letter-spacing: -0.02em;
        }
        .fc .fc-button {
          background: #F2F2F7 !important;
          border: none !important;
          color: #1d1d1f !important;
          font-size: 0.85rem !important;
          font-weight: 700 !important;
          border-radius: 10px !important;
          padding: 8px 16px !important;
          box-shadow: none !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          margin-left: 4px !important;
        }
        @media (max-width: 640px) {
          .fc .fc-toolbar { flex-wrap: wrap !important; gap: 8px !important; }
          .fc .fc-toolbar-title { font-size: 0.95rem !important; }
          .fc .fc-button { padding: 6px 8px !important; font-size: 0.75rem !important; margin-left: 2px !important; }
          .fc .fc-dayGridWeek-button { display: none !important; }
          .fc th { padding: 6px 0 !important; font-size: 10px !important; }
          .fc-daygrid-day-number { font-size: 0.7rem !important; padding: 4px !important; }
          .fc-dayGridMonth-view .fc-event { margin: 1px 2px !important; }
          .fc .fc-event-title { font-size: 10px !important; }
        }
        .fc .fc-button:hover { background: #e5e5ea !important; }
        .fc .fc-button-active { background: #1d1d1f !important; color: white !important; }
        .fc th {
          padding: 12px 0 !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #86868b !important;
          border: none !important;
        }
        .fc td { border-color: rgba(0, 0, 0, 0.04) !important; }
        .fc-day-today { background-color: rgba(0, 102, 204, 0.05) !important; }
        .fc-day-today .fc-daygrid-day-number {
          background: #0066CC;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
          font-weight: 800;
        }
        .fc-daygrid-day-number {
          font-size: 0.8rem;
          font-weight: 700;
          opacity: 0.9;
          padding: 8px !important;
        }
        .fc-event { border-radius: 6px !important; border: none !important; }
        .fc-dayGridMonth-view .fc-event { margin: 2px 4px !important; }
      `}</style>
    </div>
  );
}
