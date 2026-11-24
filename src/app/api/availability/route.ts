import { NextResponse } from "next/server";
import { bookingEnvironmentMode, searchAvailability } from "@/lib/booking/inventory";
import { roomOccupancy } from "@/lib/booking/occupancy";
import { validateStayDates } from "@/lib/booking/validation";
import { enforceRateLimit } from "@/lib/security/rateLimit";
import { apiError, guardJsonMutation, internalError, readJsonBody } from "@/lib/http/api";

export async function POST(request: Request) {
  const guarded = guardJsonMutation(request);
  if (guarded) return guarded;
  const limited = await enforceRateLimit(request, "availability", { limit: 60, windowMs: 10 * 60_000 }, "Too many availability checks. Please wait briefly and try again.");
  if (limited) return limited;

  const body = await readJsonBody<{ checkIn?: string; checkOut?: string }>(request);
  if (!body?.checkIn || !body.checkOut) {
    return apiError("INVALID_DATES", "Choose a valid check-in and check-out date.", 400);
  }
  const validation = validateStayDates(body.checkIn, body.checkOut);
  if (!validation.ok) return apiError("INVALID_DATES", validation.error, 400);

  try {
    const inventory = await searchAvailability(body.checkIn, body.checkOut);
    const limits = await roomOccupancy();
    const rooms = inventory.map(({ roomId, available, baseRate, nightlyRates }) => ({ roomId, available, baseRate, nightlyRates, maxAdults: limits[roomId]?.maxAdults ?? null, maxChildren: limits[roomId]?.maxChildren ?? null }));
    return NextResponse.json(
      { checkIn: body.checkIn, checkOut: body.checkOut, mode: bookingEnvironmentMode(), rooms },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return internalError("availability", error, "Availability could not be checked right now. Please try again.");
  }
}
