/**
 * Mobile numbers are compared in E.164. Default country is India (+91): spaces and punctuation are
 * stripped, as are a leading 0, 00 and a +91 / 91 prefix on a 10-digit national number.
 * Returns null when the input cannot be a phone number.
 */
export function normalizePhoneE164(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 32) return null;
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return /^[1-9][0-9]{7,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return /^[1-9][0-9]{7,14}$/.test(digits) ? `+${digits}` : null;
}

export const phoneLast4 = (e164: string) => e164.slice(-4);
