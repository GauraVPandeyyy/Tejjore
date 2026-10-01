import { hotel } from "./hotel";
import { nearbyPlaces } from "./nearby";
import type { ArrivalStay, ArrivalTabId } from "@/types/arrival";

export const arrivalTabs: Array<{ id: ArrivalTabId; label: string; shortLabel: string }> = [
  { id: "arrival", label: "Arrival", shortLabel: "Arrive" },
  { id: "stay", label: "My Stay", shortLabel: "Stay" },
  { id: "dining", label: "Dining", shortLabel: "Dine" },
  { id: "explore", label: "Explore", shortLabel: "Explore" },
  { id: "help", label: "Help", shortLabel: "Help" },
];

/**
 * Development-only preview data. This is shown only when /arrival?demo=1 is used
 * and is always labelled as sample data in the UI.
 */
export const arrivalDemoStay: ArrivalStay = {
  reference: "DEMO-STAY",
  guestName: "Guest Preview",
  roomId: "premium",
  checkIn: "2026-10-02",
  checkOut: "2026-10-04",
  mode: "demo",
};

export const arrivalNearbyPlaces = nearbyPlaces;

export const hotelAddressText = [
  hotel.address.line1,
  hotel.address.locality,
  hotel.address.city,
  hotel.address.state,
  hotel.address.postalCode,
  hotel.address.country,
].join(", ");

export function hotelDirectionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotelAddressText)}`;
}

export function nearbyDirectionsUrl(mapsQuery: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(hotelAddressText)}&destination=${encodeURIComponent(mapsQuery)}`;
}

export function whatsappUrl(message: string) {
  return `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(message)}`;
}
