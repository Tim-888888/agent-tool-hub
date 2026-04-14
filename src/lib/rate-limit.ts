/**
 * Simple in-memory rate limiter for MVP.
 *
 * Designed to be swapped for @upstash/ratelimit + @upstash/redis later.
 * For 1000 DAU this is sufficient — serverless cold starts naturally
 * reset the map, which is an acceptable trade-off.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up entries older than the largest window every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  // Remove all entries whose timestamps are all older than 1 hour
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3_600_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits.
 *
 * @param key - Identifier (e.g., IP address, user ID)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Filter out timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs;

  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length, resetAt };
}

/**
 * Convenience presets for different route types.
 */
export const RATE_LIMITS = {
  /** Public search/list endpoints: 60 req/min */
  search: { limit: 60, windowMs: 60_000 },
  /** Write endpoints (reviews, tags, submit): 10 req/min */
  write: { limit: 10, windowMs: 60_000 },
  /** Admin endpoints: 30 req/min */
  admin: { limit: 30, windowMs: 60_000 },
  /** Global per-IP: 120 req/min */
  global: { limit: 120, windowMs: 60_000 },
} as const;

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Apply rate limiting to an API route handler.
 * Returns an error response if rate limited, null if allowed.
 *
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   const limited = checkRateLimit(request, RATE_LIMITS.write);
 *   if (limited) return limited;
 *   // ... handle request
 * }
 * ```
 */
export function checkRateLimit(
  request: Request,
  preset: { limit: number; windowMs: number }
): Response | null {
  const ip = getClientIp(request);
  const result = rateLimit(ip, preset.limit, preset.windowMs);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
