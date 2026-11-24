import "server-only";
import { createHash } from "node:crypto";
import { postgresConfigured, queryPostgres } from "@/lib/database/postgres";
import { apiError } from "@/lib/http/api";

type Bucket = { count: number; resetAt: number };
type Limit = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const memoryBuckets = new Map<string, Bucket>();
let lastDatabaseErrorLog = 0;

/**
 * Client IP from the ONE header the hosting platform controls. Defaults to `x-real-ip`
 * (set by Vercel and by nginx `proxy_set_header X-Real-IP $remote_addr`). Override with
 * TRUSTED_CLIENT_IP_HEADER (e.g. `cf-connecting-ip` behind Cloudflare). X-Forwarded-For chains
 * are never parsed, because their client-supplied entries can be spoofed to dodge limits.
 * Without the header (local development) every request shares the "unknown" bucket.
 */
export function clientAddress(request: Request) {
  const header = (process.env.TRUSTED_CLIENT_IP_HEADER || "x-real-ip").toLowerCase();
  const value = request.headers.get(header)?.split(",")[0]?.trim();
  return value || "unknown";
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function memoryHit(key: string, { limit, windowMs }: Limit, now: number): RateLimitResult {
  if (memoryBuckets.size > 2000) {
    for (const [bucketKey, value] of memoryBuckets) if (value.resetAt <= now) memoryBuckets.delete(bucketKey);
  }
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count > limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  return { allowed: true, retryAfterSeconds: 0 };
}

async function databaseHit(key: string, { limit, windowMs }: Limit, now: number): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs;
  const result = await queryPostgres<{ hits: number }>(
    `INSERT INTO rate_limits (bucket_key, window_start, hits, expires_at)
     VALUES ($1, to_timestamp($2 / 1000.0), 1, to_timestamp($3 / 1000.0))
     ON CONFLICT (bucket_key) DO UPDATE SET
       hits = CASE WHEN rate_limits.window_start = EXCLUDED.window_start THEN rate_limits.hits + 1 ELSE 1 END,
       window_start = EXCLUDED.window_start,
       expires_at = EXCLUDED.expires_at
     RETURNING hits`,
    [key, windowStart, expiresAt],
  );
  if (Math.random() < 0.02) {
    queryPostgres("DELETE FROM rate_limits WHERE expires_at < NOW() - INTERVAL '1 hour'").catch(() => undefined);
  }
  const hits = Number(result.rows[0]?.hits ?? 1);
  if (hits > limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)) };
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Counts one hit against `scope` for this client (or for `subject`, e.g. an admin user id).
 * Shared across instances through Postgres when DATABASE_URL is set; if the database is
 * unavailable it degrades to a per-instance limiter instead of failing open or blocking everyone.
 */
export async function rateLimit(request: Request, scope: string, limit: Limit, subject?: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `${scope}:${hashKey(subject ?? clientAddress(request))}`;
  if (postgresConfigured()) {
    try {
      return await databaseHit(key, limit, now);
    } catch (error) {
      if (now - lastDatabaseErrorLog > 60_000) {
        lastDatabaseErrorLog = now;
        console.error("[rate-limit] shared limiter unavailable; using per-instance fallback", error instanceof Error ? error.message : error);
      }
    }
  }
  return memoryHit(key, limit, now);
}

/** Returns a 429 response when the limit is exceeded, otherwise null. */
export async function enforceRateLimit(request: Request, scope: string, limit: Limit, message: string, subject?: string) {
  const result = await rateLimit(request, scope, limit, subject);
  if (result.allowed) return null;
  return apiError("RATE_LIMITED", message, 429, { "Retry-After": String(result.retryAfterSeconds) });
}

/** Test-only: clears the per-instance buckets. */
export function resetMemoryRateLimits() {
  memoryBuckets.clear();
}
