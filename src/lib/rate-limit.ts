// src/lib/rate-limit.ts
// In-memory sliding window rate limiter for API routes.
// Suitable for single-instance deployments (Vercel serverless, internal judicial apps).
// For multi-instance production, replace with Upstash Redis (@upstash/ratelimit).

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - windowMs * 2
  store.forEach((entry, key) => {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      store.delete(key)
    }
  })
}

export interface RateLimitConfig {
  /** Max number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterMs: number
}

/**
 * Check if a request is within rate limits using a sliding window algorithm.
 *
 * @param key - Unique identifier for the client (IP, userId, etc.)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and metadata
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  cleanup(config.windowMs)

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > windowStart)

  if (entry.timestamps.length >= config.limit) {
    // Rate limited
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + config.windowMs - now

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 1000),
    }
  }

  // Allow and record
  entry.timestamps.push(now)

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - entry.timestamps.length,
    retryAfterMs: 0,
  }
}

// ============================================================
// Pre-configured rate limit tiers
// ============================================================

/** Auth routes: 5 requests per minute (login attempts, registration) */
export const RATE_LIMIT_AUTH: RateLimitConfig = {
  limit: 5,
  windowMs: 60 * 1000,
}

/** Write routes: 20 requests per minute (CRUD operations) */
export const RATE_LIMIT_WRITE: RateLimitConfig = {
  limit: 20,
  windowMs: 60 * 1000,
}

/** Read routes: 60 requests per minute */
export const RATE_LIMIT_READ: RateLimitConfig = {
  limit: 60,
  windowMs: 60 * 1000,
}

/** AI/Groq routes: 3 requests per minute (expensive API calls) */
export const RATE_LIMIT_AI: RateLimitConfig = {
  limit: 3,
  windowMs: 60 * 1000,
}

/** Strict auth: 3 requests per hour (registration, password reset) */
export const RATE_LIMIT_STRICT_AUTH: RateLimitConfig = {
  limit: 3,
  windowMs: 60 * 60 * 1000,
}
