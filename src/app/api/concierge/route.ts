import { NextResponse } from "next/server";
import { getConciergeProvider, type ConciergeMessage } from "@/lib/concierge";

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
    message.content.length <= MAX_MESSAGE_LENGTH
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages =
    body && typeof body === "object" && Array.isArray((body as { messages?: unknown }).messages)
      ? (body as { messages: unknown[] }).messages
      : null;

  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES || !messages.every(isConciergeMessage)) {
    return NextResponse.json({ error: "Invalid concierge message history." }, { status: 400 });
  }

  const typedMessages = messages as ConciergeMessage[];
  if (typedMessages[typedMessages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "The last concierge message must come from the guest." }, { status: 400 });
  }

  const provider = getConciergeProvider();
  try {
    const response = await provider.reply(typedMessages);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Concierge data is temporarily unavailable. Please use the hotel contact options." },
      { status: 503 },
    );
  }
}
