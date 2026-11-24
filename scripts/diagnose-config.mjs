#!/usr/bin/env node
// Read-only configuration diagnostic: tells configuration faults apart from code defects when
// reservations, availability or staff sign-in answer 503.
//
//   npm run diagnose:config
//
// It loads .env / .env.local exactly as Next.js does (so it sees the value the server sees, including
// the effect of "$" expansion), and reports variable NAMES and shapes only - never a value. The only
// network activity is a DNS lookup and a bare TCP handshake to the database host: no credentials are
// sent and no query is run, so it is safe to point at production. Whether the database ACCEPTS the
// credentials is not tested here; `npm run db:migrate -- --status` does that (and changes nothing).
import dns from "node:dns/promises";
import net from "node:net";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadProjectEnv, projectRoot } from "./lib/load-env.mjs";

loadProjectEnv();
const env = process.env;
const lines = [];
const add = (level, area, message) => lines.push({ level, area, message });
const set = (name) => Boolean(env[name]?.trim());
const HASH = /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/i;

// ---- database
if (!set("DATABASE_URL")) {
  const production = env.BOOKING_MODE === "production";
  add(production ? "FAIL" : "INFO", "database", production ? "BOOKING_MODE=production but DATABASE_URL is not set: reservations and availability answer 503 (JSON storage is development-only)." : "DATABASE_URL is not set: development JSON storage and in-memory staff sessions are used (never in production).");
} else {
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    add("FAIL", "database", "DATABASE_URL is not a valid URL.");
  }
  if (url) {
    const port = Number(url.port || 5432);
    add("INFO", "database", `DATABASE_URL points at host ${url.hostname}, port ${port} (user and password not shown).`);
    try {
      await dns.lookup(url.hostname);
      add("PASS", "network", "The database host name resolves.");
      const reachable = await new Promise((resolve) => {
        const socket = net.connect({ host: url.hostname, port, family: 4, timeout: 4000 });
        socket.on("connect", () => (socket.destroy(), resolve(true)));
        socket.on("error", () => resolve(false));
        socket.on("timeout", () => (socket.destroy(), resolve(false)));
      });
      add(reachable ? "PASS" : "FAIL", "network", reachable ? "A TCP connection to the database host succeeds (IPv4)." : "The database host does not accept a TCP connection on this port (firewall / IP allow-list / instance down).");
    } catch {
      add("FAIL", "network", "The database host name does not resolve (check the host in DATABASE_URL).");
    }
    if (/pooler\.supabase\.com$/.test(url.hostname) && !/^postgres\.[a-z0-9]{10,}$/.test(decodeURIComponent(url.username))) {
      add("WARN", "database", 'A Supabase pooler URL needs the user in the form "postgres.<project-ref>"; this user does not look like that, which the pooler answers with "tenant/user not found".');
    }
    if (env.DATABASE_SSL === "true" && !set("DATABASE_SSL_CA") && !set("DATABASE_SSL_CA_BASE64") && env.DATABASE_SSL_USE_SYSTEM_CA !== "true") {
      add("WARN", "database", "DATABASE_SSL=true without DATABASE_SSL_CA / _BASE64 / USE_SYSTEM_CA: works in development (unverified TLS) but is refused in production.");
    }
    add("INFO", "database", "Credentials are not tested here. Run `npm run db:migrate -- --status` against the intended database; \"tenant/user not found\" means the project ref, region host or password in DATABASE_URL is wrong or the project is paused.");
  }
}

// ---- staff sign-in
const secretOk = (env.ADMIN_SESSION_SECRET ?? "").length >= 32;
add(secretOk ? "PASS" : "FAIL", "admin", secretOk ? "ADMIN_SESSION_SECRET is set (32+ characters)." : "ADMIN_SESSION_SECRET is missing or shorter than 32 characters: staff sign-in answers 503 ADMIN_NOT_CONFIGURED.");
let accounts = [];
try {
  const parsed = JSON.parse(env.ADMIN_USERS_JSON || "[]");
  accounts = Array.isArray(parsed) ? parsed : [];
} catch {
  add("FAIL", "admin", "ADMIN_USERS_JSON is not valid JSON.");
}
if (!set("ADMIN_USERS_JSON")) {
  add(set("ADMIN_PASSWORD") ? "WARN" : "FAIL", "admin", set("ADMIN_PASSWORD") ? "Only the plain-text ADMIN_PASSWORD is set: development only, ignored in production." : "No staff account is configured (ADMIN_USERS_JSON).");
} else {
  const bad = accounts.filter((account) => typeof account?.passwordHash !== "string" || !HASH.test(account.passwordHash)).length;
  add(bad ? "FAIL" : "PASS", "admin", bad ? `${bad} of ${accounts.length} ADMIN_USERS_JSON account(s) have a passwordHash that is not scrypt$<32 hex>$<128 hex> as the server sees it: those accounts can never sign in.` : `${accounts.length} staff account(s) with well-formed password hashes.`);
  if (bad) {
    const file = path.join(projectRoot, ".env.local");
    const raw = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/).find((line) => line.startsWith("ADMIN_USERS_JSON=")) : "";
    const unescaped = ((raw ?? "").match(/(?<!\\)\$/g) ?? []).length;
    if (unescaped) add("WARN", "admin", `.env.local has ${unescaped} unescaped "$" in ADMIN_USERS_JSON. Next.js expands "$name" in .env files and deletes it, so every "$" must be written "\\$". Regenerate with \`node scripts/generate-admin-hash.mjs "<password>"\` (it prints the .env-safe form).`);
  }
  if (accounts.length && !accounts.some((account) => account?.role === "owner")) add("WARN", "admin", 'No account has "role":"owner": staff and session management is unavailable.');
}
add(set("DATABASE_URL") ? "INFO" : "WARN", "admin", set("DATABASE_URL") ? "Staff sessions and the audit log are stored in PostgreSQL, so sign-in also depends on the database being reachable and migrated (migration 005)." : "Without DATABASE_URL staff sessions live in memory (development only); production sign-in fails closed.");

// ---- payments, email, AI
add("INFO", "payments", set("RAZORPAY_KEY_ID") && set("RAZORPAY_KEY_SECRET") ? (set("RAZORPAY_WEBHOOK_SECRET") ? "Razorpay keys and webhook secret are set." : "Razorpay keys are set but RAZORPAY_WEBHOOK_SECRET is not: online payment stays disabled in production.") : "Razorpay keys are not set: guests are told online payment is unavailable.");
if (env.PAYMENT_TEST_MODE === "true") add("WARN", "payments", "PAYMENT_TEST_MODE=true: development only, ignored in production.");
add("INFO", "email/ai", `Brevo email ${set("BREVO_API_KEY") ? "configured" : "not configured"}; Gemini ${set("GEMINI_API_KEY") ? "configured" : "not configured (Mezbaan answers from hotel data only)"}.`);

const order = { FAIL: 0, WARN: 1, PASS: 2, INFO: 3 };
for (const line of lines.sort((a, b) => order[a.level] - order[b.level])) console.log(`${line.level.padEnd(4)} [${line.area}] ${line.message}`);
const failures = lines.filter((line) => line.level === "FAIL").length;
console.log(`\n${failures ? `${failures} configuration/network problem(s) above explain 503s without any code defect.` : "No configuration or network failure found by this check."}`);
process.exitCode = failures ? 1 : 0;
