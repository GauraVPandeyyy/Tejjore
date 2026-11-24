import type { HotelOperationsConfig } from "@/types/admin";
import type { RoomId } from "@/types/hotel";

/** How far ahead a dated rate counts towards the public "from" price (the booking calendar's reach). */
export const RATE_CARD_HORIZON_DAYS = 365;

/**
 * The public price of a room category, derived from the admin booking configuration — the same
 * data `effectiveRoomRate` / `stayNightlyRates` price every quote and hold with. Every displayed
 * "from" price (rooms, room pages, comparison, booking step, concierge) reads this, never copy.
 */
export type RoomRateCard = {
  roomId: RoomId;
  /** Admin category base rate (Admin → Rooms): what an ordinary night costs. */
  standardRate: number;
  /** Lowest nightly rate on any bookable night from today to the horizon (base rate or a dated rate). */
  fromRate: number;
  /** Tonight's rate (India date), after any dated rate. */
  tonightRate: number;
  /** True when at least one upcoming night is priced differently from the standard rate. */
  datedRates: boolean;
};

export type PublicRoomRates = Partial<Record<RoomId, RoomRateCard>>;

function addDays(date: string, days: number) {
  const cursor = new Date(`${date}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}

/** Pure: identical inputs give identical prices on the server, in tests and in the concierge. */
export function buildRoomRateCard(config: HotelOperationsConfig, roomId: RoomId, today: string): RoomRateCard {
  const standardRate = config.roomSettings[roomId].baseRate;
  const horizon = addDays(today, RATE_CARD_HORIZON_DAYS);
  const upcoming = config.dateOverrides.filter(
    (item) => item.roomId === roomId && item.baseRate != null && item.date >= today && item.date < horizon,
  );
  const dated = upcoming.map((item) => item.baseRate!);
  const tonight = upcoming.find((item) => item.date === today)?.baseRate ?? standardRate;
  return {
    roomId,
    standardRate,
    fromRate: Math.min(standardRate, ...dated),
    tonightRate: tonight,
    datedRates: dated.some((rate) => rate !== standardRate),
  };
}

export function buildPublicRoomRates(config: HotelOperationsConfig, roomIds: readonly RoomId[], today: string): PublicRoomRates {
  return Object.fromEntries(roomIds.map((roomId) => [roomId, buildRoomRateCard(config, roomId, today)]));
}

/** Room subtotal for one room over the stay, from the nightly rates the availability API returns. */
export function stayRoomSubtotal(nightlyRates: ReadonlyArray<{ rate: number }> | undefined) {
  return (nightlyRates ?? []).reduce((sum, night) => sum + night.rate, 0);
}

/**
 * The one-line caveat shown under a "from" price, shared by the site and the concierge so both say
 * the same thing. Null when every upcoming night costs the standard rate.
 */
export function rateCardNote(card: RoomRateCard, money: (value: number) => string): string | null {
  if (card.fromRate < card.standardRate) return `Standard rate ${money(card.standardRate)}; some dates cost less`;
  if (card.datedRates) return "Some dates are priced differently";
  return null;
}

/** Average nightly rate for a stay, rounded to the rupee (display only; totals use exact sums). */
export function averageNightlyRate(nightlyRates: ReadonlyArray<{ rate: number }> | undefined) {
  const nights = nightlyRates?.length ?? 0;
  return nights ? Math.round(stayRoomSubtotal(nightlyRates) / nights) : 0;
}
