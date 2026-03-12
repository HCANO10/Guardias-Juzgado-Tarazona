/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
import { Plus, Edit2, Trash2, CalendarIcon, Loader2, Search, ArrowRight, Shield, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { useRole } from '@/hooks/use-role';
import { 
  DSCard, 
  DSBadge, 
  DSIconBox, 
  DSPageHeader, 
  DSSectionHeading, 
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
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays, scopeFilter, yearFilter]);

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        date: new Date(holiday.date),
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setDeletingHolidayId(null);
    }
  };

  const getScopeInfo = (scope: Holiday['scope']) => {
    switch (scope) {
      case 'nacional': return { label: 'España', variant: 'amber' as const };
      case 'aragon': return { label: 'Aragón', variant: 'orange' as const };
      case 'zaragoza_provincia': return { label: 'Provincia', variant: 'blue' as const };
      case 'tarazona': return { label: 'Local', variant: 'indigo' as const };
      default: return { label: scope, variant: 'neutral' as const };
    }
  };

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

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-black/[0.04]">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-full md:w-[200px] rounded-[12px] h-11 bg-white border-black/[0.08] text-[15px]">
              <SelectValue placeholder="Ámbito" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
              <SelectItem value="all">Todos los ámbitos</SelectItem>
              <SelectItem value="nacional">Nacional</SelectItem>
              <SelectItem value="aragon">Aragón</SelectItem>
              <SelectItem value="zaragoza_provincia">Provincia Zaragoza</SelectItem>
              <SelectItem value="tarazona">Tarazona</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full md:w-[150px] rounded-[12px] h-11 bg-white border-black/[0.08] text-[15px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredHolidays.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 py-20">
            <EmptyState 
              icon={holidays.length === 0 ? Shield : Search}
              title={holidays.length === 0 ? "No hay festivos" : "Sin resultados"}
              description="Añade nuevos festivos o cambia los filtros de búsqueda."
            />
          </div>
        ) : (
          filteredHolidays.map((holiday) => {
            const scope = getScopeInfo(holiday.scope);
            return (
              <DSCard key={holiday.id} className="group hover:scale-[1.02] transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-[12px] bg-[#F2F2F7] text-neutral-900 font-bold text-[13px] border border-black/[0.04]">
                    {format(new Date(holiday.date), 'dd')}
                  </div>
                  <DSBadge variant={scope.variant}>{scope.label}</DSBadge>
                </div>
                
                <div className="space-y-1 mb-6">
                  <p className="text-[17px] font-semibold text-neutral-900 leading-tight min-h-[44px]">{holiday.name}</p>
                  <p className="text-[13px] text-[#86868B] font-medium capitalize">
                    {format(new Date(holiday.date), "MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>

                {isHeadmaster && (
                  <div className="flex items-center gap-2 pt-4 border-t border-black/[0.04]">
                    <DSButton 
                      variant="secondary" 
                      className="flex-1 h-9 text-[12px] rounded-[10px]"
                      onClick={() => handleOpenDialog(holiday)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </DSButton>
                    <button 
                      onClick={() => {
                        setDeletingHolidayId(holiday.id);
                        setIsDelOpen(true);
                      }}
                      className="h-9 w-9 flex items-center justify-center rounded-[10px] bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </DSCard>
            )
          })
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[28px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="h-2 bg-[#0066CC] w-full" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-[24px] font-bold text-neutral-900">
                {editingHoliday ? 'Editar Festivo' : 'Añadir Nuevo Festivo'}
              </DialogTitle>
              <DialogDescription className="text-[15px] text-[#86868B]">
                Define la fecha y el ámbito del día no laborable.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">Fecha</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center px-4 h-11 rounded-[12px] bg-[#F2F2F7]/50 border border-black/[0.04] text-[15px] text-neutral-900">
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#0066CC]" />
                      {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 rounded-[24px] border-black/[0.08] shadow-2xl overflow-hidden" align="start">
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
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">Nombre</label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Navidad, Todos los Santos..."
                  className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] focus:bg-white text-[15px] px-4"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[#86868B] px-1">Ámbito</label>
                <Select value={formData.scope} onValueChange={(val: any) => setFormData(prev => ({ ...prev, scope: val }))}>
                  <SelectTrigger className="h-11 rounded-[12px] bg-[#F2F2F7]/50 border-black/[0.04] text-[15px]">
                    <SelectValue placeholder="Seleccionar ámbito" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[16px] border-black/[0.08] shadow-xl">
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="aragon">Aragón</SelectItem>
                    <SelectItem value="zaragoza_provincia">Zaragoza Prov.</SelectItem>
                    <SelectItem value="tarazona">Tarazona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-10 gap-3">
              <DSButton variant="secondary" onClick={() => setIsDialogOpen(false)} disabled={loading} className="flex-1">
                Cancelar
              </DSButton>
              <DSButton onClick={handleSave} disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingHoliday ? 'Actualizar' : 'Guardar'}
              </DSButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDelOpen} onOpenChange={setIsDelOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[22px] font-bold text-neutral-900">¿Eliminar festivo?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] text-[#86868B] mt-2">
              Esta acción no se puede deshacer. Los cálculos de guardias y vacaciones podrían verse afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={loading} className="rounded-[14px] h-11 border-none bg-[#F2F2F7] text-neutral-900 font-semibold hover:bg-black/[0.05]">
              Cancelar
            </AlertDialogCancel>
            <DSButton 
              variant="danger"
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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
