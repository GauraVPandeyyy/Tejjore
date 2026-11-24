import "server-only";
import { NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/admin/http";
import { apiError } from "@/lib/http/api";
import { CmsConflict, CmsForbidden, CmsInputError, CmsNotFound, CmsUnavailable } from "./engine";

const noStore = { "Cache-Control": "no-store" };

export const cmsJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/** Typed CMS failures → the `{ error: { code, message } }` contract (plus per-field messages). */
export function cmsErrorResponse(context: string, error: unknown, fallback: string) {
  if (error instanceof CmsInputError) {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: error.message, fields: error.fields } }, { status: 400, headers: noStore });
  }
  if (error instanceof CmsForbidden) return apiError("FORBIDDEN", error.message, 403);
  if (error instanceof CmsNotFound) return apiError("NOT_FOUND", error.message, 404);
  if (error instanceof CmsConflict) return apiError("CONFLICT", error.message, 409);
  if (error instanceof CmsUnavailable) return apiError("CMS_UNAVAILABLE", error.message, 503);
  return adminErrorResponse(`cms/${context}`, error, fallback);
}
