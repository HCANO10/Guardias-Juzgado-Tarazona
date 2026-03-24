import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkRateLimit,
  RATE_LIMIT_AUTH,
  RATE_LIMIT_WRITE,
  RATE_LIMIT_READ,
  RATE_LIMIT_AI,
  RATE_LIMIT_STRICT_AUTH,
  type RateLimitConfig,
} from '../rate-limit'

describe('rate-limit.ts', () => {
  // Use unique keys per test to avoid cross-contamination
  let testKey: string
  let keyCounter = 0

  beforeEach(() => {
    keyCounter++
    testKey = `test-ip-${keyCounter}-${Date.now()}`
  })

  // ─────────────────────────────────────────────
  // checkRateLimit
  // ─────────────────────────────────────────────
  describe('checkRateLimit', () => {
    const config: RateLimitConfig = { limit: 3, windowMs: 60_000 }

    it('permite la primera petición', () => {
      const result = checkRateLimit(testKey, config)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
      expect(result.limit).toBe(3)
    })

    it('permite hasta el límite', () => {
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      const third = checkRateLimit(testKey, config)
      expect(third.allowed).toBe(true)
      expect(third.remaining).toBe(0)
    })

    it('bloquea cuando se excede el límite', () => {
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      const fourth = checkRateLimit(testKey, config)
      expect(fourth.allowed).toBe(false)
      expect(fourth.remaining).toBe(0)
      expect(fourth.retryAfterMs).toBeGreaterThan(0)
    })

    it('diferentes keys son independientes', () => {
      const key2 = testKey + '-other'
      // Saturar testKey
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      expect(checkRateLimit(testKey, config).allowed).toBe(false)

      // key2 sigue disponible
      expect(checkRateLimit(key2, config).allowed).toBe(true)
    })

    it('retryAfterMs es al menos 1000ms', () => {
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      checkRateLimit(testKey, config)
      const blocked = checkRateLimit(testKey, config)
      expect(blocked.retryAfterMs).toBeGreaterThanOrEqual(1000)
    })
  })

  // ─────────────────────────────────────────────
  // Pre-configured tiers
  // ─────────────────────────────────────────────
  describe('tiers pre-configurados', () => {
    it('AUTH: 5/min', () => {
      expect(RATE_LIMIT_AUTH.limit).toBe(5)
      expect(RATE_LIMIT_AUTH.windowMs).toBe(60_000)
    })

    it('WRITE: 20/min', () => {
      expect(RATE_LIMIT_WRITE.limit).toBe(20)
      expect(RATE_LIMIT_WRITE.windowMs).toBe(60_000)
    })

    it('READ: 60/min', () => {
      expect(RATE_LIMIT_READ.limit).toBe(60)
      expect(RATE_LIMIT_READ.windowMs).toBe(60_000)
    })

    it('AI: 3/min', () => {
      expect(RATE_LIMIT_AI.limit).toBe(3)
      expect(RATE_LIMIT_AI.windowMs).toBe(60_000)
    })

    it('STRICT_AUTH: 3/hora', () => {
      expect(RATE_LIMIT_STRICT_AUTH.limit).toBe(3)
      expect(RATE_LIMIT_STRICT_AUTH.windowMs).toBe(3_600_000)
    })
  })
})
