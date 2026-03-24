import { describe, it, expect } from 'vitest'
import {
  staffCreateSchema,
  staffDeactivateSchema,
  staffChangeRoleSchema,
  guardGeneratePeriodsSchema,
  guardManualAssignSchema,
  guardSwapSchema,
  authRegisterSchema,
  authCompleteProfileSchema,
  authUpdateEmailSchema,
  vacationValidateSchema,
  settingsUpdateSchema,
  groqGenerateGuardsSchema,
  activityCreateSchema,
  activityQuerySchema,
} from '../schemas'

// Helper: genera un UUID v4 válido para los tests
const validUuid = '123e4567-e89b-12d3-a456-426614174000'

describe('Zod Schemas', () => {
  // ─────────────────────────────────────────────
  // staffCreateSchema
  // ─────────────────────────────────────────────
  describe('staffCreateSchema', () => {
    const validData = {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan@test.com',
      position_id: validUuid,
    }

    it('acepta datos válidos mínimos', () => {
      const result = staffCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('acepta datos completos', () => {
      const result = staffCreateSchema.safeParse({
        ...validData,
        start_date: '2025-01-15',
        notes: 'Nota test',
        password: 'securepass123',
        is_guard_eligible: true,
      })
      expect(result.success).toBe(true)
    })

    it('rechaza first_name vacío', () => {
      const result = staffCreateSchema.safeParse({ ...validData, first_name: '' })
      expect(result.success).toBe(false)
    })

    it('rechaza email inválido', () => {
      const result = staffCreateSchema.safeParse({ ...validData, email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rechaza position_id no UUID', () => {
      const result = staffCreateSchema.safeParse({ ...validData, position_id: 'abc' })
      expect(result.success).toBe(false)
    })

    it('rechaza password demasiado corta', () => {
      const result = staffCreateSchema.safeParse({ ...validData, password: '123' })
      expect(result.success).toBe(false)
    })

    it('rechaza start_date con formato incorrecto', () => {
      const result = staffCreateSchema.safeParse({ ...validData, start_date: '15/01/2025' })
      expect(result.success).toBe(false)
    })

    it('normaliza email a minúsculas', () => {
      const result = staffCreateSchema.safeParse({ ...validData, email: 'JUAN@TEST.COM' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('juan@test.com')
      }
    })

    it('recorta espacios en first_name', () => {
      const result = staffCreateSchema.safeParse({ ...validData, first_name: '  Juan  ' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.first_name).toBe('Juan')
      }
    })
  })

  // ─────────────────────────────────────────────
  // staffDeactivateSchema
  // ─────────────────────────────────────────────
  describe('staffDeactivateSchema', () => {
    it('acepta UUID válido', () => {
      expect(staffDeactivateSchema.safeParse({ staffId: validUuid }).success).toBe(true)
    })

    it('rechaza string no UUID', () => {
      expect(staffDeactivateSchema.safeParse({ staffId: 'abc' }).success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // staffChangeRoleSchema
  // ─────────────────────────────────────────────
  describe('staffChangeRoleSchema', () => {
    it('acepta headmaster', () => {
      const result = staffChangeRoleSchema.safeParse({ staff_id: validUuid, new_role: 'headmaster' })
      expect(result.success).toBe(true)
    })

    it('acepta worker', () => {
      const result = staffChangeRoleSchema.safeParse({ staff_id: validUuid, new_role: 'worker' })
      expect(result.success).toBe(true)
    })

    it('rechaza rol inválido', () => {
      const result = staffChangeRoleSchema.safeParse({ staff_id: validUuid, new_role: 'admin' })
      expect(result.success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // guardGeneratePeriodsSchema
  // ─────────────────────────────────────────────
  describe('guardGeneratePeriodsSchema', () => {
    it('acepta año válido', () => {
      expect(guardGeneratePeriodsSchema.safeParse({ year: 2025 }).success).toBe(true)
    })

    it('establece force = false por defecto', () => {
      const result = guardGeneratePeriodsSchema.safeParse({ year: 2025 })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.force).toBe(false)
    })

    it('rechaza año fuera de rango', () => {
      expect(guardGeneratePeriodsSchema.safeParse({ year: 2023 }).success).toBe(false)
      expect(guardGeneratePeriodsSchema.safeParse({ year: 2031 }).success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // guardManualAssignSchema
  // ─────────────────────────────────────────────
  describe('guardManualAssignSchema', () => {
    it('acepta asignación con todos los roles', () => {
      const result = guardManualAssignSchema.safeParse({
        periodId: validUuid,
        assignments: {
          auxilio: validUuid,
          tramitador: validUuid,
          gestor: validUuid,
        },
      })
      expect(result.success).toBe(true)
    })

    it('acepta asignaciones nullables', () => {
      const result = guardManualAssignSchema.safeParse({
        periodId: validUuid,
        assignments: { auxilio: null, tramitador: null, gestor: null },
      })
      expect(result.success).toBe(true)
    })

    it('rechaza sin periodId', () => {
      const result = guardManualAssignSchema.safeParse({
        assignments: { auxilio: validUuid },
      })
      expect(result.success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // authRegisterSchema
  // ─────────────────────────────────────────────
  describe('authRegisterSchema', () => {
    const validRegister = {
      first_name: 'Ana',
      last_name: 'García',
      email: 'ana@test.com',
      password: 'password123',
      position_id: validUuid,
    }

    it('acepta datos válidos', () => {
      expect(authRegisterSchema.safeParse(validRegister).success).toBe(true)
    })

    it('rechaza password corta', () => {
      expect(authRegisterSchema.safeParse({ ...validRegister, password: '1234567' }).success).toBe(false)
    })

    it('acepta campos opcionales', () => {
      const result = authRegisterSchema.safeParse({
        ...validRegister,
        second_last_name: 'López',
        phone: '678123456',
      })
      expect(result.success).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // authUpdateEmailSchema
  // ─────────────────────────────────────────────
  describe('authUpdateEmailSchema', () => {
    it('acepta email válido', () => {
      expect(authUpdateEmailSchema.safeParse({ newEmail: 'new@test.com' }).success).toBe(true)
    })

    it('rechaza email inválido', () => {
      expect(authUpdateEmailSchema.safeParse({ newEmail: 'invalid' }).success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // vacationValidateSchema
  // ─────────────────────────────────────────────
  describe('vacationValidateSchema', () => {
    it('acepta rango válido', () => {
      const result = vacationValidateSchema.safeParse({
        staff_id: validUuid,
        start_date: '2025-07-01',
        end_date: '2025-07-15',
      })
      expect(result.success).toBe(true)
    })

    it('rechaza cuando start_date >= end_date', () => {
      const result = vacationValidateSchema.safeParse({
        staff_id: validUuid,
        start_date: '2025-07-15',
        end_date: '2025-07-01',
      })
      expect(result.success).toBe(false)
    })

    it('rechaza fechas con formato inválido', () => {
      const result = vacationValidateSchema.safeParse({
        staff_id: validUuid,
        start_date: '01-07-2025',
        end_date: '15-07-2025',
      })
      expect(result.success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // settingsUpdateSchema
  // ─────────────────────────────────────────────
  describe('settingsUpdateSchema', () => {
    it('acepta datos válidos', () => {
      const result = settingsUpdateSchema.safeParse({ active_year: 2025, groq_model: 'llama3-70b' })
      expect(result.success).toBe(true)
    })

    it('rechaza año fuera de rango', () => {
      expect(settingsUpdateSchema.safeParse({ active_year: 2023, groq_model: 'test' }).success).toBe(false)
    })

    it('rechaza modelo vacío', () => {
      expect(settingsUpdateSchema.safeParse({ active_year: 2025, groq_model: '' }).success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // groqGenerateGuardsSchema
  // ─────────────────────────────────────────────
  describe('groqGenerateGuardsSchema', () => {
    it('acepta datos válidos y default respectExisting', () => {
      const result = groqGenerateGuardsSchema.safeParse({ year: 2025 })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.respectExisting).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // activityCreateSchema
  // ─────────────────────────────────────────────
  describe('activityCreateSchema', () => {
    it('acepta datos mínimos', () => {
      const result = activityCreateSchema.safeParse({
        action: 'create',
        entity_type: 'staff',
      })
      expect(result.success).toBe(true)
    })

    it('rechaza action vacío', () => {
      expect(activityCreateSchema.safeParse({ action: '', entity_type: 'staff' }).success).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // activityQuerySchema
  // ─────────────────────────────────────────────
  describe('activityQuerySchema', () => {
    it('acepta sin parámetros y aplica defaults', () => {
      const result = activityQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.limit).toBe(20)
    })

    it('rechaza limit > 100', () => {
      expect(activityQuerySchema.safeParse({ limit: 200 }).success).toBe(false)
    })

    it('coerce limit desde string', () => {
      const result = activityQuerySchema.safeParse({ limit: '50' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.limit).toBe(50)
    })
  })
})
