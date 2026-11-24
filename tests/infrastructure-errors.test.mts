import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { classifyInfrastructureError } = await import("../src/lib/http/infrastructure");
const { internalError } = await import("../src/lib/http/api");
const { productionConfigProblems, ADMIN_HASH_SHAPE } = await import("../src/lib/config/productionChecks");

describe("infrastructure failure classification", () => {
  test("names the cause of the database failures behind booking and sign-in 503s", () => {
    assert.equal(classifyInfrastructureError(new Error("(ENOTFOUND) tenant/user postgres.abc not found"))?.kind, "database-auth");
    assert.equal(classifyInfrastructureError(new Error("password authentication failed for user x"))?.kind, "database-auth");
    assert.equal(classifyInfrastructureError(Object.assign(new Error("connect failed"), { code: "ENOTFOUND" }))?.kind, "database-unreachable");
    assert.equal(classifyInfrastructureError(new Error("Connection terminated due to connection timeout"))?.kind, "database-unreachable");
    assert.equal(classifyInfrastructureError(new Error('relation "rate_limits" does not exist'))?.kind, "database-schema");
    assert.equal(classifyInfrastructureError(new Error("Production booking persistence requires DATABASE_URL. JSON storage is development-only."))?.kind, "storage-not-configured");
  });

  test("ordinary bugs are not blamed on infrastructure", () => {
    assert.equal(classifyInfrastructureError(new TypeError("Cannot read properties of undefined")), null);
    assert.equal(classifyInfrastructureError("boom"), null);
  });

  test("hints name variables but never contain connection details", () => {
    const hint = classifyInfrastructureError(new Error("tenant/user postgres.secretref not found at db.internal:5432"))?.hint ?? "";
    assert.match(hint, /DATABASE_URL/);
    assert.equal(/secretref|db\.internal|5432/.test(hint), false);
  });

  test("an infrastructure failure answers 503 SERVICE_UNAVAILABLE without echoing the cause", async () => {
    const response = internalError("test", new Error("(ENOTFOUND) tenant/user postgres.secretref not found"), "Reservation could not be created right now.");
    const text = await response.text();
    assert.equal(response.status, 503);
    assert.equal(text.includes("secretref"), false);
    assert.equal((JSON.parse(text) as { error: { code: string } }).error.code, "SERVICE_UNAVAILABLE");
  });
});

describe("admin password hash shape", () => {
  const good = `scrypt$${"a1".repeat(16)}$${"b2".repeat(64)}`;
  test("a correctly formed hash passes", () => {
    assert.equal(ADMIN_HASH_SHAPE.test(good), true);
    const problems = productionConfigProblems({ ADMIN_USERS_JSON: JSON.stringify([{ id: "o", role: "owner", passwordHash: good }]), DATABASE_URL: "x", ADMIN_SESSION_SECRET: "s".repeat(32) });
    assert.equal(problems.some((problem) => /passwordHash/.test(problem)), false);
  });

  test("a hash mangled by .env $-expansion is reported by variable name, never by value", () => {
    const mangled = "scrypt$ab$cd";
    const problems = productionConfigProblems({ ADMIN_USERS_JSON: JSON.stringify([{ id: "o", role: "owner", passwordHash: mangled }]), DATABASE_URL: "x", ADMIN_SESSION_SECRET: "s".repeat(32) });
    const found = problems.find((problem) => /passwordHash/.test(problem));
    assert.ok(found);
    assert.equal(found.includes("scrypt$ab$cd"), false);
    assert.match(found, /ADMIN_USERS_JSON/);
  });
});
