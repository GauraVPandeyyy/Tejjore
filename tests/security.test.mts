import { strict as assert } from "node:assert";
import { beforeEach, describe, test } from "node:test";
import { isolateEnv, makeReservation, setEnv } from "./setup/env.mts";

isolateEnv();

const { apiError, internalError, rejectNonJson, guardJsonMutation } = await import("../src/lib/http/api");
const { isSameOriginRequest } = await import("../src/lib/security/origin");
const { rateLimit, clientAddress, resetMemoryRateLimits } = await import("../src/lib/security/rateLimit");
const { databaseConnectionConfig } = await import("../src/lib/database/tls");
const { siteUrl } = await import("../src/lib/site");
const { legacyAdminPasswordAllowed, authenticateAdmin } = await import("../src/lib/admin/auth");
const { toAdminReservationDetail, toAdminReservationSummary } = await import("../src/lib/admin/operations");
const { paymentMode } = await import("../src/lib/payments/razorpay");
const { productionConfigProblems } = await import("../src/lib/config/productionChecks");
const conciergeRoute = await import("../src/app/api/concierge/route");
const availabilityRoute = await import("../src/app/api/availability/route");
const { isEditableTarget } = await import("../src/components/virtual-tour/MarzipanoViewer");

const ORIGIN = "http://localhost:3000";

function jsonPost(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}

function withNodeEnv<T>(value: string, run: () => T): T {
  const previous = process.env.NODE_ENV;
  setEnv({ NODE_ENV: value });
  try {
    return run();
  } finally {
    setEnv({ NODE_ENV: previous });
  }
}

beforeEach(() => resetMemoryRateLimits());

describe("JSON + same-origin mutation protection", () => {
  test("text/plain is rejected with 415; application/json (with charset) passes", async () => {
    const plain = new Request(`${ORIGIN}/x`, { method: "POST", headers: { "content-type": "text/plain", origin: ORIGIN }, body: "{}" });
    const rejected = rejectNonJson(plain);
    assert.equal(rejected?.status, 415);
    assert.equal(((await rejected!.json()) as { error: { code: string } }).error.code, "UNSUPPORTED_MEDIA_TYPE");
    const json = new Request(`${ORIGIN}/x`, { method: "POST", headers: { "content-type": "application/json; charset=utf-8", origin: ORIGIN }, body: "{}" });
    assert.equal(rejectNonJson(json), null);
  });

  test("Origin enforcement", () => {
    const make = (headers: Record<string, string>) => new Request(`${ORIGIN}/api/x`, { method: "POST", headers });
    assert.equal(isSameOriginRequest(make({ origin: ORIGIN })), true);
    assert.equal(isSameOriginRequest(make({ origin: "https://evil.example" })), false);
    assert.equal(isSameOriginRequest(make({ origin: "null" })), false);
    assert.equal(isSameOriginRequest(make({ "sec-fetch-site": "same-origin" })), true);
    assert.equal(isSameOriginRequest(make({ "sec-fetch-site": "cross-site" })), false);
    assert.equal(isSameOriginRequest(make({})), false, "requests with neither Origin nor fetch metadata fail closed");
  });

  test("concierge route rejects cross-site text/plain and foreign origins", async () => {
    const textPlain = new Request(`${ORIGIN}/api/concierge`, { method: "POST", headers: { "content-type": "text/plain", origin: ORIGIN }, body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }) });
    assert.equal((await conciergeRoute.POST(textPlain)).status, 415);
    const foreign = jsonPost("/api/concierge", { messages: [{ role: "user", content: "hi" }] }, { origin: "https://evil.example" });
    assert.equal((await conciergeRoute.POST(foreign)).status, 403);
    const ok = await conciergeRoute.POST(jsonPost("/api/concierge", { messages: [{ role: "user", content: "Where are you located?" }] }));
    assert.equal(ok.status, 200);
  });

  test("availability route rejects text/plain from another site", async () => {
    const request = new Request(`${ORIGIN}/api/availability`, { method: "POST", headers: { "content-type": "text/plain", origin: "https://evil.example" }, body: "{}" });
    assert.equal((await availabilityRoute.POST(request)).status, 403);
    assert.notEqual(guardJsonMutation(request), null);
  });
});

