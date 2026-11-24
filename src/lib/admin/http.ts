import "server-only";
import { AdminInputError } from "@/lib/admin/operations";
import { apiError, internalError } from "@/lib/http/api";

/** Staff-actionable rule violations are shown as-is; anything else is logged and generic. */
export function adminErrorResponse(context: string, error: unknown, fallback: string) {
  if (error instanceof AdminInputError) return apiError("ADMIN_RULE", error.message, 400);
  return internalError(`admin/${context}`, error, fallback);
}

export const unauthorized = () => apiError("UNAUTHORIZED", "Unauthorized.", 401);
