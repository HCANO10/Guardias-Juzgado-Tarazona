// src/lib/staff/normalize.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeStaffData, buildFullName, buildShortName } from './normalize'

// ============================================================
// buildFullName
// ============================================================
describe('buildFullName', () => {
  it('returns first + last when no second_last_name', () => {
    expect(buildFullName({ first_name: 'Ana', last_name: 'García' })).toBe('Ana García')
  })

  it('returns first + last + second when second_last_name exists', () => {
    expect(
      buildFullName({ first_name: 'Ana', last_name: 'García', second_last_name: 'López' })
    ).toBe('Ana García López')
  })

  it('ignores null second_last_name', () => {
    expect(
      buildFullName({ first_name: 'Ana', last_name: 'García', second_last_name: null })
    ).toBe('Ana García')
  })

  it('ignores empty string second_last_name', () => {
    expect(
      buildFullName({ first_name: 'Ana', last_name: 'García', second_last_name: '' })
    ).toBe('Ana García')
  })
})

// ============================================================
// buildShortName
// ============================================================
describe('buildShortName', () => {
  it('returns first + last only', () => {
    expect(buildShortName({ first_name: 'Ana', last_name: 'García' })).toBe('Ana García')
  })
})

// ============================================================
// normalizeStaffData
// ============================================================
describe('normalizeStaffData', () => {
  const base = {
    auth_user_id: '550e8400-e29b-41d4-a716-446655440000',
    first_name: '  ana  ',
    last_name: '  GARCÍA  ',
    email: '  ANA@EXAMPLE.COM  ',
    position_id: '550e8400-e29b-41d4-a716-446655440001',
  }

  it('capitalizes first_name and last_name', () => {
    const result = normalizeStaffData(base)
    expect(result.first_name).toBe('Ana')
    expect(result.last_name).toBe('García')
  })

  it('lowercases and trims email', () => {
    const result = normalizeStaffData(base)
    expect(result.email).toBe('ana@example.com')
  })

  it('sets default role to worker', () => {
    const result = normalizeStaffData(base)
    expect(result.role).toBe('worker')
  })

  it('sets is_active to true', () => {
    const result = normalizeStaffData(base)
    expect(result.is_active).toBe(true)
  })

  it('sets start_date to today in YYYY-MM-DD format', () => {
    const result = normalizeStaffData(base)
    expect(result.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('normalizes second_last_name when provided', () => {
    const result = normalizeStaffData({ ...base, second_last_name: '  LÓPEZ  ' })
    expect(result.second_last_name).toBe('López')
  })

  it('sets second_last_name to null when not provided', () => {
    const result = normalizeStaffData(base)
    expect(result.second_last_name).toBeNull()
  })

  it('trims phone or sets null', () => {
    expect(normalizeStaffData({ ...base, phone: '  123  ' }).phone).toBe('123')
    expect(normalizeStaffData({ ...base, phone: '  ' }).phone).toBeNull()
    expect(normalizeStaffData(base).phone).toBeNull()
  })

  it('trims notes or sets null', () => {
    expect(normalizeStaffData({ ...base, notes: '  nota  ' }).notes).toBe('nota')
    expect(normalizeStaffData({ ...base, notes: '  ' }).notes).toBeNull()
    expect(normalizeStaffData(base).notes).toBeNull()
  })
})
