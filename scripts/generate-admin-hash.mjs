import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error("Usage: node scripts/generate-admin-hash.mjs '<password-at-least-10-chars>'");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const value = `scrypt$${salt}$${hash}`;
// stdout: the hash exactly as hosting dashboards (Vercel, etc.) take it.
console.log(value);
// stderr: the same value for a .env / .env.local file, where Next.js expands "$name" and would delete
// part of the hash (the account could then never sign in), so every "$" must be written "\$".
console.error('\nFor a .env / .env.local file write every "$" as "\\$":');
console.error(value.replaceAll("$", "\\$"));
