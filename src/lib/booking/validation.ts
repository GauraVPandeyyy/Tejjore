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

/** Guest-count limits shared by the booking UI, the /book URL parser and the server validator. */
export const guestLimits = {
  adults: { min: 1, max: 12 },
  children: { min: 0, max: 8 },
  rooms: { min: 1, max: 6 },
} as const;

/** Every booked room needs at least one adult; returns an error message or null. */
export function guestCountError(adults: number, children: number, roomCount: number) {
  if (!Number.isInteger(adults) || adults < guestLimits.adults.min || adults > guestLimits.adults.max) return `Choose between ${guestLimits.adults.min} and ${guestLimits.adults.max} adults.`;
  if (!Number.isInteger(children) || children < guestLimits.children.min || children > guestLimits.children.max) return `Choose up to ${guestLimits.children.max} children.`;
  if (!Number.isInteger(roomCount) || roomCount < guestLimits.rooms.min || roomCount > guestLimits.rooms.max) return `Choose between ${guestLimits.rooms.min} and ${guestLimits.rooms.max} rooms.`;
  if (roomCount > adults) return "Each room needs at least one adult. Reduce the number of rooms or add adults.";
  return null;
}

export function guestPhoneValid(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function guestEmailValid(email: string) {
  return /^\S+@\S+\.\S+$/.test(email.trim());
}

export type BookingPayloadValidation =
  | { ok: true; payload: BookingRequestPayload }
  | { ok: false; error: string };

/** Validates a booking request and, when invalid, says exactly which detail needs fixing. */
export function validateBookingPayload(value: unknown): BookingPayloadValidation {
  const fail = (error: string) => ({ ok: false as const, error });
  if (!value || typeof value !== "object") return fail("The booking details could not be read. Please refresh and try again.");
  const raw = value as Record<string, unknown>;
  const stayRaw = raw.stay;
  const guestRaw = raw.guest;
  if (!stayRaw || typeof stayRaw !== "object" || !guestRaw || typeof guestRaw !== "object") return fail("The booking details are incomplete. Please refresh and try again.");

  const stayValue = stayRaw as Record<string, unknown>;
  const guestValue = guestRaw as Record<string, unknown>;
  const checkIn = cleanString(stayValue.checkIn, 10);
  const checkOut = cleanString(stayValue.checkOut, 10);
  const dates = validateStayDates(checkIn, checkOut);
  if (!dates.ok) return fail(dates.error);

  const adults = Number(stayValue.adults);
  const children = Number(stayValue.children);
  const roomCount = Number(stayValue.rooms);
  const guestError = guestCountError(adults, children, roomCount);
  if (guestError) return fail(guestError);

  const roomId = cleanString(raw.roomId, 40) as BookingRequestPayload["roomId"];
  if (!rooms.some((room) => room.id === roomId)) return fail("Choose a room category to continue.");

  const ratePlanId = cleanString(raw.ratePlanId, 60);
  const plan = bookingConfig.ratePlans.find((item) => item.id === ratePlanId);
  if (!plan?.onlineBookable) return fail("The selected rate plan is not available for online booking.");

  if (!Array.isArray(raw.addonIds)) return fail("The selected extras could not be read. Please refresh and try again.");
  const allowedAddons = new Set<string>(bookingConfig.addons.map((addon) => addon.id));
  const addonIds = [...new Set(raw.addonIds.map((id) => cleanString(id, 60)))];
  if (addonIds.some((id) => !allowedAddons.has(id))) return fail("One of the selected extras is not available.");

  const firstName = cleanString(guestValue.firstName, 80);
  const lastName = cleanString(guestValue.lastName, 80);
  const phone = cleanString(guestValue.phone, 32);
  const email = cleanString(guestValue.email, 254).toLowerCase();
  const preferredContact = cleanString(guestValue.preferredContact, 20) as BookingRequestPayload["guest"]["preferredContact"];
  if (!firstName) return fail("Enter the guest's first name.");
  if (!guestPhoneValid(phone)) return fail("Enter a valid phone number (7–15 digits).");
  if (!guestEmailValid(email)) return fail("Enter a valid email address.");
  if (!preferredContacts.has(preferredContact)) return fail("Choose a preferred contact method.");

  const arrivalNotes = cleanString(guestValue.arrivalNotes, 1000);
  const specialRequests = cleanString(guestValue.specialRequests, 2000);
  const promoCode = cleanString(raw.promoCode, 64).toUpperCase();

  return { ok: true, payload: {
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
  } };
}

export function parseBookingPayload(value: unknown): BookingRequestPayload | null {
  const result = validateBookingPayload(value);
  return result.ok ? result.payload : null;
}

export function validBookingPayload(value: unknown): value is BookingRequestPayload {
  return parseBookingPayload(value) !== null;
}
