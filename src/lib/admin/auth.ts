import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import { isAdminRole, type AdminRole } from "@/lib/admin/permissions";

/**
 * Staff identity. Accounts come from ADMIN_USERS_JSON (scrypt hashes from
 * scripts/generate-admin-hash.mjs). Shape:
 *
 *   [{"id":"owner","name":"Hotel Owner","role":"owner","passwordHash":"scrypt$<salt>$<hash>"}, ...]
 *
 * role ∈ owner | manager | front_desk | kitchen. An entry WITHOUT a role (pre-Phase-3A format)
 * becomes "manager": the same operational access it had before, but never staff management.
 * Give the owner account "role":"owner" explicitly. Entries with an unknown role are ignored.
 *
 * The legacy plain-text ADMIN_USER_ID / ADMIN_PASSWORD pair is a development convenience only
 * and is ignored when NODE_ENV=production. Password hashes never leave this module.
 */
export type AdminIdentity = { id: string; name: string; role: AdminRole };

type ConfiguredAdmin = AdminIdentity & (
  | { passwordHash: string; password?: never }
  | { password: string; passwordHash?: never }
);

const DEFAULT_ROLE: AdminRole = "manager";
let lastConfigWarning = 0;

function warnOnce(message: string) {
  if (Date.now() - lastConfigWarning > 60_000) {
    lastConfigWarning = Date.now();
    console.error(`[admin] ${message}`);
  }
}

function adminsFromJson(): ConfiguredAdmin[] {
  const raw = process.env.ADMIN_USERS_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const record = item as { id?: unknown; name?: unknown; role?: unknown; passwordHash?: unknown };
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const passwordHash = typeof record.passwordHash === "string" ? record.passwordHash.trim() : "";
      if (!id || !passwordHash.startsWith("scrypt$")) return [];
      if (record.role !== undefined && !isAdminRole(record.role)) {
        // Name the account id only; never echo the entry (it contains the hash).
        warnOnce(`ADMIN_USERS_JSON entry "${id}" has an unknown role and is ignored. Use owner, manager, front_desk or kitchen.`);
        return [];
      }
      const role = isAdminRole(record.role) ? record.role : DEFAULT_ROLE;
      const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : "Tejjora Admin";
      return [{ id, name, role, passwordHash }];
    });
  } catch {
    warnOnce("ADMIN_USERS_JSON is not valid JSON; no staff accounts are configured.");
    return [];
  }
}

/** Plain-text ADMIN_PASSWORD is a development convenience only; production requires scrypt hashes. */
export function legacyAdminPasswordAllowed(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== "production";
}

function configuredAdmins(): ConfiguredAdmin[] {
  const admins = adminsFromJson();
  const legacyId = process.env.ADMIN_USER_ID?.trim();
  const legacyPassword = process.env.ADMIN_PASSWORD ?? "";
  if (legacyId && legacyPassword && !legacyAdminPasswordAllowed()) {
    warnOnce("ADMIN_USER_ID/ADMIN_PASSWORD (plain text) is ignored in production. Configure ADMIN_USERS_JSON with scrypt hashes from scripts/generate-admin-hash.mjs.");
    return admins;
  }
  if (legacyId && legacyPassword && !admins.some((admin) => admin.id.toLowerCase() === legacyId.toLowerCase())) {
    // Development only: the single local account manages everything.
    admins.push({ id: legacyId, name: process.env.ADMIN_USER_NAME?.trim() || "Tejjora Admin", role: "owner", password: legacyPassword });
  }
  return admins;
}

const publicIdentity = (admin: ConfiguredAdmin): AdminIdentity => ({ id: admin.id, name: admin.name, role: admin.role });

/** Current configured identity for an id (case-insensitive), without any credential. */
export function findAdminUser(id: string): AdminIdentity | null {
  const wanted = id.trim().toLowerCase();
  const admin = configuredAdmins().find((item) => item.id.toLowerCase() === wanted);
  return admin ? publicIdentity(admin) : null;
}

/** Configured staff accounts (id, name, role) for the owner's staff view. */
export function listAdminUsers(): AdminIdentity[] {
  return configuredAdmins().map(publicIdentity);
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function verifyPasswordHash(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  if (!/^[0-9a-f]+$/i.test(hash) || hash.length % 2 !== 0) return false;
  const actual = scryptSync(password, salt, hash.length / 2).toString("hex");
  return safeEqual(actual, hash.toLowerCase());
}

export function authenticateAdmin(id: string, password: string): AdminIdentity | null {
  const wanted = id.trim().toLowerCase();
  const user = configuredAdmins().find((admin) => admin.id.toLowerCase() === wanted);
  if (!user) {
    // Spend comparable time on unknown IDs so response timing does not reveal valid ones.
    scryptSync(password, "tejjora-unknown-admin", 64);
    return null;
  }
  const valid = user.passwordHash
    ? verifyPasswordHash(password, user.passwordHash)
    : user.password !== undefined && safeEqual(password, user.password);
  return valid ? publicIdentity(user) : null;
}

const MIN_SECRET_LENGTH = 32;

/** HMAC key for session cookies and audit IP hashes; empty when not configured. */
export function adminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : "";
}

export function adminAuthConfigured() {
  return configuredAdmins().length > 0 && Boolean(adminSessionSecret());
}
