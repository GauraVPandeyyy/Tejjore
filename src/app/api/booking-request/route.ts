/**
 * Retired duplicate of POST /api/reservations. The site only uses /api/reservations; this 308 keeps
 * any external client working for one release (it re-sends the same method and body).
 */
export function POST(request: Request) {
  return new Response(null, { status: 308, headers: { Location: new URL("/api/reservations", request.url).toString(), "Cache-Control": "no-store" } });
}
