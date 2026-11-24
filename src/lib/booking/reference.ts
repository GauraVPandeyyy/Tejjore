import { randomBytes } from "node:crypto";

/**
 * Booking references. New format `TLV-XXXX-XXXX-XX`: 10 Crockford base32 characters (50 bits) from
 * crypto.randomBytes, so a reference cannot be guessed or enumerated. The earlier
 * `TLV-YYMMDD-XXXXXX` format stays valid for bookings that already exist.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const NEW_FORMAT = /^TLV-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/;
const LEGACY_FORMAT = /^TLV-\d{6}-[A-Z0-9]{6}$/;

export function createBookingReference() {
  const bytes = new Uint8Array(randomBytes(10) as unknown as ArrayBuffer);
  let body = "";
  for (let i = 0; i < bytes.length; i += 1) body += ALPHABET[bytes[i] % 32];
  return `TLV-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

export function isBookingReference(value: string) {
  return NEW_FORMAT.test(value) || LEGACY_FORMAT.test(value);
}

/**
 * Forgiving input handling for what a guest types or pastes: case, spaces, missing hyphens and the
 * Crockford look-alikes (O→0, I/L→1). Legacy references are only upper-cased.
 */
export function normalizeBookingReference(input: unknown) {
  if (typeof input !== "string") return "";
  const upper = input.trim().toUpperCase();
  if (LEGACY_FORMAT.test(upper)) return upper;
  const body = upper.replace(/^TLV[-\s]*/, "").replace(/[-\s]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (body.length !== 10) return upper;
  return `TLV-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}
