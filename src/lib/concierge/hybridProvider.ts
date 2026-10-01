import "server-only";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import { formatMoney } from "@/data/commerce";
import { bookingEnvironmentMode, searchAvailability } from "@/lib/booking/inventory";
import { todayInIndia, validateStayDates } from "@/lib/booking/validation";
import { effectiveRoomRate } from "@/lib/booking/operations";
import { readBookingStore } from "@/lib/booking/store";
import type { RoomId } from "@/types/hotel";
import { extractStayDates } from "./dateParser";
import { answerConciergeMessage } from "./knowledge";
import type { ConciergeAction, ConciergeMessage, ConciergeProvider, ConciergeReply } from "./provider";
import { polishConciergeReply } from "./languageLayer";

const roomIds: RoomId[] = ["deluxe", "super-deluxe", "premium"];

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function roomById(roomId: RoomId) {
  return rooms.find((room) => room.id === roomId)!;
}

function detectRoomId(text: string): RoomId | undefined {
  if (text.includes("super deluxe")) return "super-deluxe";
  if (text.includes("premium")) return "premium";
  if (text.includes("deluxe")) return "deluxe";
  return undefined;
}

function bookingHref(checkIn?: string, checkOut?: string, roomId?: RoomId) {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (roomId) params.set("room", roomId);
  const query = params.toString();
  return query ? `/book?${query}` : "/book";
}

