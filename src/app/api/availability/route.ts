import { NextResponse } from "next/server";
import { bookingEnvironmentMode, searchAvailability } from "@/lib/booking/inventory";
import { validateStayDates } from "@/lib/booking/validation";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const limited = rateLimit(request, "availability", { limit: 60, windowMs: 10 * 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many availability checks. Please wait briefly and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null) as { checkIn?: string; checkOut?: string } | null;
  if (!body?.checkIn || !body.checkOut) {
    return NextResponse.json({ error: "Choose a valid check-in and check-out date." }, { status: 400 });
  }
  const validation = validateStayDates(body.checkIn, body.checkOut);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const inventory = await searchAvailability(body.checkIn, body.checkOut);
    const rooms = inventory.map(({ roomId, available, baseRate, nightlyRates }) => ({ roomId, available, baseRate, nightlyRates }));
    return NextResponse.json(
      { checkIn: body.checkIn, checkOut: body.checkOut, mode: bookingEnvironmentMode(), rooms },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Availability could not be checked right now. Please try again." }, { status: 503 });
  }
}
