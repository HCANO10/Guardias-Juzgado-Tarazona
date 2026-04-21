'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Edit2, Trash2, CalendarIcon, Loader2, Search, Shield } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useRole } from '@/hooks/use-role';
import {
  DSBadge,
  DSPageHeader,
  DSButton
} from '@/lib/design-system';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  scope: 'nacional' | 'aragon' | 'zaragoza_provincia' | 'tarazona';
  year: number;
}

interface HolidaysPageClientProps {
  initialHolidays: Holiday[];
}

export default function HolidaysPageClient({ initialHolidays }: HolidaysPageClientProps) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDelOpen, setIsDelOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<{
    date: Date | undefined;
    name: string;
    scope: Holiday['scope'];
  }>({
    date: undefined,
    name: '',
    scope: 'nacional'
  });

  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const { isHeadmaster } = useRole();

  const years = useMemo(() => {
    const yearsSet = new Set(initialHolidays.map(h => h.year));
    yearsSet.add(new Date().getFullYear());
    yearsSet.add(new Date().getFullYear() + 1);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [initialHolidays]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      const matchScope = scopeFilter === 'all' || h.scope === scopeFilter;
      const matchYear = yearFilter === 'all' || h.year.toString() === yearFilter;
      return matchScope && matchYear;
    }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [holidays, scopeFilter, yearFilter]);

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        date: parseISO(holiday.date),
        name: holiday.name,
        scope: holiday.scope
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        date: undefined,
        name: '',
        scope: 'nacional'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.date || !formData.name) {
      toast({ title: "Error", description: "La fecha y el nombre son obligatorios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const year = formData.date.getFullYear();

    try {
      if (editingHoliday) {
        const { data, error } = await supabase
          .from('holidays')
          .update({ date: dateStr, name: formData.name, scope: formData.scope, year: year })
          .eq('id', editingHoliday.id)
          .select()
          .single();

        if (error) throw error;
        setHolidays(prev => prev.map(h => h.id === data.id ? data : h));
        toast({ title: "Festivo actualizado" });
      } else {
        const { data, error } = await supabase
          .from('holidays')
          .insert({ date: dateStr, name: formData.name, scope: formData.scope, year: year })
          .select()
          .single();

        if (error) throw error;
        setHolidays(prev => [...prev, data]);
        toast({ title: "Festivo creado" });
      }
      setIsDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingHolidayId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', deletingHolidayId);

      if (error) throw error;
      setHolidays(prev => prev.filter(h => h.id !== deletingHolidayId));
      toast({ title: "Festivo eliminado" });
      setIsDelOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
      setDeletingHolidayId(null);
    }
  };

  const getScopeInfo = (scope: Holiday['scope']) => {
    switch (scope) {
      case 'nacional': return { label: 'Nacional', variant: 'amber' as const };
      case 'aragon': return { label: 'Aragón', variant: 'orange' as const };
      case 'zaragoza_provincia': return { label: 'Provincia', variant: 'blue' as const };
      case 'tarazona': return { label: 'Local', variant: 'indigo' as const };
      default: return { label: scope, variant: 'neutral' as const };
    }
  };

  // Agrupar festivos por mes
  const groupedByMonth = useMemo(() => {
    const groups: { key: string; label: string; holidays: Holiday[] }[] = [];
    const map = new Map<string, Holiday[]>();
    for (const h of filteredHolidays) {
      const key = h.date.slice(0, 7); // 'yyyy-MM'
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    for (const [key, items] of map.entries()) {
      const label = format(parseISO(key + '-01'), "MMMM yyyy", { locale: es });
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
      groups.push({ key, label: capitalized, holidays: items });
    }
    return groups;
  }, [filteredHolidays]);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <DSPageHeader 
          title="Calendario de Festivos" 
          subtitle="Configuración de días no laborables para el cálculo de guardias y vacaciones."
        />
        {isHeadmaster && (
          <DSButton onClick={() => handleOpenDialog()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Añadir festivo
          </DSButton>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-full md:w-[200px] rounded-[12px] h-11 bg-white border-slate-200 text-slate-700 text-[15px]">
              <SelectValue placeholder="Ámbito" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-slate-100 shadow-xl">
              <SelectItem value="all">Todos los ámbitos</SelectItem>
              <SelectItem value="nacional">Nacional</SelectItem>
              <SelectItem value="aragon">Aragón</SelectItem>
              <SelectItem value="zaragoza_provincia">Provincia Zaragoza</SelectItem>
              <SelectItem value="tarazona">Tarazona</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full md:w-[150px] rounded-[12px] h-11 bg-white border-slate-200 text-slate-700 text-[15px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-slate-100 shadow-xl">
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        {filteredHolidays.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={holidays.length === 0 ? Shield : Search}
              title={holidays.length === 0 ? "No hay festivos" : "Sin resultados"}
              description="Añade nuevos festivos o cambia los filtros de búsqueda."
            />
          </div>
        ) : (
          groupedByMonth.map(({ key, label, holidays: monthHolidays }) => (
            <div key={key}>
              {/* Cabecera de mes */}
              <div className="bg-slate-50 rounded-lg px-4 py-2 mb-1">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</h3>
              </div>

              {/* Filas de festivos */}
              <div className="divide-y divide-slate-100">
                {monthHolidays.map((holiday) => {
                  const scope = getScopeInfo(holiday.scope);
                  return (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50/60 rounded-lg transition-colors"
                    >
                      {/* Fecha */}
                      <span className="w-28 shrink-0 text-[13px] font-medium text-slate-500 capitalize">
                        {format(parseISO(holiday.date), "EEE dd MMM", { locale: es })}
                      </span>

                      {/* Nombre */}
                      <span className="flex-1 text-[15px] font-semibold text-slate-900 px-3 truncate">
                        {holiday.name}
                      </span>

                      {/* Badge ámbito + acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        <DSBadge variant={scope.variant} className="text-[11px]">{scope.label}</DSBadge>

                        {isHeadmaster && (
                          <>
                            <button
                              onClick={() => handleOpenDialog(holiday)}
                              className="h-8 w-8 flex items-center justify-center rounded-[8px] bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                              title="Editar"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingHolidayId(holiday.id);
                                setIsDelOpen(true);
                              }}
                              className="h-8 w-8 flex items-center justify-center rounded-[8px] bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[425px] rounded-[28px] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="h-2 bg-indigo-600 w-full" />
          <div className="p-5 sm:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-[24px] font-bold text-slate-900">
                {editingHoliday ? 'Editar Festivo' : 'Añadir Nuevo Festivo'}
              </DialogTitle>
              <DialogDescription className="text-[15px] text-slate-500">
                Define la fecha y el ámbito del día no laborable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Fecha</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center px-4 h-11 rounded-[12px] bg-slate-50 border border-slate-200 text-[15px] text-slate-700">
                      <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600" />
                      {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 rounded-[24px] border-slate-200 shadow-2xl overflow-hidden" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                      initialFocus
                      locale={es}
                      className="p-4"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Navidad, Todos los Santos..."
                  className="h-11 rounded-[12px] bg-slate-50 border-slate-200 focus:bg-white text-slate-800 text-[15px] px-4"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-slate-500 px-1">Ámbito</label>
                <Select value={formData.scope} onValueChange={(val) => setFormData(prev => ({ ...prev, scope: val as Holiday['scope'] }))}>
                  <SelectTrigger className="h-11 rounded-[12px] bg-slate-50 border-slate-200 text-slate-700 text-[15px]">
                    <SelectValue placeholder="Seleccionar ámbito" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[16px] border-slate-100 shadow-xl">
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="aragon">Aragón</SelectItem>
                    <SelectItem value="zaragoza_provincia">Zaragoza Prov.</SelectItem>
                    <SelectItem value="tarazona">Tarazona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6 sm:mt-10 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <DSButton variant="secondary" onClick={() => setIsDialogOpen(false)} disabled={loading} className="w-full sm:flex-1">
                Cancelar
              </DSButton>
              <DSButton onClick={handleSave} disabled={loading} className="w-full sm:flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingHoliday ? 'Actualizar' : 'Guardar'}
              </DSButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDelOpen} onOpenChange={setIsDelOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-5 md:p-8 max-w-[95vw] md:max-w-md bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[22px] font-bold text-slate-900">¿Eliminar festivo?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] text-slate-500 mt-2">
              Esta acción no se puede deshacer. Los cálculos de guardias y vacaciones podrían verse afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={loading} className="rounded-[14px] h-11 border-slate-200 bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200">
              Cancelar
            </AlertDialogCancel>
            <DSButton 
              variant="danger"
              onClick={() => handleDelete()}
              disabled={loading}
              className="h-11 px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar permanentemente'}
            </DSButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
