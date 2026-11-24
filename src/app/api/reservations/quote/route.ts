import { NextResponse } from "next/server";
import { availableRoomsOnDate } from "@/lib/booking/capacity";
import { roomOccupancy } from "@/lib/booking/occupancy";
import { stayNightlyRates } from "@/lib/booking/operations";
import { calculateBookingPrice } from "@/lib/booking/pricing";
import { readBookingStore } from "@/lib/booking/store";
import { occupancyError, validateBookingPayload } from "@/lib/booking/validation";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

/**
 * Authoritative price preview. It runs the same server calculation as the reservation (live nightly
 * rates, promo rules, taxes) without holding anything, so the summary never shows a number the
 * server would not charge. Guest details are not needed.
 */
export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "reservation-quote", { limit: 40, windowMs: 10 * 60_000 }, "Too many price checks. Please wait briefly and try again.");
  if (limited) return limited;

  const raw = await readJsonBody<Record<string, unknown>>(request);
  const validation = validateBookingPayload(raw && { ...raw, guest: { firstName: "Guest", phone: "0000000000", email: "guest@example.com", preferredContact: "email" } });
  if (!validation.ok) return apiError("INVALID_BOOKING", validation.error, 400);
  const input = validation.payload;
  const occupancy = occupancyError((await roomOccupancy())[input.roomId], input.stay.adults, input.stay.children, input.stay.rooms);
  if (occupancy) return apiError("OCCUPANCY_EXCEEDED", occupancy, 400);

  try {
    const store = await readBookingStore();
    const start = Date.parse(`${input.stay.checkIn}T12:00:00Z`);
    const nights = Math.round((Date.parse(`${input.stay.checkOut}T12:00:00Z`) - start) / 86_400_000);
    for (let index = 0; index < nights; index += 1) {
      const date = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
      if (availableRoomsOnDate(store, input.roomId, date).available < input.stay.rooms) {
        return apiError("BOOKING_UNAVAILABLE", "Selected room category is no longer available for these dates.", 409);
      }
    }
    let pricing;
    try {
      pricing = calculateBookingPrice(input, 0, { nightlyRates: stayNightlyRates(store, input.roomId, input.stay.checkIn, input.stay.checkOut) });
    } catch (error) {
      return apiError("INVALID_PRICING", error instanceof Error ? error.message : "The price could not be calculated.", 400);
    }
    return NextResponse.json({ pricing, promoApplied: Boolean(input.promoCode) && pricing.discount > 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return internalError("reservations/quote", error, "The price could not be checked right now.");
  }
}