describe("error sanitisation", () => {
  test("internal errors never echo the underlying message", async () => {
    const response = internalError("test", new Error("password=hunter2 at pg://db.internal:5432"), "Something went wrong.");
    const text = await response.text();
    assert.equal(response.status, 503);
    assert.equal(text.includes("hunter2"), false);
    assert.equal(text.includes("db.internal"), false);
    const body = JSON.parse(text) as { error: { code: string; message: string } };
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.match(body.error.message, /^Something went wrong\. \(ref [0-9a-f]{8}\)$/);
  });

  test("error contract shape", async () => {
    const body = await apiError("SOME_CODE", "Safe message", 400).json();
    assert.deepEqual(body, { error: { code: "SOME_CODE", message: "Safe message" } });
  });
});

describe("rate limiting", () => {
  test("allows up to the limit, then 429 with Retry-After semantics", async () => {
    const request = new Request(`${ORIGIN}/x`, { headers: { "x-real-ip": "203.0.113.7" } });
    const limit = { limit: 3, windowMs: 60_000 };
    for (let index = 0; index < 3; index += 1) assert.equal((await rateLimit(request, "t", limit)).allowed, true);
    const blocked = await rateLimit(request, "t", limit);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);
    const other = new Request(`${ORIGIN}/x`, { headers: { "x-real-ip": "203.0.113.8" } });
    assert.equal((await rateLimit(other, "t", limit)).allowed, true, "limits are per client");
  });

  test("only the trusted platform header identifies the client; X-Forwarded-For is ignored", () => {
    const spoofed = new Request(`${ORIGIN}/x`, { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8", "x-real-ip": "198.51.100.1" } });
    assert.equal(clientAddress(spoofed), "198.51.100.1");
    const onlyForwarded = new Request(`${ORIGIN}/x`, { headers: { "x-forwarded-for": "1.2.3.4" } });
    assert.equal(clientAddress(onlyForwarded), "unknown");
    setEnv({ TRUSTED_CLIENT_IP_HEADER: "cf-connecting-ip" });
    try {
      const cloudflare = new Request(`${ORIGIN}/x`, { headers: { "cf-connecting-ip": "192.0.2.9", "x-real-ip": "198.51.100.1" } });
      assert.equal(clientAddress(cloudflare), "192.0.2.9");
    } finally {
      setEnv({ TRUSTED_CLIENT_IP_HEADER: "" });
    }
  });

  test("subject keys (per account / per reference) are independent of the client address", async () => {
    const a = new Request(`${ORIGIN}/x`, { headers: { "x-real-ip": "203.0.113.20" } });
    const b = new Request(`${ORIGIN}/x`, { headers: { "x-real-ip": "203.0.113.21" } });
    const limit = { limit: 1, windowMs: 60_000 };
    assert.equal((await rateLimit(a, "acct", limit, "frontdesk")).allowed, true);
    assert.equal((await rateLimit(b, "acct", limit, "frontdesk")).allowed, false, "rotating IPs does not reset the account limit");
  });
});

describe("admin hardening", () => {
  test("plain-text admin password is rejected in production, allowed in development", () => {
    assert.equal(legacyAdminPasswordAllowed("production"), false);
    assert.equal(legacyAdminPasswordAllowed("development"), true);
    setEnv({ ADMIN_USER_ID: "owner", ADMIN_PASSWORD: "plain-pass", ADMIN_USERS_JSON: "" });
    try {
      assert.notEqual(withNodeEnv("development", () => authenticateAdmin("owner", "plain-pass")), null);
      assert.equal(withNodeEnv("production", () => authenticateAdmin("owner", "plain-pass")), null);
    } finally {
      setEnv({ ADMIN_USER_ID: undefined, ADMIN_PASSWORD: undefined });
    }
  });

  test("unknown and wrong-password logins are indistinguishable", () => {
    setEnv({ ADMIN_USER_ID: "owner", ADMIN_PASSWORD: "plain-pass" });
    try {
      assert.equal(authenticateAdmin("nobody", "x"), null);
      assert.equal(authenticateAdmin("owner", "wrong"), null);
    } finally {
      setEnv({ ADMIN_USER_ID: undefined, ADMIN_PASSWORD: undefined });
    }
  });

  test("overview list projection carries no contact details or token hashes", () => {
    const summary = toAdminReservationSummary(makeReservation());
    const serialized = JSON.stringify(summary);
    for (const secret of ["deadbeef", "asha@example.test", "98765 43210", "Late arrival", "accessTokenHash"]) {
      assert.equal(serialized.includes(secret), false, `summary leaked ${secret}`);
    }
    assert.equal(summary.phoneLast4, "3210");
    assert.equal(summary.guestName, "Asha Verma");
  });

  test("detail projection never includes the access token hash", () => {
    const detail = toAdminReservationDetail(makeReservation());
    assert.equal("accessTokenHash" in detail, false);
    assert.equal(detail.guest.email, "asha@example.test");
  });
});

describe("configuration fail-safes", () => {
  test("database TLS: production always verifies the certificate (system CA by default)", () => {
    const env = { DATABASE_URL: "postgresql://u:p@db.example:5432/app?sslmode=require", DATABASE_SSL: "true" };
    assert.equal(databaseConnectionConfig(env, "production").ssl?.rejectUnauthorized, true);
    const dev = databaseConnectionConfig(env, "development");
    assert.equal(dev.ssl?.rejectUnauthorized, false);
    assert.ok(dev.warning);
    const verified = databaseConnectionConfig({ ...env, DATABASE_SSL_CA: "-----BEGIN CERTIFICATE-----\\nX\\n-----END CERTIFICATE-----" }, "production");
    assert.equal(verified.ssl?.rejectUnauthorized, true);
    assert.equal(String(verified.ssl?.ca).includes("\n"), true);
    assert.equal(verified.connectionString.includes("sslmode"), false, "URL ssl params must not override verification");
    assert.equal(databaseConnectionConfig({ ...env, DATABASE_SSL_USE_SYSTEM_CA: "true" }, "production").ssl?.rejectUnauthorized, true);
  });

  test("site URL: no example.com fallback; production without it fails", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: "" });
    try {
      assert.throws(() => withNodeEnv("production", () => siteUrl()), /NEXT_PUBLIC_SITE_URL/);
      assert.equal(withNodeEnv("development", () => siteUrl()), "http://localhost:3000");
    } finally {
      setEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    }
    setEnv({ NEXT_PUBLIC_SITE_URL: "https://hotel.example/" });
    try {
      assert.equal(siteUrl(), "https://hotel.example");
    } finally {
      setEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    }
  });

  test("production payments stay disabled without the webhook secret", () => {
    setEnv({ BOOKING_PRODUCTION_READY: "true", BOOKING_MODE: "production", DATABASE_URL: "postgres://x", RAZORPAY_KEY_ID: "k", RAZORPAY_KEY_SECRET: "s", RAZORPAY_WEBHOOK_SECRET: "" });
    try {
      assert.equal(withNodeEnv("production", () => paymentMode()), "unavailable");
      setEnv({ RAZORPAY_WEBHOOK_SECRET: "whsec" });
      assert.equal(withNodeEnv("production", () => paymentMode()), "razorpay");
    } finally {
      setEnv({ BOOKING_PRODUCTION_READY: "false", BOOKING_MODE: "development", DATABASE_URL: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", RAZORPAY_WEBHOOK_SECRET: "" });
    }
  });

  test("startup check names missing production settings without values", () => {
    const problems = productionConfigProblems({ BOOKING_PRODUCTION_READY: "true", RAZORPAY_KEY_ID: "k", ADMIN_PASSWORD: "secret-value", DATABASE_SSL: "true" });
    assert.ok(problems.some((problem) => problem.includes("RAZORPAY_WEBHOOK_SECRET")));
    assert.ok(problems.some((problem) => problem.includes("ADMIN_USERS_JSON")));
    assert.equal(problems.join(" ").includes("secret-value"), false);
  });
});

describe("360 viewer keyboard scope", () => {
  test("keys typed in form fields are never treated as viewer controls", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) assert.equal(isEditableTarget({ tagName } as unknown as EventTarget), true);
    assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget), true);
    assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: false } as unknown as EventTarget), false);
  });
});
