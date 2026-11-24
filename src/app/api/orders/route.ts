import { NextResponse } from "next/server";
import { contentDatabase } from "@/lib/content/db";
import { normalizePhoneE164 } from "@/lib/phone";
import { OrderInputError, placeOrder } from "@/lib/restaurant/orders";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

/**
 * POST /api/orders: places a request-to-order (no online payment). Limited per client and per
 * mobile number; prices, availability and the service charge are decided server-side.
 */
export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "order-create", { limit: 5, windowMs: 15 * 60_000 }, "Too many orders from this connection. Please wait a few minutes or call the hotel.");
  if (limited) return limited;

  const body = await readJsonBody<Record<string, unknown>>(request);
  const phone = normalizePhoneE164(body?.phone);
  if (phone) {
    const phoneLimited = await enforceRateLimit(request, "order-create-phone", { limit: 4, windowMs: 60 * 60_000 }, "Too many orders for this number. Please call the hotel.", phone);
    if (phoneLimited) return phoneLimited;
  }

  const db = contentDatabase();
  if (!db) return apiError("ORDERING_UNAVAILABLE", "Online ordering is not available right now. Please call the hotel to order.", 503);
  try {
    return NextResponse.json(await placeOrder(db, body, { request }), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OrderInputError) return apiError(error.code, error.message, error.status);
    return internalError("orders/create", error, "Your order could not be placed right now. Please try again or call the hotel.");
  }
}
