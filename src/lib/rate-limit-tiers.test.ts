// src/lib/rate-limit-tiers.test.ts
import { describe, it, expect } from 'vitest'
import { getApiRateLimit } from './rate-limit-tiers'
import {
  RATE_LIMIT_STRICT_AUTH,
  RATE_LIMIT_AI,
  RATE_LIMIT_AUTH,
  RATE_LIMIT_READ,
  RATE_LIMIT_WRITE,
} from './rate-limit'

describe('getApiRateLimit', () => {
  it('returns STRICT_AUTH for /api/auth/register', () => {
    expect(getApiRateLimit('/api/auth/register', 'POST')).toBe(RATE_LIMIT_STRICT_AUTH)
  })

  it('returns AI for /api/groq/* routes', () => {
    expect(getApiRateLimit('/api/groq/test', 'POST')).toBe(RATE_LIMIT_AI)
    expect(getApiRateLimit('/api/groq/generate-guards', 'POST')).toBe(RATE_LIMIT_AI)
  })

  it('returns AUTH for POST to /api/auth/* (non-register)', () => {
    expect(getApiRateLimit('/api/auth/complete-profile', 'POST')).toBe(RATE_LIMIT_AUTH)
    expect(getApiRateLimit('/api/auth/update-email', 'POST')).toBe(RATE_LIMIT_AUTH)
  })

  it('returns READ for GET requests', () => {
    expect(getApiRateLimit('/api/activity', 'GET')).toBe(RATE_LIMIT_READ)
    expect(getApiRateLimit('/api/staff/123', 'GET')).toBe(RATE_LIMIT_READ)
  })

  it('returns WRITE for POST/PUT/DELETE to non-special routes', () => {
    expect(getApiRateLimit('/api/staff/create', 'POST')).toBe(RATE_LIMIT_WRITE)
    expect(getApiRateLimit('/api/settings/update', 'POST')).toBe(RATE_LIMIT_WRITE)
    expect(getApiRateLimit('/api/vacations/validate', 'POST')).toBe(RATE_LIMIT_WRITE)
  })

  it('register overrides generic auth POST', () => {
    // /api/auth/register should be STRICT_AUTH, not AUTH
    const result = getApiRateLimit('/api/auth/register', 'POST')
    expect(result).toBe(RATE_LIMIT_STRICT_AUTH)
    expect(result).not.toBe(RATE_LIMIT_AUTH)
  })
})
