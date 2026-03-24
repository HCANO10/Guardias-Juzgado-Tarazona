import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  normalizeStaffData,
  buildFullName,
  buildShortName,
} from '../normalize'

describe('normalize.ts', () => {
  // ─────────────────────────────────────────────
  // normalizeStaffData
  // ─────────────────────────────────────────────
  describe('normalizeStaffData', () => {
    const baseInput = {
      auth_user_id: 'user-123',
      first_name: '  JUAN  ',
      last_name: '  pérez  ',
      email: '  Juan@Example.COM  ',
      position_id: 'pos-abc',
    }

    it('capitaliza first_name y last_name', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.first_name).toBe('Juan')
      expect(result.last_name).toBe('Pérez')
    })

    it('normaliza el email a minúsculas y sin espacios', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.email).toBe('juan@example.com')
    })

    it('establece is_active = true por defecto', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.is_active).toBe(true)
    })

    it('establece role = worker por defecto', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.role).toBe('worker')
    })

    it('establece start_date como la fecha actual (YYYY-MM-DD)', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('capitaliza second_last_name si se proporciona', () => {
      const result = normalizeStaffData({ ...baseInput, second_last_name: '  GARCÍA  ' })
      expect(result.second_last_name).toBe('García')
    })

    it('establece second_last_name = null si no se proporciona', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.second_last_name).toBeNull()
    })

    it('establece phone = null si no se proporciona', () => {
      const result = normalizeStaffData(baseInput)
      expect(result.phone).toBeNull()
    })

    it('limpia y conserva phone si se proporciona', () => {
      const result = normalizeStaffData({ ...baseInput, phone: '  678 123 456  ' })
      expect(result.phone).toBe('678 123 456')
    })

    it('establece notes = null si no se proporciona o es vacío', () => {
      const result = normalizeStaffData({ ...baseInput, notes: '   ' })
      expect(result.notes).toBeNull()
    })

    it('limpia y conserva notes si se proporciona', () => {
      const result = normalizeStaffData({ ...baseInput, notes: '  Nota de prueba  ' })
      expect(result.notes).toBe('Nota de prueba')
    })
  })

  // ─────────────────────────────────────────────
  // buildFullName
  // ─────────────────────────────────────────────
  describe('buildFullName', () => {
    it('devuelve first + last cuando no hay second_last_name', () => {
      expect(buildFullName({ first_name: 'Juan', last_name: 'Pérez' }))
        .toBe('Juan Pérez')
    })

    it('devuelve first + last + second cuando existe', () => {
      expect(buildFullName({ first_name: 'Juan', last_name: 'Pérez', second_last_name: 'García' }))
        .toBe('Juan Pérez García')
    })

    it('ignora second_last_name null', () => {
      expect(buildFullName({ first_name: 'Ana', last_name: 'López', second_last_name: null }))
        .toBe('Ana López')
    })
  })

  // ─────────────────────────────────────────────
  // buildShortName
  // ─────────────────────────────────────────────
  describe('buildShortName', () => {
    it('devuelve first + last', () => {
      expect(buildShortName({ first_name: 'Juan', last_name: 'Pérez' }))
        .toBe('Juan Pérez')
    })
  })
})