function reply(intent: string, content: string, actions: ConciergeAction[] = [], source: ConciergeReply["dataSource"] = "hotel-knowledge"): ConciergeReply {
  return {
    role: "assistant",
    intent,
    content,
    actions,
    dataSource: source,
    asOf: source === "live-operations" ? new Date().toISOString() : undefined,
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
}

async function currentRateReply(): Promise<ConciergeReply> {
  const store = await readBookingStore();
  const today = todayInIndia();
  const lines = roomIds.map((roomId) => `${roomById(roomId).name}: ${formatMoney(effectiveRoomRate(store, roomId, today))}/night`);
  return reply(
    "live-rates",
    `Current configured website base rates are ${lines.join(" · ")}. Date-specific rates can differ, so choose your stay dates for the exact current website rate.`,
    [
      { label: "Check dates", href: "/book" },
      { label: "Compare rooms", href: "/rooms" },
    ],
    "live-operations",
  );
}

async function availabilityReply(checkIn: string, checkOut: string, requestedRoomId?: RoomId): Promise<ConciergeReply> {
  const allResults = await searchAvailability(checkIn, checkOut);
  const result = requestedRoomId ? allResults.filter((item) => item.roomId === requestedRoomId) : allResults;
  const mode = bookingEnvironmentMode();
  const configuredForSale = result.some((item) => item.total > 0);

  if (mode === "development") {
    return reply(
      "availability-development",
      `The site is currently using development inventory for ${formatDate(checkIn)} to ${formatDate(checkOut)}, so I will not present those room counts as real hotel availability. You can continue through the booking flow for testing, or contact Tejjora for an operational availability check.`,
      [
        { label: "Open booking", href: bookingHref(checkIn, checkOut) },
        { label: "Ask hotel", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(`Hello Tejjora Lake View, please check availability from ${checkIn} to ${checkOut}.`)}`, external: true },
      ],
      "live-operations",
    );
  }

  if (!configuredForSale && mode === "production") {
    return reply(
      "availability-unconfigured",
      `Online room inventory is not configured for ${formatDate(checkIn)} to ${formatDate(checkOut)} yet. Please contact Tejjora directly instead of treating this as sold out.`,
      [
        { label: "Ask on WhatsApp", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, please check room availability.")}`, external: true },
        { label: "Check dates", href: bookingHref(checkIn, checkOut) },
      ],
      "live-operations",
    );
  }

  const available = result.filter((item) => item.available > 0);
  if (!available.length) {
    return reply(
      "availability-none",
      `The current website inventory shows no rooms available for sale from ${formatDate(checkIn)} to ${formatDate(checkOut)}. You can try different dates or contact the hotel in case offline inventory is available.`,
      [
        { label: "Try other dates", href: "/book" },
        { label: "Contact hotel", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, please help me with alternative dates.")}`, external: true },
      ],
      "live-operations",
    );
  }

  const lines = available.map((item) => {
    const stayTotal = (item.nightlyRates ?? []).reduce((sum, night) => sum + night.rate, 0);
    const price = stayTotal > 0 ? `${formatMoney(stayTotal)} per room for the stay` : `${formatMoney(item.baseRate)}/night`;
    return `${roomById(item.roomId).name}: ${item.available} available, ${price}`;
  });
  const actions: ConciergeAction[] = available.slice(0, 3).map((item) => ({
    label: `Choose ${roomById(item.roomId).name.replace(" Room", "")}`,
    href: bookingHref(checkIn, checkOut, item.roomId),
  }));
  actions.push({ label: "Open booking", href: bookingHref(checkIn, checkOut) });

  return reply(
    "live-availability",
    `For ${formatDate(checkIn)} to ${formatDate(checkOut)}, the current website inventory shows: ${lines.join(" · ")}. Availability can change until a reservation is held/confirmed.`,
    actions,
    "live-operations",
  );
}

function roomComparisonReply(): ConciergeReply {
  const shared = "All three categories currently list air conditioning, free Wi-Fi, flat-screen TV, work desk and private bathroom.";
  return reply(
    "room-comparison",
    `Deluxe is the entry category, Super Deluxe is positioned as a more spacious stay, and Premium is the most elevated of Tejjora's current three-category collection. ${shared} Final bed type, room size, occupancy and guaranteed room-level lake view are not confirmed, so I will not invent them.`,
    [
      { label: "Compare rooms", href: "/rooms" },
      { label: "Plan my stay", href: "/plan-your-stay" },
      { label: "Check dates", href: "/book" },
    ],
  );
}

export const hybridConciergeProvider: ConciergeProvider = {
  async reply(messages: ConciergeMessage[]) {
    const last = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const text = last.trim().toLowerCase().replace(/\s+/g, " ");
    const dates = extractStayDates(last);
    const requestedRoomId = detectRoomId(text);
    if (dates) {
      const validation = validateStayDates(dates.checkIn, dates.checkOut);
      if (!validation.ok) {
        return reply(
          "invalid-stay-dates",
          validation.error,
          [{ label: "Choose valid dates", href: "/book" }],
        );
      }
    }

    const availabilityLanguage = containsAny(text, ["availability", "available", "vacant", "vacancy", "room left", "rooms left", "sold out"]);
    const roomContext = containsAny(text, ["room", "rooms", "stay", "date", "dates", "tonight", "tomorrow", "weekend", "booking", "deluxe", "premium"]);
    const availabilityIntent = availabilityLanguage && roomContext;
    const rateLanguage = containsAny(text, ["price", "rate", "rates", "cost", "tariff", "how much"]);
    const rateIntent = rateLanguage && containsAny(text, ["room", "rooms", "stay", "night", "deluxe", "premium", "tariff", "rate", "rates"]);
    const compareIntent = containsAny(text, ["compare room", "compare rooms", "difference between", "deluxe vs", "super deluxe vs", "which room"]);

    if (availabilityIntent && dates) return polishConciergeReply(last, await availabilityReply(dates.checkIn, dates.checkOut, requestedRoomId));
    if ((availabilityIntent || containsAny(text, ["check rooms", "check room"])) && !dates) {
      return reply(
        "availability-needs-dates",
        "I can check the current website inventory, but I need both check-in and check-out dates. You can type them like “2 Oct 2026 to 4 Oct 2026” or use the booking date picker.",
        [{ label: "Choose dates", href: "/book" }],
      );
    }
    if (rateIntent && dates) return polishConciergeReply(last, await availabilityReply(dates.checkIn, dates.checkOut, requestedRoomId));
    if (rateIntent) return polishConciergeReply(last, await currentRateReply());
    if (compareIntent) return polishConciergeReply(last, roomComparisonReply());
    if (containsAny(text, ["booking status", "reservation status", "payment status", "my booking", "my reservation", "booking reference"])) {
      return reply(
        "booking-status-privacy",
        "For privacy, I will not reveal a reservation or payment status from a booking reference alone inside chat. Use your booking confirmation details or contact Tejjora from the same booking contact information for help.",
        [
          { label: "Manage booking", href: "/manage-booking" },
          { label: "Smart Arrival", href: "/arrival" },
          { label: "Contact hotel", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I need help with an existing reservation.")}`, external: true },
        ],
      );
    }

    const staticReply = { ...answerConciergeMessage(last), dataSource: "hotel-knowledge" as const };
    return polishConciergeReply(last, staticReply);
  },
};
