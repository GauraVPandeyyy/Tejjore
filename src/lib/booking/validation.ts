import { bookingConfig } from "@/data/booking";
import { rooms } from "@/data/rooms";
import type { BookingRequestPayload } from "@/types/booking";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const preferredContacts = new Set(["whatsapp", "phone", "email"]);

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function validIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const parsed = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

export function validateStayDates(checkIn: string, checkOut: string) {
  if (!validIsoDate(checkIn) || !validIsoDate(checkOut)) return { ok: false as const, error: "Choose valid stay dates." };
  if (checkIn < todayInIndia()) return { ok: false as const, error: "Check-in cannot be in the past." };
  if (checkOut <= checkIn) return { ok: false as const, error: "Check-out must be after check-in." };

  const start = Date.parse(`${checkIn}T12:00:00Z`);
  const end = Date.parse(`${checkOut}T12:00:00Z`);
  const nights = Math.round((end - start) / 86_400_000);
  const advanceDays = Math.round((start - Date.parse(`${todayInIndia()}T12:00:00Z`)) / 86_400_000);
  if (nights > 30) return { ok: false as const, error: "Online stays are limited to 30 nights per reservation. Contact the hotel for a longer stay." };
  if (advanceDays > 365) return { ok: false as const, error: "Online booking is currently limited to dates within the next 12 months." };
  return { ok: true as const, nights };
}

export function parseBookingPayload(value: unknown): BookingRequestPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const stayRaw = raw.stay;
  const guestRaw = raw.guest;
  if (!stayRaw || typeof stayRaw !== "object" || !guestRaw || typeof guestRaw !== "object") return null;

  const stayValue = stayRaw as Record<string, unknown>;
  const guestValue = guestRaw as Record<string, unknown>;
  const checkIn = cleanString(stayValue.checkIn, 10);
  const checkOut = cleanString(stayValue.checkOut, 10);
  if (!validateStayDates(checkIn, checkOut).ok) return null;

  const adults = Number(stayValue.adults);
  const children = Number(stayValue.children);
  const roomCount = Number(stayValue.rooms);
  if (!Number.isInteger(adults) || adults < 1 || adults > 12) return null;
  if (!Number.isInteger(children) || children < 0 || children > 8) return null;
  if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > 6) return null;

  const roomId = cleanString(raw.roomId, 40) as BookingRequestPayload["roomId"];
  if (!rooms.some((room) => room.id === roomId)) return null;

  const ratePlanId = cleanString(raw.ratePlanId, 60);
  const plan = bookingConfig.ratePlans.find((item) => item.id === ratePlanId);
  if (!plan?.onlineBookable) return null;

  if (!Array.isArray(raw.addonIds)) return null;
  const allowedAddons = new Set<string>(bookingConfig.addons.map((addon) => addon.id));
  const addonIds = [...new Set(raw.addonIds.map((id) => cleanString(id, 60)))];
  if (addonIds.some((id) => !allowedAddons.has(id))) return null;

  const firstName = cleanString(guestValue.firstName, 80);
  const lastName = cleanString(guestValue.lastName, 80);
  const phone = cleanString(guestValue.phone, 32);
  const email = cleanString(guestValue.email, 254).toLowerCase();
  const preferredContact = cleanString(guestValue.preferredContact, 20) as BookingRequestPayload["guest"]["preferredContact"];
  const phoneDigits = phone.replace(/\D/g, "");
  if (!firstName || phoneDigits.length < 7 || phoneDigits.length > 15 || !/^\S+@\S+\.\S+$/.test(email)) return null;
  if (!preferredContacts.has(preferredContact)) return null;

  const arrivalNotes = cleanString(guestValue.arrivalNotes, 1000);
  const specialRequests = cleanString(guestValue.specialRequests, 2000);
  const promoCode = cleanString(raw.promoCode, 64).toUpperCase();

  return {
    stay: { checkIn, checkOut, adults, children, rooms: roomCount },
    roomId,
    ratePlanId,
    addonIds,
    ...(promoCode ? { promoCode } : {}),
    guest: {
      firstName,
      lastName,
      phone,
      email,
      preferredContact,
      ...(arrivalNotes ? { arrivalNotes } : {}),
      specialRequests,
    },
    source: "website",
  };
}

export function validBookingPayload(value: unknown): value is BookingRequestPayload {
  return parseBookingPayload(value) !== null;
}
