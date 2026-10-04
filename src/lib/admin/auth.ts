import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "tejjora_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

type AdminIdentity = { id: string; name: string };
type SessionPayload = AdminIdentity & { exp: number };

// Either a scrypt hash from scripts/generate-admin-hash.mjs (ADMIN_USERS_JSON)
// or a plain password from the legacy ADMIN_USER_ID / ADMIN_PASSWORD pair.
type ConfiguredAdmin = AdminIdentity & (
  | { passwordHash: string; password?: never }
  | { password: string; passwordHash?: never }
);

function adminsFromJson(): ConfiguredAdmin[] {
  const raw = process.env.ADMIN_USERS_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const record = item as { id?: unknown; name?: unknown; passwordHash?: unknown };
      const id = typeof record.id === "string" ? record.id.trim() : "";
      const passwordHash = typeof record.passwordHash === "string" ? record.passwordHash.trim() : "";
      if (!id || !passwordHash.startsWith("scrypt$")) return [];
      const name = typeof record.name === "string" && record.name.trim() ? record.name.trim() : "Tejjora Admin";
      return [{ id, name, passwordHash }];
    });
  } catch {
    return [];
  }
}

function configuredAdmins(): ConfiguredAdmin[] {
  const admins = adminsFromJson();
  const legacyId = process.env.ADMIN_USER_ID?.trim();
  const legacyPassword = process.env.ADMIN_PASSWORD ?? "";
  if (legacyId && legacyPassword && !admins.some((admin) => admin.id.toLowerCase() === legacyId.toLowerCase())) {
    admins.push({ id: legacyId, name: process.env.ADMIN_USER_NAME?.trim() || "Tejjora Admin", password: legacyPassword });
  }
  return admins;
}

function findAdmin(id: string) {
  const wanted = id.trim().toLowerCase();
  return configuredAdmins().find((admin) => admin.id.toLowerCase() === wanted) ?? null;
}

function verifyPasswordHash(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  if (!/^[0-9a-f]+$/i.test(hash) || hash.length % 2 !== 0) return false;
  const actual = scryptSync(password, salt, hash.length / 2).toString("hex");
  return safeEqual(actual, hash.toLowerCase());
}

function signingSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : "";
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", signingSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");

  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function authenticateAdmin(
  id: string,
  password: string,
): AdminIdentity | null {
  const user = findAdmin(id);

  if (!user) {
    // Spend comparable time on unknown IDs so response timing does not reveal valid ones.
    scryptSync(password, "tejjora-unknown-admin", 64);
    return null;
  }

  const valid = user.passwordHash
    ? verifyPasswordHash(password, user.passwordHash)
    : user.password !== undefined && safeEqual(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    name: user.name,
  };
}

export function adminAuthConfigured() {
  return configuredAdmins().length > 0 && Boolean(signingSecret());
}

export async function createAdminSession(identity: AdminIdentity) {
  if (!signingSecret()) {
    throw new Error("Admin session secret is not configured.");
  }

  const payload: SessionPayload = {
    ...identity,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };

  const encoded = base64url(JSON.stringify(payload));
  const token = `${encoded}.${sign(encoded)}`;

  const jar = await cookies();

  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();

  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<AdminIdentity | null> {
  if (!signingSecret()) return null;

  const token = (await cookies()).get(COOKIE_NAME)?.value;

  if (!token) return null;

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (
      !payload.id ||
      !payload.name ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    const configured = findAdmin(payload.id);

    if (!configured || configured.id !== payload.id) {
      return null;
    }

    return {
      id: configured.id,
      name: configured.name,
    };
  } catch {
    return null;
  }
}

export async function requireAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireAdminApi(request?: Request) {
  const session = await getAdminSession();

  if (!session) return null;

  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      const expectedHttp = `http://${host}`;
      const expectedHttps = `https://${host}`;

      if (origin !== expectedHttp && origin !== expectedHttps) {
        return null;
      }
    }
  }

  return session;
}
