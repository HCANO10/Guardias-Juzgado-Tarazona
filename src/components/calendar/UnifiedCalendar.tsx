/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { addDays } from 'date-fns';
import { es } from 'date-fns/locale';

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
        // Filter by person if needed
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
          end: addDays(new Date(g.end_date), 1).toISOString().split('T')[0], // Exclusive end
          allDay: true,
          backgroundColor: isUncovered ? '#991B1B' : '#DC2626',
          borderColor: isUncovered ? '#7F1D1D' : '#991B1B',
          extendedProps: {
            type: 'guard',
            week: g.week_number,
            details: g
          }
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
          backgroundColor: '#16A34A',
          borderColor: '#15803D',
          extendedProps: {
            type: 'vacation',
            details: v
          }
        });
      });
    }

    // 3. Festivos (Background)
    if (showHolidays) {
      holidays.forEach(h => {
        let color = '#2563EB'; // Local
        if (h.scope === 'nacional') color = '#EAB308';
        if (h.scope === 'aragon') color = '#F97316';

        allEvents.push({
          id: `holiday-${h.id}`,
          title: `🎉 ${h.name}`,
          start: h.date,
          allDay: true,
          display: 'background',
          backgroundColor: color,
          extendedProps: {
            type: 'holiday',
            details: h
          }
        });
      });
    }

    return allEvents;
  }, [guards, vacations, holidays, personFilter, showGuards, showVacations, showHolidays]);

  const handleEventClick = (info: any) => {
    // We'll use a popover-like behavior if possible or just log for now
    // Actually FullCalendar eventClick is better handled by a state that opens a Dialog
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/60 backdrop-blur-md">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="w-[200px]">
                <Label className="text-xs mb-1.5 block">Filtrar por persona</Label>
                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cualquier persona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier persona</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 pt-5">
                <div className="flex items-center space-x-2">
                  <Checkbox id="guards" checked={showGuards} onCheckedChange={(v) => setShowGuards(!!v)} />
                  <Label htmlFor="guards" className="text-sm cursor-pointer">Guardias</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="vacations" checked={showVacations} onCheckedChange={(v) => setShowVacations(!!v)} />
                  <Label htmlFor="vacations" className="text-sm cursor-pointer">Vacaciones</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="holidays" checked={showHolidays} onCheckedChange={(v) => setShowHolidays(!!v)} />
                  <Label htmlFor="holidays" className="text-sm cursor-pointer">Festivos</Label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 p-2 rounded-lg">
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#DC2626] mr-1" /> Guardias</div>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#16A34A] mr-1" /> Vacaciones</div>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#EAB308] mr-1" /> Nacional</div>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#F97316] mr-1" /> Aragón</div>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[#2563EB] mr-1" /> Local</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="calendar-container bg-card/60 backdrop-blur-md rounded-xl border p-4 shadow-sm overflow-hidden">
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
          eventClick={handleEventClick}
          dayMaxEvents={true}
          eventContent={(arg) => {
            if (arg.event.display === 'background') return null;
            return (
              <div className="px-1 py-0.5 text-[10px] overflow-hidden text-ellipsis whitespace-nowrap font-medium text-white flex items-center gap-1">
                {arg.event.title}
              </div>
            )
          }}
        />
      </div>

      <style jsx global>{`
        .fc {
          --fc-border-color: rgba(0, 0, 0, 0.05);
          --fc-today-bg-color: rgba(var(--primary), 0.05);
          font-family: inherit;
        }
        .dark .fc {
          --fc-border-color: rgba(255, 255, 255, 0.05);
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .fc .fc-button {
          background-color: transparent;
          border-color: rgba(0, 0, 0, 0.1);
          color: inherit;
          font-size: 0.875rem;
          text-transform: capitalize;
        }
        .fc .fc-button-primary:not(:disabled):active, 
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: white;
        }
        .fc .fc-button:focus {
          box-shadow: none;
        }
        .fc .fc-daygrid-day-number {
          font-size: 0.75rem;
          padding: 8px;
          opacity: 0.7;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }
      `}</style>
    </div>
  );
}
