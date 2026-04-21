"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { DSButton } from "@/lib/design-system"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon, Loader2, Shield } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const staffSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  positionId: z.string().min(1, "Selecciona un puesto"),
  startDate: z.date(),
  password: z.string().optional(),
  notes: z.string().optional(),
  isGuardEligible: z.boolean(),
})

type StaffFormValues = z.infer<typeof staffSchema>

interface Position {
  id: string
  name: string
}

interface StaffInitialData {
  id: string
  first_name: string
  last_name: string
  email: string
  position_id: string
  start_date?: string
  notes?: string | null
  is_guard_eligible?: boolean
}

interface StaffFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  positions: Position[]
  initialData?: StaffInitialData | null
  onSuccess: () => void
}

export function StaffForm({ open, onOpenChange, positions, initialData, onSuccess }: StaffFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const isEditing = !!initialData

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: initialData?.first_name || "",
      lastName: initialData?.last_name || "",
      email: initialData?.email || "",
      positionId: initialData?.position_id || "",
      startDate: initialData?.start_date ? new Date(initialData.start_date + 'T00:00:00') : new Date(),
      password: "",
      notes: initialData?.notes || "",
      isGuardEligible: initialData?.is_guard_eligible ?? true,
    },
  })

  async function onSubmit(data: StaffFormValues) {
    setLoading(true)
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('staff')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            position_id: data.positionId,
            start_date: format(data.startDate, 'yyyy-MM-dd'),
            notes: data.notes || null,
            is_guard_eligible: data.isGuardEligible,
          })
          .eq('id', initialData.id)

        if (error) throw error
        toast({ title: "✅ Datos actualizados correctamente" })
      } else {
        const response = await fetch('/api/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            position_id: data.positionId,
            start_date: format(data.startDate, 'yyyy-MM-dd'),
            password: data.password || undefined,
            notes: data.notes || undefined,
            is_guard_eligible: data.isGuardEligible,
          }),
        })

        const result = await response.json()
        if (response.status === 409) {
          throw new Error(`Ya existe un usuario con el email ${data.email}`)
        }
        if (!response.ok) throw new Error(result.error || 'Error al crear trabajador')

        toast({
          title: "✅ Usuario creado",
          description: result.message || `${data.firstName} ${data.lastName} ya puede acceder a la aplicación.`,
        })
      }

      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido"
      toast({ variant: "destructive", title: "❌ Error", description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[28px] border-none shadow-2xl p-0 overflow-hidden">
        <div className="h-2 bg-[#0066CC] w-full" />
        <div className="p-5 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold text-neutral-900">{isEditing ? 'Editar Trabajador' : 'Nuevo Trabajador'}</DialogTitle>
          <DialogDescription className="text-[15px] text-[#86868B]">
            {isEditing
              ? 'Modifica los datos del trabajador.'
              : 'Añade un nuevo miembro al equipo. Se creará su cuenta de acceso inmediatamente.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Cristina" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: García López" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email * {isEditing && <span className="text-muted-foreground text-xs">(no editable)</span>}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@juzgado.es" {...field} disabled={isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="positionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puesto de Trabajo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un puesto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de incorporación *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <button
                          type="button"
                          className={cn(
                            "flex h-10 w-full items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition-all hover:bg-gray-50",
                            "text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PP", { locale: es }) : <span>Elige una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Dejar vacío para usar la contraseña por defecto" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Opcional. Si se deja vacío se genera una contraseña segura automáticamente.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Interina sustitución maternidad hasta septiembre 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* is_guard_eligible toggle */}
            <FormField
              control={form.control}
              name="isGuardEligible"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border border-black/[0.08] p-4 bg-[#F2F2F7]/40">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-3.5 w-3.5 text-[#0066CC]" />
                      Disponible para guardias
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Si está activo, esta persona puede ser asignada en turnos de guardia. Desactívalo en sustituciones temporales o personal no elegible.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <DSButton type="button" variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </DSButton>
              <DSButton type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear usuario'}
              </DSButton>
            </div>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
