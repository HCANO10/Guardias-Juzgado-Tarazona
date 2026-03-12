/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DSCard, 
  DSIconBox, 
  DSBadge 
} from '@/lib/design-system';
import { Calendar as CalendarIcon, Filter, Layers, Users } from 'lucide-react';

interface UnifiedCalendarProps {
  guards: any[];
  vacations: any[];
  holidays: any[];
  staff: any[];
}

export default function UnifiedCalendar({ guards, vacations, holidays, staff }: UnifiedCalendarProps) {
  const [personFilter, setPersonFilter] = useState('all');
  const [showGuards, setShowGuards] = useState(true);
  const [showVacations, setShowVacations] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);

  const events = useMemo(() => {
    const allEvents: any[] = [];

    // 1. Guardias (Rojo)
    if (showGuards) {
      guards.forEach(g => {
        if (personFilter !== 'all') {
          const hasPerson = g.auxilio?.id === personFilter || 
                            g.tramitador?.id === personFilter || 
                            g.gestor?.id === personFilter;
          if (!hasPerson) return;
        }

        const titleParts = [];
        titleParts.push(`A: ${g.auxilio?.first_name || '—'}`);
        titleParts.push(`T: ${g.tramitador?.first_name || '—'}`);
        titleParts.push(`G: ${g.gestor?.first_name || '—'}`);

        const isUncovered = !g.auxilio && !g.tramitador && !g.gestor;

        allEvents.push({
          id: `guard-${g.id}`,
          title: isUncovered ? "🛡️ SIN CUBRIR" : `🛡️ ${titleParts.join(' | ')}`,
          start: g.start_date,
          end: addDays(new Date(g.end_date), 1).toISOString().split('T')[0], 
          allDay: true,
          backgroundColor: isUncovered ? '#991B1B' : '#DC2626',
          borderColor: 'transparent',
          textColor: '#ffffff',
          extendedProps: { type: 'guard' }
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
          end: addDays(new Date(v.end_date), 1).toISOString().split('T')[0],
          allDay: true,
          backgroundColor: '#34C759',
          borderColor: 'transparent',
          textColor: '#ffffff',
          extendedProps: { type: 'vacation' }
        });
      });
    }

    // 3. Festivos (Ambar/Azul/Naranja)
    if (showHolidays) {
      holidays.forEach(h => {
        let color = '#0066CC'; // Local
        if (h.scope === 'nacional') color = '#FF9500';
        if (h.scope === 'aragon') color = '#FF3B30';

        allEvents.push({
          id: `holiday-${h.id}`,
          title: `🎉 ${h.name}`,
          start: h.date,
          allDay: true,
          display: 'background',
          backgroundColor: `${color}15`, // Very light background
          extendedProps: { type: 'holiday', scopeColor: color }
        });
      });
    }

    return allEvents;
  }, [guards, vacations, holidays, personFilter, showGuards, showVacations, showHolidays]);

  return (
    <div className="space-y-8">
      <DSCard className="p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">
                <Users className="h-3.5 w-3.5" /> Filtrar Personal
              </div>
              <Select value={personFilter} onValueChange={setPersonFilter}>
                <SelectTrigger className="w-[220px] h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]">
                  <SelectValue placeholder="Cualquier persona" />
                </SelectTrigger>
                <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                  <SelectItem value="all">Todo el personal</SelectItem>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">
                <Layers className="h-3.5 w-3.5" /> Capas Visibles
              </div>
              <div className="flex items-center gap-4 h-11 px-4 rounded-[12px] bg-[#F2F2F7]/50 border border-black/[0.04]">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="guards" 
                    checked={showGuards} 
                    onCheckedChange={(v) => setShowGuards(!!v)}
                    className="rounded-[4px] border-black/20 data-[state=checked]:bg-[#DC2626] data-[state=checked]:border-[#DC2626]"
                  />
                  <label htmlFor="guards" className="text-[14px] font-medium text-neutral-900 cursor-pointer">Guardias</label>
                </div>
                <div className="w-[1px] h-4 bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="vacations" 
                    checked={showVacations} 
                    onCheckedChange={(v) => setShowVacations(!!v)}
                    className="rounded-[4px] border-black/20 data-[state=checked]:bg-[#34C759] data-[state=checked]:border-[#34C759]"
                  />
                  <label htmlFor="vacations" className="text-[14px] font-medium text-neutral-900 cursor-pointer">Vacaciones</label>
                </div>
                <div className="w-[1px] h-4 bg-black/[0.08]" />
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="holidays" 
                    checked={showHolidays} 
                    onCheckedChange={(v) => setShowHolidays(!!v)}
                    className="rounded-[4px] border-black/20 data-[state=checked]:bg-[#0066CC] data-[state=checked]:border-[#0066CC]"
                  />
                  <label htmlFor="holidays" className="text-[14px] font-medium text-neutral-900 cursor-pointer">Festivos</label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-2 bg-[#F2F2F7]/50 rounded-[14px] border border-black/[0.02]">
            <DSBadge variant="red" className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Guardias</DSBadge>
            <DSBadge variant="green" className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">vacaciones</DSBadge>
            <DSBadge variant="amber" className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Nacional</DSBadge>
            <DSBadge variant="orange" className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Regional</DSBadge>
            <DSBadge variant="blue" className="text-[10px] uppercase font-black tracking-tight px-2 py-0.5">Local</DSBadge>
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
              right: 'dayGridMonth,dayGridWeek'
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana'
            }}
            firstDay={1}
            height="auto"
            dayMaxEvents={true}
            eventContent={(arg) => {
              if (arg.event.display === 'background') return null;
              return (
                <div className="px-2 py-1 text-[11px] rounded-[6px] shadow-sm transform hover:scale-[1.02] transition-transform overflow-hidden text-ellipsis whitespace-nowrap font-bold flex items-center gap-1.5 border-none">
                  {arg.event.title}
                </div>
              )
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
        .fc .fc-button:hover {
          background: #e5e5ea !important;
        }
        .fc .fc-button-active {
          background: #1d1d1f !important;
          color: white !important;
        }
        .fc th {
          padding: 12px 0 !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #86868b !important;
          border: none !important;
        }
        .fc td {
          border-color: rgba(0, 0, 0, 0.04) !important;
        }
        .fc-day-today {
          background-color: rgba(0, 102, 204, 0.05) !important;
        }
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
        .fc-event {
          border-radius: 6px !important;
          border: none !important;
        }
        .fc-dayGridMonth-view .fc-event {
          margin: 2px 4px !important;
        }
      `}</style>
    </div>
  );
}
