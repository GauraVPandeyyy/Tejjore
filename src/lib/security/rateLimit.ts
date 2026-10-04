type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// The first X-Forwarded-For entry is supplied by the client and can be spoofed to dodge
// limits. Prefer the proxy-set x-real-ip, then the entry appended by the nearest proxy.
export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return request.headers.get("x-real-ip")?.trim()
    || forwarded?.[forwarded.length - 1]
    || "unknown";
}

export function rateLimit(
  request: Request,
  scope: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;

  if (buckets.size > 2000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
