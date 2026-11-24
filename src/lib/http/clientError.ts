/**
 * Reads the user-facing message from an API error body. Supports the current contract
 * `{ error: { code, message } }` and the legacy `{ error: "message" }` shape.
 */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;
  const error = (payload as { error: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

/** An API failure with its stable code and HTTP status, so screens can tell "try again" from "contact the hotel". */
export class ApiError extends Error {
  readonly code: string | undefined;
  readonly status: number | undefined;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function apiErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return undefined;
  const error = (payload as { error: unknown }).error;
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/**
 * True when retrying is unlikely to help the guest: the booking service itself is down or
 * unreachable (infrastructure 503s, any 5xx, or no network). The screen then offers the hotel's
 * phone and WhatsApp instead of only a "try again".
 */
export function isServiceProblem(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === "SERVICE_UNAVAILABLE" || error.code === "INTERNAL_ERROR" || (error.status ?? 0) >= 500;
  return error instanceof TypeError; // fetch() rejects with a TypeError when the network is down
}
