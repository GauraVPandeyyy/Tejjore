function originOf(value: string | undefined | null) {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function allowedOrigins(request: Request) {
  const allowed = new Set<string>();
  const host = request.headers.get("host")?.trim().toLowerCase();
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  const requestOrigin = originOf(request.url);
  if (requestOrigin) allowed.add(requestOrigin);
  const siteOrigin = originOf(process.env.NEXT_PUBLIC_SITE_URL);
  if (siteOrigin) allowed.add(siteOrigin);
  return allowed;
}

/**
 * CSRF defence for state-changing requests. Browsers always send `Origin` on POST/PUT/PATCH/DELETE;
 * when it is absent we accept only an explicit `Sec-Fetch-Site: same-origin`. Requests carrying
 * neither are rejected, so the check fails closed. Server-to-server callers (Razorpay webhooks)
 * must not use this guard; they are authenticated by signature instead.
 */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const normalized = origin.trim().toLowerCase();
    return normalized !== "null" && allowedOrigins(request).has(normalized);
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}
