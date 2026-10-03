import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "tejjora_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

type AdminIdentity = { id: string; name: string };
type SessionPayload = AdminIdentity & { exp: number };

type ConfiguredAdmin = AdminIdentity & {
  password: string;
};

function configuredAdmin(): ConfiguredAdmin | null {
  const id = process.env.ADMIN_USER_ID?.trim();
  const name = process.env.ADMIN_USER_NAME?.trim() || "Tejjora Admin";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!id || !password) return null;

  return {
    id,
    name,
    password,
  };
}

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
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
  const user = configuredAdmin();

  if (!user) return null;

  const suppliedId = id.trim().toLowerCase();
  const expectedId = user.id.toLowerCase();

  if (!safeEqual(suppliedId, expectedId)) return null;
  if (!safeEqual(password, user.password)) return null;

  return {
    id: user.id,
    name: user.name,
  };
}

export function adminAuthConfigured() {
  return Boolean(configuredAdmin()) && signingSecret().length >= 32;
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

    const configured = configuredAdmin();

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
