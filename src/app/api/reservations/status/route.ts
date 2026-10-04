import { NextResponse } from "next/server";
import { reservationAccessMatches } from "@/lib/booking/access";
import { toPublicReservationView } from "@/lib/booking/public";
import { getReservation } from "@/lib/booking/reservations";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * Current state of a reservation for the browser that created or retrieved it. Used to
 * restore the booking flow after a refresh from the server's record, never from stale
 * client state. Requires the reservation's access token, like the payment endpoints.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "reservation-status", { limit: 60, windowMs: 15 * 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many status checks. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  const body = await request.json().catch(() => null) as { reference?: string; accessToken?: string } | null;
  const reference = body?.reference?.trim().toUpperCase() ?? "";
  if (!/^TLV-\d{6}-[A-Z0-9]{6}$/.test(reference) || !body?.accessToken) {
    return NextResponse.json({ error: "Verified booking access is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const reservation = await getReservation(reference);
    if (!reservation || !reservationAccessMatches(reservation, body.accessToken)) {
      return NextResponse.json({ error: "Reservation access could not be verified." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(toPublicReservationView(reservation, body.accessToken), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Reservation status could not be read", error);
    return NextResponse.json({ error: "The reservation could not be loaded right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
