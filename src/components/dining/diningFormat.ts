import type { RestaurantSettings } from "@/lib/content/types";

/** "22:30" → "10:30 PM" (hotel times are local India times; no time-zone conversion). */
export function formatClock(value: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * Operating notes exactly as stored (printed menu wording). Opening time and room delivery appear
 * only once the hotel has confirmed them; nothing here is inferred.
 */
export function operatingNotes(settings: RestaurantSettings) {
  const notes: Array<{ label: string; value: string }> = [];
  const opening = formatClock(settings.openingTime);
  if (opening) notes.push({ label: "Opens", value: opening });
  if (settings.prepMinutesMin !== null && settings.prepMinutesMax !== null) notes.push({ label: "Preparation", value: `${settings.prepMinutesMin}–${settings.prepMinutesMax} minutes` });
  if (settings.serviceChargePct !== null) notes.push({ label: "Service charge", value: `${settings.serviceChargePct}%` });
  if (settings.taxesNote) notes.push({ label: "Taxes", value: settings.taxesNote });
  return notes;
}

export function policyNotes(settings: RestaurantSettings) {
  return [settings.noCancelNote, settings.allergyNote, settings.priceChangeNote, settings.serviceChargeNote].filter((note): note is string => Boolean(note));
}
