import { NextResponse } from "next/server";
import { contentDatabase } from "@/lib/content/db";
import { lookupOrder } from "@/lib/restaurant/orders";
import { ORDER_REFERENCE, normalizeOrderReference } from "@/lib/restaurant/rules";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

const NOT_FOUND = "We couldn't find an order with those details.";

/**
 * Guest order status: order reference + the mobile used when ordering. The status page polls this
 * every 20 s, so the limits are sized for that (per client and per order). Guessing needs the
 * 50-bit reference first; every failure is the same generic 404.
 */
export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "order-lookup", { limit: 120, windowMs: 15 * 60_000 }, "Too many status checks. Please wait a few minutes and try again.");
  if (limited) return limited;

  const body = await readJsonBody<{ reference?: unknown; phone?: unknown }>(request);
  const reference = normalizeOrderReference(body?.reference);
  if (ORDER_REFERENCE.test(reference)) {
    const referenceLimited = await enforceRateLimit(request, "order-lookup-ref", { limit: 1000, windowMs: 24 * 60 * 60_000 }, "Too many status checks for this order. Please call the hotel.", reference);
    if (referenceLimited) return referenceLimited;
  }

  const db = contentDatabase();
  if (!db) return apiError("NOT_FOUND", NOT_FOUND, 404);
  try {
    const order = await lookupOrder(db, reference, body?.phone);
    if (!order) return apiError("NOT_FOUND", NOT_FOUND, 404);
    return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("orders/lookup", error, "The order could not be looked up right now.");
  }
}
