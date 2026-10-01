import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { ReservationRecord } from "@/types/booking";

export function createReservationAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashReservationAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function reservationAccessMatches(reservation: ReservationRecord, token: string | null | undefined) {
  if (!reservation.accessTokenHash || !token) return false;
  return safeEqual(reservation.accessTokenHash, hashReservationAccessToken(token));
}

export function normalizeGuestEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeGuestPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function guestCredentialsMatch(
  reservation: ReservationRecord,
  email: string,
  phone: string,
) {
  return normalizeGuestEmail(reservation.guest.email) === normalizeGuestEmail(email)
    && normalizeGuestPhone(reservation.guest.phone) === normalizeGuestPhone(phone);
}
