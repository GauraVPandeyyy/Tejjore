/**
 * Map positions. Only coordinates with a named source are published here.
 *
 * - The hotel's own pin is deliberately NOT in code: neither OpenStreetMap nor the Tripadvisor
 *   listing resolves "C-1/242, Vikalp Khand" to a building (OSM has two different "Vikalp Khand"
 *   localities). Once the owner confirms the pin in Google Maps, set NEXT_PUBLIC_HOTEL_LAT and
 *   NEXT_PUBLIC_HOTEL_LNG and the map draws it; until then it shows the area, not a building.
 * - The area centre is the Gomti Nagar neighbourhood point from latlong.net (26.862410, 81.020348).
 * - Landmark positions come from OpenStreetMap (Nominatim, 2026-10-27). Singapore Mall and Indira
 *   Gandhi Pratishthan returned no OSM result, so they have no pin and link out to Google Maps only.
 */
export type LngLat = { lng: number; lat: number };

export const AREA_CENTER: LngLat = { lng: 81.020348, lat: 26.86241 };

/** Keyed by the ids in `nearby.ts`. */
export const LANDMARK_POSITIONS: Record<string, LngLat> = {
  "ambedkar-memorial": { lng: 80.9756647, lat: 26.8471253 },
  airport: { lng: 80.8936031, lat: 26.7608025 },
  // "Lucknow Railway Connectivity" opens Lucknow Junction (Charbagh) in Google Maps.
  railway: { lng: 80.9243609, lat: 26.8311583 },
};

/** The hotel's confirmed pin, from the environment; null (and no pin drawn) when unset or implausible. */
export function hotelPosition(): LngLat | null {
  const rawLat = process.env.NEXT_PUBLIC_HOTEL_LAT?.trim();
  const rawLng = process.env.NEXT_PUBLIC_HOTEL_LNG?.trim();
  if (!rawLat || !rawLng) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  // Must fall inside greater Lucknow, so a typo can never put the pin elsewhere.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 26.6 || lat > 27.1 || lng < 80.7 || lng > 81.2) return null;
  return { lat, lng };
}
