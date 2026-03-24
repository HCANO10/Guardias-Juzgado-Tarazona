// src/lib/validators/api.test.ts
import { describe, it, expect } from 'vitest'
import { validateBody, validateQuery } from './api'
import { staffCreateSchema, activityQuerySchema } from './schemas'

// Helper to create a fake Request with JSON body
function fakeRequest(body: unknown): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validUUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================================
// validateBody
// ============================================================
describe('validateBody', () => {
  it('returns parsed data on valid body', async () => {
    const result = await validateBody(
      fakeRequest({
        first_name: 'Ana',
        last_name: 'García',
        email: 'ana@example.com',
        position_id: validUUID,
      }),
      staffCreateSchema
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.first_name).toBe('Ana')
      expect(result.data.email).toBe('ana@example.com')
    }
  })

  it('returns 400 response on invalid body', async () => {
    const result = await validateBody(
      fakeRequest({ first_name: '' }),
      staffCreateSchema
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(400)
      const json = await result.response.json()
      expect(json.error).toBeDefined()
    }
  })

  it('returns 400 on non-JSON body', async () => {
    const badRequest = new Request('http://localhost/api/test', {
      method: 'POST',
      body: 'not json',
    })
    const result = await validateBody(badRequest, staffCreateSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(400)
      const json = await result.response.json()
      expect(json.error).toContain('JSON')
    }
  })
})

// ============================================================
// validateQuery
// ============================================================
describe('validateQuery', () => {
  it('returns parsed data with defaults', () => {
    const params = new URLSearchParams()
    const result = validateQuery(params, activityQuerySchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
    }
  })

  it('parses provided params', () => {
    const params = new URLSearchParams({ limit: '50', type: 'staff' })
    const result = validateQuery(params, activityQuerySchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.type).toBe('staff')
    }
  })

  it('returns 400 on invalid params', () => {
    const params = new URLSearchParams({ limit: '999' })
    const result = validateQuery(params, activityQuerySchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(400)
    }
  })
})
