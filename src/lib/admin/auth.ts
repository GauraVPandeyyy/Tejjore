import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "tejjora_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

type AdminIdentity = { id: string; name: string };
type SessionPayload = AdminIdentity & { exp: number };
type ConfiguredAdmin = AdminIdentity & { passwordHash: string };

function configuredAdmins(): ConfiguredAdmin[] {
  const raw = process.env.ADMIN_USERS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ConfiguredAdmin => Boolean(
      item && typeof item === "object" && typeof (item as ConfiguredAdmin).id === "string" &&
      typeof (item as ConfiguredAdmin).name === "string" && typeof (item as ConfiguredAdmin).passwordHash === "string"
    ));
  } catch { return []; }
}

function signingSecret() { return process.env.ADMIN_SESSION_SECRET ?? ""; }
function base64url(value: string) { return Buffer.from(value).toString("base64url"); }
function sign(value: string) { return createHmac("sha256", signingSecret()).update(value).digest("base64url"); }

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, expected] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(derived, expected);
}

export function authenticateAdmin(id: string, password: string): AdminIdentity | null {
  const user = configuredAdmins().find((item) => item.id.toLowerCase() === id.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, name: user.name };
}

export function adminAuthConfigured() {
  return configuredAdmins().length > 0 && signingSecret().length >= 32;
}

export async function createAdminSession(identity: AdminIdentity) {
  if (!signingSecret()) throw new Error("Admin session secret is not configured.");
  const payload: SessionPayload = { ...identity, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
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
  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.id || !payload.name || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!configuredAdmins().some((item) => item.id === payload.id)) return null;
    return { id: payload.id, name: payload.name };
  } catch { return null; }
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
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
      if (origin !== expectedHttp && origin !== expectedHttps) return null;
    }
  }
  return session;
}
