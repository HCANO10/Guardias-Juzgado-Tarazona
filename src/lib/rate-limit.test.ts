// src/lib/rate-limit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, type RateLimitConfig } from './rate-limit'

describe('checkRateLimit', () => {
  const config: RateLimitConfig = { limit: 3, windowMs: 60_000 }

  beforeEach(() => {
    // Reset the internal store between tests by using unique keys
  })

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`
    const r1 = checkRateLimit(key, config)
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)

    const r2 = checkRateLimit(key, config)
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = checkRateLimit(key, config)
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests exceeding the limit', () => {
    const key = `test-block-${Date.now()}`

    checkRateLimit(key, config)
    checkRateLimit(key, config)
    checkRateLimit(key, config)

    const r4 = checkRateLimit(key, config)
    expect(r4.allowed).toBe(false)
    expect(r4.remaining).toBe(0)
    expect(r4.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after the window expires', () => {
    const key = `test-reset-${Date.now()}`

    checkRateLimit(key, config)
    checkRateLimit(key, config)
    checkRateLimit(key, config)

    // Simulate time passing beyond the window
    vi.useFakeTimers()
    vi.advanceTimersByTime(61_000)

    const result = checkRateLimit(key, config)
    expect(result.allowed).toBe(true)

    vi.useRealTimers()
  })

  it('returns correct limit metadata', () => {
    const key = `test-meta-${Date.now()}`
    const result = checkRateLimit(key, config)
    expect(result.limit).toBe(3)
  })

  it('different keys are independent', () => {
    const keyA = `test-a-${Date.now()}`
    const keyB = `test-b-${Date.now()}`

    checkRateLimit(keyA, config)
    checkRateLimit(keyA, config)
    checkRateLimit(keyA, config)

    const resultB = checkRateLimit(keyB, config)
    expect(resultB.allowed).toBe(true)
    expect(resultB.remaining).toBe(2)
  })

  it('retryAfterMs is at least 1000ms when blocked', () => {
    const key = `test-retry-${Date.now()}`

    checkRateLimit(key, config)
    checkRateLimit(key, config)
    checkRateLimit(key, config)

    const result = checkRateLimit(key, config)
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000)
  })
})
