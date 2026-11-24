type Env = Record<string, string | undefined>;

/** scripts/generate-admin-hash.mjs: scrypt$<16-byte salt hex>$<64-byte hash hex>. */
export const ADMIN_HASH_SHAPE = /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/i;

/** Production configuration problems, described by variable name only (never values). */
export function productionConfigProblems(env: Env = process.env): string[] {
  const problems: string[] = [];
  const paymentsWanted = env.BOOKING_PRODUCTION_READY !== "false" && Boolean(env.RAZORPAY_KEY_ID?.trim());
  if (paymentsWanted && !env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
    problems.push("RAZORPAY_WEBHOOK_SECRET is not set: online payment stays disabled and webhooks are rejected until it is configured.");
  }
  if (env.ADMIN_PASSWORD && !env.ADMIN_USERS_JSON?.trim()) {
    problems.push("Only plain-text ADMIN_PASSWORD is configured: it is ignored in production. Set ADMIN_USERS_JSON (scripts/generate-admin-hash.mjs).");
  }
  if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32) {
    problems.push("ADMIN_SESSION_SECRET is missing or shorter than 32 characters: staff sign-in is unavailable.");
  }
  if (env.ADMIN_USERS_JSON?.trim()) {
    if (!env.DATABASE_URL?.trim()) {
      problems.push("ADMIN_USERS_JSON is set but DATABASE_URL is not: staff sessions and the audit log live in PostgreSQL (migration 005), so staff sign-in is unavailable.");
    }
    let roles: unknown[] = [];
    try {
      const parsed = JSON.parse(env.ADMIN_USERS_JSON) as unknown;
      roles = Array.isArray(parsed) ? parsed.map((item) => (item as { role?: unknown })?.role) : [];
    } catch {
      problems.push("ADMIN_USERS_JSON is not valid JSON: no staff account can sign in.");
    }
    const hashes = (() => {
      try {
        const parsed = JSON.parse(env.ADMIN_USERS_JSON) as unknown;
        return Array.isArray(parsed) ? parsed.map((item) => (item as { passwordHash?: unknown })?.passwordHash) : [];
      } catch {
        return [];
      }
    })();
    const malformed = hashes.filter((hash) => typeof hash !== "string" || !ADMIN_HASH_SHAPE.test(hash)).length;
    if (malformed) {
      problems.push(`${malformed} ADMIN_USERS_JSON passwordHash value(s) are not in the form scrypt$<32 hex>$<128 hex>: that account can never sign in. In a .env file every "$" must be written "\\$" (the loader expands "$name" and silently deletes it); regenerate with scripts/generate-admin-hash.mjs.`);
    }
    if (roles.length && !roles.includes("owner")) {
      problems.push("No ADMIN_USERS_JSON account has \"role\":\"owner\": entries without a role are managers, so staff and session management is unavailable.");
    }
  }
  if (env.PAYMENT_TEST_MODE === "true") {
    problems.push("PAYMENT_TEST_MODE=true is ignored in production; remove it.");
  }
  return problems;
}
