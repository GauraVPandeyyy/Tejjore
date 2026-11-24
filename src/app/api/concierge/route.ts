import { NextResponse } from "next/server";
import { getConciergeProvider, type ConciergeMessage } from "@/lib/concierge";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, logServerError, readJsonBody } from "@/lib/http/api";

export const runtime = "nodejs";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 800;

function isConciergeMessage(value: unknown): value is ConciergeMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ConciergeMessage>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_MESSAGE_LENGTH &&
    (message.intent === undefined || (typeof message.intent === "string" && /^[a-z0-9-]{1,40}$/.test(message.intent)))
  );
}

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  // Protects the optional Gemini quota and the booking store from automated abuse.
  const limited = await enforceRateLimit(request, "concierge", { limit: 20, windowMs: 10 * 60_000 }, "The concierge is receiving a lot of messages from you. Please wait a few minutes, or contact the hotel directly.");
  if (limited) return limited;

  const body = await readJsonBody<{ messages?: unknown }>(request);
  if (!body) return apiError("INVALID_REQUEST", "Invalid request body.", 400);

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES || !messages.every(isConciergeMessage)) {
    return apiError("INVALID_HISTORY", "Invalid concierge message history.", 400);
  }

  // Only the known fields travel on: role, content and the slug of an earlier answer.
  const typedMessages = (messages as ConciergeMessage[]).map(({ role, content, intent }) => ({ role, content, ...(intent ? { intent } : {}) }));
  if (typedMessages[typedMessages.length - 1]?.role !== "user") {
    return apiError("INVALID_HISTORY", "The last concierge message must come from the guest.", 400);
  }

  const provider = getConciergeProvider();
  try {
    const response = await provider.reply(typedMessages);
    return NextResponse.json(response);
  } catch (error) {
    logServerError("concierge", error);
    return apiError("CONCIERGE_UNAVAILABLE", "Concierge data is temporarily unavailable. Please use the hotel contact options.", 503);
  }
}
