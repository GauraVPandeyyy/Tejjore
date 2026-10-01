import type { BookingRequestPayload } from "@/types/booking";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import { bookingConfig } from "@/data/booking";

export function formatStayDates(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return "Dates not selected";
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const formatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} — ${formatter.format(end)}`;
}

export function calculateNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T12:00:00`).getTime();
  const end = new Date(`${checkOut}T12:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function buildWhatsAppBookingMessage(reference: string, payload: BookingRequestPayload) {
  const room = rooms.find((item) => item.id === payload.roomId);
  const rate = bookingConfig.ratePlans.find((item) => item.id === payload.ratePlanId);
  const addons = bookingConfig.addons
    .filter((item) => payload.addonIds.includes(item.id))
    .map((item) => item.label);

  const lines = [
    `Hello ${hotel.shortName}, I would like to request a stay.`,
    "",
    `Request reference: ${reference}`,
    `Guest: ${payload.guest.firstName} ${payload.guest.lastName}`,
    `Dates: ${formatStayDates(payload.stay.checkIn, payload.stay.checkOut)}`,
    `Guests: ${payload.stay.adults} adult${payload.stay.adults === 1 ? "" : "s"}${payload.stay.children ? `, ${payload.stay.children} child${payload.stay.children === 1 ? "" : "ren"}` : ""}`,
    `Rooms requested: ${payload.stay.rooms}`,
    `Room preference: ${room?.name ?? payload.roomId}`,
    `Rate plan preference: ${rate?.label ?? payload.ratePlanId}`,
    `Add-ons: ${addons.length ? addons.join(", ") : "None"}`,
    `Phone: ${payload.guest.phone}`,
    `Email: ${payload.guest.email}`,
    payload.guest.specialRequests ? `Special request: ${payload.guest.specialRequests}` : null,
    "",
    "Please confirm availability, final rate, inclusions and applicable policies.",
  ].filter(Boolean);

  return lines.join("\n");
}

export function getWhatsAppBookingUrl(reference: string, payload: BookingRequestPayload) {
  return `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(buildWhatsAppBookingMessage(reference, payload))}`;
}
