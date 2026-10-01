import "server-only";
import type { PublicReservationView, ReservationRecord } from "@/types/booking";
import { paymentMode } from "@/lib/payments/razorpay";

export function toPublicReservationView(reservation: ReservationRecord, accessToken: string): PublicReservationView {
  const mode = paymentMode();
  return {
    reference: reservation.reference,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
    expiresAt: reservation.expiresAt,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    stay: reservation.stay,
    roomId: reservation.roomId,
    ratePlanId: reservation.ratePlanId,
    addonIds: reservation.addonIds,
    guest: {
      firstName: reservation.guest.firstName,
      lastName: reservation.guest.lastName,
      email: reservation.guest.email,
      phone: reservation.guest.phone,
      ...(reservation.guest.arrivalNotes ? { arrivalNotes: reservation.guest.arrivalNotes } : {}),
      specialRequests: reservation.guest.specialRequests,
    },
    pricing: reservation.pricing,
    paymentAvailable: mode !== "unavailable",
    paymentMode: mode,
    accessToken,
    confirmationEmailStatus: reservation.confirmationEmailStatus,
    confirmationEmailSentAt: reservation.confirmationEmailSentAt,
  };
}
