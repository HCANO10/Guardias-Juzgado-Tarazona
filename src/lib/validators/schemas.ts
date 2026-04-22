// src/lib/validators/schemas.ts
// Centralized Zod schemas for all API route validation
import { z } from "zod"

// ============================================================
// Reusable primitives
// ============================================================

const uuid = z.string().uuid("ID inválido")
const trimmedString = z.string().trim().min(1, "Campo obligatorio")
const emailField = z.string().trim().toLowerCase().email("Email inválido")
const passwordField = z.string().min(12, "Mínimo 12 caracteres").max(128, "Máximo 128 caracteres")
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
const roleField = z.enum(["headmaster", "worker"], { message: "Rol debe ser 'headmaster' o 'worker'" })
const yearField = z.number().int().min(2024).max(2030)

// ============================================================
// Staff schemas
// ============================================================

export const staffCreateSchema = z.object({
  first_name: trimmedString,
  last_name: trimmedString,
  email: emailField,
  position_id: uuid,
  start_date: dateString.optional(),
  notes: z.string().trim().optional(),
  password: passwordField.optional(),
  is_guard_eligible: z.boolean().optional(),
})

export const staffDeactivateSchema = z.object({
  staffId: uuid,
})

export const staffReactivateSchema = z.object({
  staffId: uuid,
})

export const staffChangeRoleSchema = z.object({
  staff_id: uuid,
  new_role: roleField,
})

// ============================================================
// Guard schemas
// ============================================================

export const guardGeneratePeriodsSchema = z.object({
  year: yearField,
  force: z.boolean().optional().default(false),
})

export const guardManualAssignSchema = z.object({
  periodId: uuid,
  assignments: z.object({
    auxilio: uuid.optional().nullable(),
    tramitador: uuid.optional().nullable(),
    gestor: uuid.optional().nullable(),
  }),
})

export const guardDeleteRangeSchema = z.object({
  year: yearField,
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  deleteAssignmentsOnly: z.boolean().optional().default(false),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) return data.startDate < data.endDate
    return true
  },
  { message: "La fecha de inicio debe ser anterior a la de fin", path: ["endDate"] }
)

export const guardSwapSchema = z.object({
  periodId1: uuid,
  staffId1: uuid,
  periodId2: uuid,
  staffId2: uuid,
  swapperStaffId: uuid.optional(),
})

// ============================================================
// Auth schemas
// ============================================================

export const authRegisterSchema = z.object({
  first_name: trimmedString,
  last_name: trimmedString,
  second_last_name: z.string().trim().optional(),
  email: emailField,
  phone: z.string().trim().optional(),
  password: passwordField,
  position_id: uuid.optional(),
})

export const authCompleteProfileSchema = z.object({
  first_name: trimmedString,
  last_name: trimmedString,
  second_last_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  position_id: uuid,
})

export const authUpdateEmailSchema = z.object({
  newEmail: emailField,
})

export const authChangePasswordSchema = z.object({
  password: passwordField,
})

// ============================================================
// Vacations schemas
// ============================================================

export const vacationTipoField = z.enum(['vacaciones', 'asuntos_propios'], {
  message: "El tipo debe ser 'vacaciones' o 'asuntos_propios'"
})

export const vacationValidateSchema = z.object({
  staff_id: uuid,
  start_date: dateString,
  end_date: dateString,
  tipo: vacationTipoField.optional().default('vacaciones'),
}).refine(
  (data) => data.start_date < data.end_date,
  { message: "La fecha de inicio debe ser anterior a la de fin", path: ["end_date"] }
)

// ============================================================
// Settings schemas
// ============================================================

export const settingsUpdateSchema = z.object({
  active_year: yearField,
  groq_model: trimmedString,
})

// ============================================================
// Groq schemas
// ============================================================

export const groqApplyProposalSchema = z.object({
  assignments: z.array(z.object({
    guard_period_id: uuid,
    week_number: z.number().int(),
    auxilio_staff_id: uuid,
    tramitador_staff_id: uuid,
    gestor_staff_id: uuid,
  })).min(1, "Se requiere al menos una asignación"),
  respectExisting: z.boolean().optional().default(false),
})

export const groqGenerateGuardsSchema = z.object({
  year: yearField,
  respectExisting: z.boolean().optional().default(true),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) return data.startDate < data.endDate
    return true
  },
  { message: "La fecha de inicio debe ser anterior a la de fin", path: ["endDate"] }
)

// ============================================================
// Guard swap request schemas
// ============================================================

export const guardSwapRequestCreateSchema = z.object({
  // My guard period
  periodIdRequester: uuid,
  // The colleague I want to swap with
  staffIdRequested: uuid,
  // Their guard period I want
  periodIdRequested: uuid,
  // Optional message
  message: z.string().trim().max(300).optional(),
})

export const guardSwapRequestRespondSchema = z.object({
  // "accept" | "reject" | "cancel"
  action: z.enum(["accept", "reject", "cancel"]),
})

// ============================================================
// Activity schemas
// ============================================================

export const activityCreateSchema = z.object({
  action: trimmedString,
  entity_type: trimmedString,
  entity_id: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  performed_by: uuid.optional(),
})

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  type: z.string().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
})
