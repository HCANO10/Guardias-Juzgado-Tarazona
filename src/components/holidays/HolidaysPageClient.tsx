/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Edit2, Trash2, CalendarIcon, Loader2, Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { useRole } from '@/hooks/use-role';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState<{
    date: Date | undefined;
    name: string;
    scope: Holiday['scope'];
  }>({
    date: undefined,
    name: '',
    scope: 'nacional'
  });

  // Filter states
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const { isHeadmaster } = useRole();

  const years = useMemo(() => {
    const yearsSet = new Set(initialHolidays.map(h => h.year));
    // Add current and next year if not present
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
      toast({
        title: "Error",
        description: "La fecha y el nombre son obligatorios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const dateStr = format(formData.date, 'yyyy-MM-dd');
    const year = formData.date.getFullYear();

    try {
      if (editingHoliday) {
        const { data, error } = await supabase
          .from('holidays')
          .update({
            date: dateStr,
            name: formData.name,
            scope: formData.scope,
            year: year
          })
          .eq('id', editingHoliday.id)
          .select()
          .single();

        if (error) throw error;
        setHolidays(prev => prev.map(h => h.id === data.id ? data : h));
        toast({ title: "Festivo actualizado", description: "El festivo se ha modificado correctamente." });
      } else {
        const { data, error } = await supabase
          .from('holidays')
          .insert({
            date: dateStr,
            name: formData.name,
            scope: formData.scope,
            year: year
          })
          .select()
          .single();

        if (error) throw error;
        setHolidays(prev => [...prev, data]);
        toast({ title: "Festivo creado", description: "El festivo se ha añadido correctamente." });
      }
      setIsDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el festivo.",
        variant: "destructive"
      });
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
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el festivo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setDeletingHolidayId(null);
    }
  };

  const getScopeBadge = (scope: Holiday['scope']) => {
    switch (scope) {
      case 'nacional':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Nacional</Badge>;
      case 'aragon':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Aragón</Badge>;
      case 'zaragoza_provincia':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Prov. Zaragoza</Badge>;
      case 'tarazona':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Tarazona</Badge>;
      default:
        return <Badge>{scope}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Calendario de Festivos</h2>
        {isHeadmaster && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Añadir festivo
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-sm">
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por ámbito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los ámbitos</SelectItem>
              <SelectItem value="nacional">Nacional</SelectItem>
              <SelectItem value="aragon">Aragón</SelectItem>
              <SelectItem value="zaragoza_provincia">Provincia Zaragoza</SelectItem>
              <SelectItem value="tarazona">Tarazona</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-[200px]">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card/60 backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre del Festivo</TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHolidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12">
                  <EmptyState 
                    icon={holidays.length === 0 ? Sparkles : Search}
                    title={holidays.length === 0 ? "No hay festivos" : "Sin resultados"}
                    description={holidays.length === 0 
                      ? "Parece que aún no se han cargado festivos para este calendario."
                      : "No hay ningún festivo que coincida con los filtros seleccionados."
                    }
                    action={holidays.length === 0 ? (
                      <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Añadir festivo
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => { setScopeFilter("all"); setYearFilter(new Date().getFullYear().toString()); }}>
                        Limpiar filtros
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredHolidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">
                    {format(new Date(holiday.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>{getScopeBadge(holiday.scope)}</TableCell>
                  <TableCell className="text-right">
                    {isHeadmaster && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenDialog(holiday)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeletingHolidayId(holiday.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Editar Festivo' : 'Añadir Nuevo Festivo'}
            </DialogTitle>
            <DialogDescription>
              Introduce los detalles del día festivo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Fecha</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del festivo"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Ámbito</label>
              <Select 
                value={formData.scope} 
                onValueChange={(val: any) => setFormData(prev => ({ ...prev, scope: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ámbito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">Nacional</SelectItem>
                  <SelectItem value="aragon">Aragón</SelectItem>
                  <SelectItem value="zaragoza_provincia">Zaragoza Prov.</SelectItem>
                  <SelectItem value="tarazona">Tarazona</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el festivo de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
