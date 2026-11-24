import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security/origin";
import { classifyInfrastructureError } from "@/lib/http/infrastructure";

/** Public error contract for every API route: `{ error: { code, message } }`. */
export type ApiErrorBody = { error: { code: string; message: string } };

const noStore = { "Cache-Control": "no-store" };

export function apiError(code: string, message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message } }, { status, headers: { ...noStore, ...headers } });
}

/**
 * Logs an unexpected failure server-side with a correlation id and returns that id.
 * Callers pass only non-sensitive context (route, reference); never guest PII or secrets.
 */
export function logServerError(context: string, error: unknown, meta: Record<string, string | number | undefined> = {}) {
  const id = randomUUID().slice(0, 8);
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[${context}] ref=${id}`, meta, detail);
  return id;
}

/**
 * 503 for an unexpected failure. When the cause is the backing infrastructure (database unreachable,
 * rejected credentials, missing table, persistence not configured) the public code is
 * SERVICE_UNAVAILABLE and the log names the cause and the variable to check; anything else stays
 * INTERNAL_ERROR. Neither response reveals the underlying message.
 */
export function internalError(context: string, error: unknown, message: string, meta?: Record<string, string | number | undefined>) {
  const infrastructure = classifyInfrastructureError(error);
  const ref = logServerError(context, error, { ...meta, ...(infrastructure ? { cause: infrastructure.kind, hint: infrastructure.hint } : {}) });
  return apiError(infrastructure ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR", `${message} (ref ${ref})`, 503);
}

/** JSON endpoints only accept application/json bodies (blocks cross-site text/plain "simple" requests). */
export function rejectNonJson(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "application/json") return null;
  return apiError("UNSUPPORTED_MEDIA_TYPE", "Requests must be sent as application/json.", 415);
}

/** State-changing first-party routes must come from this site's own pages. */
export function rejectCrossOrigin(request: Request) {
  if (isSameOriginRequest(request)) return null;
  return apiError("CROSS_ORIGIN_FORBIDDEN", "This request is not allowed from another site.", 403);
}

/** Guard for first-party JSON mutation routes: same-origin + JSON content type. */
export function guardJsonMutation(request: Request) {
  return rejectCrossOrigin(request) ?? rejectNonJson(request);
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
