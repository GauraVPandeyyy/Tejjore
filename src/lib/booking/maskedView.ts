import "server-only";
import { rooms } from "@/data/rooms";
import { normalizePhoneE164, phoneLast4 } from "@/lib/phone";
import type { MaskedReservationView, ReservationRecord } from "@/types/booking";

/** "Rahul Sharma" → "R. S****"; a single name → "R****". Never the full name. */
export function maskGuestName(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  if (!first) return "Guest";
  return last ? `${first}. ${last}****` : `${first}****`;
}

export function toMaskedReservationView(reservation: ReservationRecord, now = Date.now()): MaskedReservationView {
  const unpaidHold = reservation.status === "initiated" || reservation.status === "payment_pending";
  const holdActive = unpaidHold && (!reservation.expiresAt || Date.parse(reservation.expiresAt) > now);
  const phone = normalizePhoneE164(reservation.guest.phone) ?? reservation.guest.phone.replace(/\D/g, "");
  return {
    reference: reservation.reference,
    status: unpaidHold && !holdActive ? "expired" : reservation.status,
    paymentStatus: reservation.paymentStatus,
    roomName: rooms.find((room) => room.id === reservation.roomId)?.name ?? reservation.roomId,
    checkIn: reservation.stay.checkIn,
    checkOut: reservation.stay.checkOut,
    nights: reservation.pricing.nights,
    guests: { adults: reservation.stay.adults, children: reservation.stay.children, rooms: reservation.stay.rooms },
    amountDue: reservation.pricing.amountDue,
    guestNameMasked: maskGuestName(reservation.guest.firstName, reservation.guest.lastName),
    phoneLast4: phoneLast4(phone),
    holdActive,
  };
}
