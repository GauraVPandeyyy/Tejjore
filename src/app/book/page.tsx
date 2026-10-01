import type { Metadata } from "next";
import { BookingExperience } from "@/components/booking/BookingExperience";
import { bookingConfig } from "@/data/booking";
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

function number(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

  return (
    <main className="booking-page">
      <BookingExperience
        initial={{
          checkIn,
          checkOut,
          adults: number(one(params.adults), 2),
          children: number(one(params.children), 0),
          rooms: number(one(params.rooms), 1),
          roomId: room,
          ratePlanId: ratePlanId(one(params.rate)),
          addonIds: addonIds(one(params.addons)),
        }}
      />
    </main>
  );
}
