/**
 * Booking mode. A production deployment (NODE_ENV=production, e.g. Vercel) is live by default, so
 * nothing has to be configured by staff; BOOKING_MODE=development forces test behaviour there, and
 * `next dev` / tests stay in development unless BOOKING_MODE=production is set explicitly.
 */
export function bookingMode(env: Record<string, string | undefined> = process.env): "development" | "production" {
  if (env.BOOKING_MODE === "production") return "production";
  if (env.BOOKING_MODE === "development") return "development";
  return env.NODE_ENV === "production" ? "production" : "development";
}
