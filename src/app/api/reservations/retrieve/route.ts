import { NextResponse } from "next/server";
import { retrieveReservationWithCredentials } from "@/lib/booking/reservations";
import { toPublicReservationView } from "@/lib/booking/public";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "reservation-retrieve", { limit: 8, windowMs: 15 * 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many lookup attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  const body = await request.json().catch(() => null) as { reference?: string; email?: string; phone?: string } | null;
  const reference = body?.reference?.trim().toUpperCase() ?? "";
  const email = body?.email?.trim() ?? "";
  const phone = body?.phone?.trim() ?? "";
  if (!/^TLV-\d{6}-[A-Z0-9]{6}$/.test(reference) || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Enter the booking reference, booking email and phone used for the reservation." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await retrieveReservationWithCredentials(reference, email, phone);
    if (!result) {
      return NextResponse.json(
        { error: "We could not verify a reservation with those details." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(toPublicReservationView(result.reservation, result.accessToken), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The reservation could not be retrieved right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
