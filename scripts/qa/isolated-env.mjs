#!/usr/bin/env node
// Runs a command with every key from .env.local blanked and safe local-only values applied,
// so builds, dev servers and tests never reach the live database, Brevo, Razorpay, Gemini or GA.
// Next.js treats variables already present in process.env (even empty strings) as authoritative
// over .env.local (see @next/env processEnv), which is what makes this isolation work.
//
// Usage: node scripts/qa/isolated-env.mjs <command> [...args]
//   e.g. node scripts/qa/isolated-env.mjs npm run build
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const blanked = new Set();
for (const file of [".env.local", ".env", ".env.production", ".env.development", ".env.production.local", ".env.development.local"]) {
  const full = path.join(root, file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) blanked.add(match[1]);
  }
}

const storeDir = path.join(root, ".data", "qa-isolated");
mkdirSync(storeDir, { recursive: true });

const safe = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  BOOKING_MODE: "development",
  BOOKING_PRODUCTION_READY: "false",
  BOOKING_STORE_PATH: process.env.QA_BOOKING_STORE_PATH || path.join(storeDir, "booking-store.json"),
  PAYMENT_TEST_MODE: "false",
  CONCIERGE_PROVIDER: "hybrid",
  CONCIERGE_LANGUAGE_PROVIDER: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

const env = { ...process.env };
for (const key of blanked) env[key] = "";
for (const [key, value] of Object.entries(safe)) env[key] = value;
// Allow explicit per-run overrides, e.g. QA_ENV_ADMIN_USERS_JSON=... -> ADMIN_USERS_JSON
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("QA_ENV_")) env[key.slice("QA_ENV_".length)] = value;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/qa/isolated-env.mjs <command> [...args]");
  process.exit(2);
}
console.error(`[isolated-env] blanked ${blanked.size} keys from env files; DATABASE_URL, BREVO, RAZORPAY, GEMINI and GA are empty; store=${path.relative(root, env.BOOKING_STORE_PATH)}`);
const quote = (value) => (/[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);
const child = process.platform === "win32"
  ? spawn([command, ...args].map(quote).join(" "), { stdio: "inherit", env, shell: true })
  : spawn(command, args, { stdio: "inherit", env });
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
