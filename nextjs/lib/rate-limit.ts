/**
 * Fixed-window rate limiter for route handlers.
 *
 * LIMITATION, read before relying on this: state lives in the memory of a single
 * serverless instance. Vercel runs many instances, so the effective global limit is
 * roughly `limit x instanceCount`, and counters reset on cold start. That is fine for
 * what this defends against — casual abuse and accidental client retry storms — but it
 * is NOT a hard guarantee. Before opening any endpoint that costs real money per call,
 * move this to Upstash Redis / Vercel KV so the window is shared across instances.
 */

type Bucket = { count: number; resetAt: number }

const BUCKETS = new Map<string, Bucket>()

/** Cap the map so a flood of unique keys can't grow it without bound. */
const MAX_KEYS = 10_000

function sweep(now: number) {
  for (const [key, bucket] of BUCKETS) {
    if (bucket.resetAt <= now) BUCKETS.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  /** Requests left in the current window. */
  remaining: number
  /** Seconds until the window resets — send as Retry-After. */
  retryAfter: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()

  if (BUCKETS.size > MAX_KEYS) sweep(now)

  const existing = BUCKETS.get(key)

  if (!existing || existing.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }

  existing.count += 1

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  return { ok: true, remaining: limit - existing.count, retryAfter: 0 }
}

/**
 * Best-effort client IP. On Vercel `x-forwarded-for` is set by the edge and the
 * left-most entry is the real client. Falls back to a constant so a missing header
 * degrades to a shared bucket rather than to no limit at all.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** 429 response with the standard headers. */
export function tooManyRequests(result: RateLimitResult, message: string) {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'Cache-Control': 'no-store',
      },
    },
  )
}
