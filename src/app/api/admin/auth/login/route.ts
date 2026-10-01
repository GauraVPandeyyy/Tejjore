import { NextResponse } from "next/server";
import { adminAuthConfigured, authenticateAdmin, createAdminSession } from "@/lib/admin/auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (!adminAuthConfigured()) return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
  const key = clientKey(request);
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429 });
  }
  const body = await request.json().catch(() => null) as { userId?: string; password?: string } | null;
  if (!body?.userId || !body.password) return NextResponse.json({ error: "User ID and password are required." }, { status: 400 });
  const identity = authenticateAdmin(body.userId, body.password);
  if (!identity) {
    const next = current && current.resetAt > now ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: now + WINDOW_MS };
    attempts.set(key, next);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  attempts.delete(key);
  await createAdminSession(identity);
  return NextResponse.json({ ok: true, user: identity });
}
