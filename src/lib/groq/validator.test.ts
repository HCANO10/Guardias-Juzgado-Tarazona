// src/lib/groq/validator.test.ts
import { describe, it, expect } from 'vitest'
import { validateProposal, type ProposalAssignment } from './validator'

const period1 = 'p1-uuid'
const period2 = 'p2-uuid'
const auxA = 'aux-a'
const auxB = 'aux-b'
const tramA = 'tram-a'
const gestA = 'gest-a'

const validPeriodIds = new Set([period1, period2])
const staffIds = {
  auxilio: new Set([auxA, auxB]),
  tramitador: new Set([tramA]),
  gestor: new Set([gestA]),
}
const periodDates = new Map([
  [period1, { start: new Date('2025-01-06'), end: new Date('2025-01-10') }],
  [period2, { start: new Date('2025-01-13'), end: new Date('2025-01-17') }],
])

function makeAssignment(overrides: Partial<ProposalAssignment> = {}): ProposalAssignment {
  return {
    guard_period_id: period1,
    week_number: 1,
    auxilio_staff_id: auxA,
    tramitador_staff_id: tramA,
    gestor_staff_id: gestA,
    ...overrides,
  }
}

describe('validateProposal', () => {
  it('validates a correct proposal with no errors', () => {
    const result = validateProposal(
      [makeAssignment()],
      validPeriodIds,
      staffIds,
      [],
      periodDates
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects invalid period ID', () => {
    const result = validateProposal(
      [makeAssignment({ guard_period_id: 'invalid-id' })],
      validPeriodIds,
      staffIds,
      [],
      periodDates
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('guard_period_id no existe'))).toBe(true)
  })

  it('detects wrong staff category', () => {
    const result = validateProposal(
      [makeAssignment({ auxilio_staff_id: tramA })], // tramitador assigned as auxilio
      validPeriodIds,
      staffIds,
      [],
      periodDates
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('auxilio_staff_id no es un auxilio'))).toBe(true)
  })

  it('detects vacation conflict', () => {
    const vacations = [
      { staff_id: auxA, start: new Date('2025-01-05'), end: new Date('2025-01-08') },
    ]
    const result = validateProposal(
      [makeAssignment()],
      validPeriodIds,
      staffIds,
      vacations,
      periodDates
    )
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('vacaciones que solapan'))).toBe(true)
  })

  it('does NOT flag vacation outside period', () => {
    const vacations = [
      { staff_id: auxA, start: new Date('2025-02-01'), end: new Date('2025-02-15') },
    ]
    const result = validateProposal(
      [makeAssignment()],
      validPeriodIds,
      staffIds,
      vacations,
      periodDates
    )
    expect(result.valid).toBe(true)
  })

  it('warns on unequal distribution (diff > 2)', () => {
    // auxA gets 4 assignments, auxB gets 1 → diff = 3
    const assignments = [
      makeAssignment({ guard_period_id: period1, week_number: 1, auxilio_staff_id: auxA }),
      makeAssignment({ guard_period_id: period2, week_number: 2, auxilio_staff_id: auxA }),
      makeAssignment({ guard_period_id: period1, week_number: 3, auxilio_staff_id: auxA }),
      makeAssignment({ guard_period_id: period2, week_number: 4, auxilio_staff_id: auxA }),
      makeAssignment({ guard_period_id: period1, week_number: 5, auxilio_staff_id: auxB }),
    ]
    const result = validateProposal(
      assignments,
      validPeriodIds,
      staffIds,
      [],
      periodDates
    )
    expect(result.warnings.some(w => w.includes('Distribución desigual'))).toBe(true)
  })

  it('does NOT warn when distribution is balanced', () => {
    const assignments = [
      makeAssignment({ guard_period_id: period1, week_number: 1, auxilio_staff_id: auxA }),
      makeAssignment({ guard_period_id: period2, week_number: 2, auxilio_staff_id: auxB }),
    ]
    const result = validateProposal(
      assignments,
      validPeriodIds,
      staffIds,
      [],
      periodDates
    )
    expect(result.warnings.filter(w => w.includes('auxilios'))).toHaveLength(0)
  })

  it('allows partial assignments (null staff IDs)', () => {
    const result = validateProposal(
      [makeAssignment({ auxilio_staff_id: '', tramitador_staff_id: '', gestor_staff_id: '' })],
      validPeriodIds,
      staffIds,
      [],
      periodDates
    )
    expect(result.valid).toBe(true)
  })
})
