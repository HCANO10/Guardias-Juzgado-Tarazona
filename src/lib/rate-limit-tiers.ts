// src/lib/rate-limit-tiers.ts
// Maps API routes to their rate limit tier. Extracted for testability.
import {
  RATE_LIMIT_AUTH,
  RATE_LIMIT_WRITE,
  RATE_LIMIT_READ,
  RATE_LIMIT_AI,
  RATE_LIMIT_STRICT_AUTH,
  type RateLimitConfig,
} from '@/lib/rate-limit'

/**
 * Determines the appropriate rate limit tier for an API route.
 */
export function getApiRateLimit(pathname: string, method: string): RateLimitConfig {
  // Registration: very strict (3/hour)
  if (pathname === '/api/auth/register') return RATE_LIMIT_STRICT_AUTH

  // AI endpoints: expensive (3/min)
  if (pathname.startsWith('/api/groq/')) return RATE_LIMIT_AI

  // Auth-related writes (5/min)
  if (pathname.startsWith('/api/auth/') && method === 'POST') return RATE_LIMIT_AUTH

  // GET requests: generous (60/min)
  if (method === 'GET') return RATE_LIMIT_READ

  // All other POST/PUT/DELETE: standard write (20/min)
  return RATE_LIMIT_WRITE
}
