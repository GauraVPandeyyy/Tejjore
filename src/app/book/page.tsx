import type { Metadata } from "next";
import { BookingExperience } from "@/components/booking/BookingExperience";
import { bookingConfig } from "@/data/booking";
import { guestLimits } from "@/lib/booking/validation";
import type { RoomId } from "@/types/hotel";

export const metadata: Metadata = {
  title: "Book Direct | Tejjora Lake View",
  description: "Check room-category availability, see configured rates and reserve a direct stay at Tejjora Lake View in Gomti Nagar, Lucknow.",
  alternates: { canonical: "/book" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Whole number within the server's limits; anything else (blank, 2.5, "abc") uses the fallback. */
function count(value: string | undefined, fallback: number, limits: { min: number; max: number }) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, parsed));
}

function roomId(value: string | undefined): RoomId | undefined {
  return value === "deluxe" || value === "super-deluxe" || value === "premium" ? value : undefined;
}

function ratePlanId(value: string | undefined) {
  return bookingConfig.ratePlans.some((plan) => plan.id === value && plan.onlineBookable) ? value : undefined;
}

function addonIds(value: string | undefined) {
  if (!value) return [];
  const allowed = new Set<string>(bookingConfig.addons.map((addon) => addon.id));
  return value.split(",").filter((id) => allowed.has(id));
}

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const checkIn = one(params.checkIn);
  const checkOut = one(params.checkOut);
  const room = roomId(one(params.room));
  const adults = count(one(params.adults), 2, guestLimits.adults);
  // Each room needs at least one adult (enforced by the server), so never start with more rooms than adults.
  const roomCount = Math.min(count(one(params.rooms), 1, guestLimits.rooms), adults);

  return (
    <main className="booking-page">
      <BookingExperience
        initial={{
          checkIn,
          checkOut,
          adults,
          children: count(one(params.children), 0, guestLimits.children),
          rooms: roomCount,
          roomId: room,
          ratePlanId: ratePlanId(one(params.rate)),
          addonIds: addonIds(one(params.addons)),
        }}
      />
    </main>
  );
}
