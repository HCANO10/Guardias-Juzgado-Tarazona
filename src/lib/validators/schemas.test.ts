// src/lib/validators/schemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  staffCreateSchema,
  staffDeactivateSchema,
  staffChangeRoleSchema,
  guardManualAssignSchema,
  guardGeneratePeriodsSchema,
  authRegisterSchema,
  authUpdateEmailSchema,
  vacationValidateSchema,
  settingsUpdateSchema,
  groqGenerateGuardsSchema,
  activityCreateSchema,
  activityQuerySchema,
} from './schemas'

const validUUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================================
// staffCreateSchema
// ============================================================
describe('staffCreateSchema', () => {
  const valid = {
    first_name: 'Ana',
    last_name: 'García',
    email: 'ana@example.com',
    position_id: validUUID,
  }

  it('accepts valid minimal data', () => {
    const result = staffCreateSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts optional fields', () => {
    const result = staffCreateSchema.safeParse({
      ...valid,
      start_date: '2025-01-15',
      notes: 'una nota',
      password: 'password123',
      is_guard_eligible: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty first_name', () => {
    const result = staffCreateSchema.safeParse({ ...valid, first_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = staffCreateSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for position_id', () => {
    const result = staffCreateSchema.safeParse({ ...valid, position_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = staffCreateSchema.safeParse({ ...valid, start_date: '15/01/2025' })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = staffCreateSchema.safeParse({ ...valid, password: '123' })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from strings', () => {
    const result = staffCreateSchema.safeParse({ ...valid, first_name: '  Ana  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.first_name).toBe('Ana')
  })

  it('lowercases email', () => {
    const result = staffCreateSchema.safeParse({ ...valid, email: 'ANA@EXAMPLE.COM' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('ana@example.com')
  })
})

// ============================================================
// staffDeactivateSchema
// ============================================================
describe('staffDeactivateSchema', () => {
  it('accepts valid UUID', () => {
    expect(staffDeactivateSchema.safeParse({ staffId: validUUID }).success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    expect(staffDeactivateSchema.safeParse({ staffId: 'abc' }).success).toBe(false)
  })
})

// ============================================================
// staffChangeRoleSchema
// ============================================================
describe('staffChangeRoleSchema', () => {
  it('accepts headmaster role', () => {
    expect(
      staffChangeRoleSchema.safeParse({ staff_id: validUUID, new_role: 'headmaster' }).success
    ).toBe(true)
  })

  it('accepts worker role', () => {
    expect(
      staffChangeRoleSchema.safeParse({ staff_id: validUUID, new_role: 'worker' }).success
    ).toBe(true)
  })

  it('rejects invalid role', () => {
    expect(
      staffChangeRoleSchema.safeParse({ staff_id: validUUID, new_role: 'admin' }).success
    ).toBe(false)
  })
})

// ============================================================
// guardGeneratePeriodsSchema
// ============================================================
describe('guardGeneratePeriodsSchema', () => {
  it('accepts valid year', () => {
    const result = guardGeneratePeriodsSchema.safeParse({ year: 2025 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.force).toBe(false) // default
  })

  it('rejects year out of range', () => {
    expect(guardGeneratePeriodsSchema.safeParse({ year: 2023 }).success).toBe(false)
    expect(guardGeneratePeriodsSchema.safeParse({ year: 2031 }).success).toBe(false)
  })
})

// ============================================================
// guardManualAssignSchema
// ============================================================
describe('guardManualAssignSchema', () => {
  it('accepts valid assignment', () => {
    const result = guardManualAssignSchema.safeParse({
      periodId: validUUID,
      assignments: { auxilio: validUUID, tramitador: null, gestor: null },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing periodId', () => {
    const result = guardManualAssignSchema.safeParse({
      assignments: { auxilio: validUUID },
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// authRegisterSchema
// ============================================================
describe('authRegisterSchema', () => {
  const valid = {
    first_name: 'Ana',
    last_name: 'García',
    email: 'ana@example.com',
    password: 'password123',
    position_id: validUUID,
  }

  it('accepts valid registration', () => {
    expect(authRegisterSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects short password', () => {
    expect(authRegisterSchema.safeParse({ ...valid, password: '1234' }).success).toBe(false)
  })

  it('rejects missing email', () => {
    const { email: _, ...noEmail } = valid
    expect(authRegisterSchema.safeParse(noEmail).success).toBe(false)
  })
})

// ============================================================
// authUpdateEmailSchema
// ============================================================
describe('authUpdateEmailSchema', () => {
  it('accepts valid email', () => {
    expect(authUpdateEmailSchema.safeParse({ newEmail: 'new@example.com' }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(authUpdateEmailSchema.safeParse({ newEmail: 'not-email' }).success).toBe(false)
  })
})

// ============================================================
// vacationValidateSchema
// ============================================================
describe('vacationValidateSchema', () => {
  it('accepts valid date range', () => {
    const result = vacationValidateSchema.safeParse({
      staff_id: validUUID,
      start_date: '2025-01-01',
      end_date: '2025-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects end_date before start_date', () => {
    const result = vacationValidateSchema.safeParse({
      staff_id: validUUID,
      start_date: '2025-01-15',
      end_date: '2025-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = vacationValidateSchema.safeParse({
      staff_id: validUUID,
      start_date: '01/01/2025',
      end_date: '15/01/2025',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// settingsUpdateSchema
// ============================================================
describe('settingsUpdateSchema', () => {
  it('accepts valid settings', () => {
    expect(
      settingsUpdateSchema.safeParse({ active_year: 2025, groq_model: 'llama-3.3-70b-versatile' })
        .success
    ).toBe(true)
  })

  it('rejects empty groq_model', () => {
    expect(
      settingsUpdateSchema.safeParse({ active_year: 2025, groq_model: '' }).success
    ).toBe(false)
  })
})

// ============================================================
// groqGenerateGuardsSchema
// ============================================================
describe('groqGenerateGuardsSchema', () => {
  it('accepts valid input with defaults', () => {
    const result = groqGenerateGuardsSchema.safeParse({ year: 2025 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.respectExisting).toBe(true)
  })
})

// ============================================================
// activityCreateSchema
// ============================================================
describe('activityCreateSchema', () => {
  it('accepts valid activity', () => {
    const result = activityCreateSchema.safeParse({
      action: 'create',
      entity_type: 'staff',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty action', () => {
    expect(
      activityCreateSchema.safeParse({ action: '', entity_type: 'staff' }).success
    ).toBe(false)
  })
})

// ============================================================
// activityQuerySchema
// ============================================================
describe('activityQuerySchema', () => {
  it('applies defaults', () => {
    const result = activityQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(20)
  })

  it('coerces string limit to number', () => {
    const result = activityQuerySchema.safeParse({ limit: '50' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.limit).toBe(50)
  })

  it('rejects limit > 100', () => {
    expect(activityQuerySchema.safeParse({ limit: 200 }).success).toBe(false)
  })
})
