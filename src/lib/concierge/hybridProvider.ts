import "server-only";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import { assets } from "@/data/assets";
import { formatMoney } from "@/data/commerce";
import { bookingEnvironmentMode, searchAvailability } from "@/lib/booking/inventory";
import { averageNightlyRate, stayRoomSubtotal } from "@/lib/booking/rateCard";
import { validateStayDates } from "@/lib/booking/validation";
import type { RoomId } from "@/types/hotel";
import { contactCard, findApprovedAnswers, findDishes, menuCard, offersCard, placesCard, ratesCard, roomItems } from "./grounded";
import { answerConciergeMessage } from "./knowledge";
import type { ConciergeAction, ConciergeCard, ConciergeMessage, ConciergeProvider, ConciergeReply } from "./provider";
import { polishConciergeReply } from "./languageLayer";
import { matchesAny, normalizeForIntent, tokenize } from "./matching";
import { mentionsBookingReference } from "./privacy";
import { detectRoomId, extractSlots, stayFromMessage } from "./slots";
import { executeTool } from "./tools";

// Whole-word / whole-phrase matching (see ./matching). Never substring matching.
function containsAny(tokens: string[], phrases: string[]) {
  return matchesAny(tokens, phrases);
}

function roomById(roomId: RoomId) {
  return rooms.find((room) => room.id === roomId)!;
}

function bookingHref(checkIn?: string, checkOut?: string, roomId?: RoomId) {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (roomId) params.set("room", roomId);
  const query = params.toString();
  return query ? `/book?${query}` : "/book";
}

function reply(intent: string, content: string, actions: ConciergeAction[] = [], source: ConciergeReply["dataSource"] = "hotel-knowledge", cards: ConciergeCard[] = []): ConciergeReply {
  return {
    role: "assistant",
    intent,
    content,
    actions,
    ...(cards.length ? { cards } : {}),
    dataSource: source,
    asOf: source === "live-operations" ? new Date().toISOString() : undefined,
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
}

/**
 * "From" rates exactly as the rooms pages show them: the shared rate card built from the admin
 * booking configuration (lib/booking/rateCard.ts), never a number from copy.
 */
async function currentRateReply(): Promise<ConciergeReply> {
  const card = await ratesCard();
  if (!card) {
    return reply(
      "live-rates-unavailable",
      "I can't read the hotel's live rates at the moment, so I won't quote a number. Choose your dates on the booking page for the exact price, or ask the hotel directly.",
      [{ label: "Check dates", href: "/book" }, { label: "Ask on WhatsApp", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, please share your room rates.")}`, external: true }],
      "live-operations",
    );
  }
  const lines = card.rooms.map((room) => `${room.name} from ${formatMoney(room.fromRate)}`);
  const tonight = card.rooms.filter((room) => room.tonightRate !== room.fromRate).map((room) => `${room.name.replace(" Room", "")} ${formatMoney(room.tonightRate)}`);
  return reply(
    "live-rates",
    `Direct rates per night, room only: ${lines.join(" · ")}. These come from this website’s current booking system.${tonight.length ? ` Tonight: ${tonight.join(" · ")}.` : ""} Choose your dates for the exact price of your stay.`,
    [
      { label: "Check dates", href: "/book" },
      { label: "Compare rooms", href: "/rooms" },
    ],
    "live-operations",
    [card],
  );
}

function stayNights(checkIn: string, checkOut: string) {
  return Math.round((Date.parse(`${checkOut}T12:00:00Z`) - Date.parse(`${checkIn}T12:00:00Z`)) / 86_400_000);
}

async function availabilityReply(checkIn: string, checkOut: string, requestedRoomId?: RoomId): Promise<ConciergeReply> {
  const allResults = await searchAvailability(checkIn, checkOut);
  const result = requestedRoomId ? allResults.filter((item) => item.roomId === requestedRoomId) : allResults;
  const mode = bookingEnvironmentMode();
  const configuredForSale = result.some((item) => item.total > 0);

  const stayCard = (preview: boolean, items = result): ConciergeCard => ({
    kind: "availability",
    checkIn,
    checkOut,
    nights: stayNights(checkIn, checkOut),
    preview,
    rooms: items.map((item) => ({
      id: item.roomId,
      name: roomById(item.roomId).name,
      // Preview inventory is test data: its room counts are never shown as real availability.
      available: preview ? -1 : item.available,
      stayTotal: stayRoomSubtotal(item.nightlyRates),
      averageRate: averageNightlyRate(item.nightlyRates),
      bookHref: bookingHref(checkIn, checkOut, item.roomId),
    })),
  });

  if (mode === "development") {
    return reply(
      "availability-development",
      `The site is currently using development inventory for ${formatDate(checkIn)} to ${formatDate(checkOut)}, so I will not present those room counts as real hotel availability. The prices below are the live rates for those dates. You can continue through the booking flow for testing, or contact Tejjora for an operational availability check.`,
      [
        { label: "Open booking", href: bookingHref(checkIn, checkOut) },
        { label: "Ask hotel", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(`Hello Tejjora Lake View, please check availability from ${checkIn} to ${checkOut}.`)}`, external: true },
      ],
      "live-operations",
      [stayCard(true)],
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
    `For ${formatDate(checkIn)} to ${formatDate(checkOut)}, the current website inventory shows: ${lines.join(" · ")}. Prices are room only, before any taxes or extras. Availability can change until a reservation is held/confirmed.`,
    actions,
    "live-operations",
    [stayCard(false, available)],
  );
}

async function roomComparisonReply(): Promise<ConciergeReply> {
  const shared = "All three categories currently list air conditioning, free Wi-Fi, flat-screen TV, work desk and private bathroom.";
  return reply(
    "room-comparison",
    `Deluxe is the entry category, Super Deluxe is positioned as a more spacious stay, and Premium is the most elevated of Tejjora's current three-category collection. ${shared} Final bed type, room size, occupancy and guaranteed room-level lake view are not confirmed, so I will not invent them.`,
    [
      { label: "Compare rooms", href: "/rooms" },
      { label: "Plan my stay", href: "/plan-your-stay" },
      { label: "Check dates", href: "/book" },
    ],
    "hotel-knowledge",
    [{ kind: "rooms", title: "The three rooms", rooms: await roomItems() }],
  );
}

/**
 * Rich cards for answers from the static knowledge base, built from the same verified data the
 * pages render. The reply text changes only where verified data makes it more precise.
 */
async function enrich(base: ConciergeReply): Promise<ConciergeReply> {
  switch (base.intent) {
    case "rooms":
      return { ...base, cards: [{ kind: "rooms", title: "The three rooms", rooms: await roomItems() }] };
    case "restaurant":
    case "breakfast": {
      const { card, menu, dishCount } = await menuCard();
      if (!menu.length) return base;
      const breakfast = menu.find((category) => category.slug === "breakfast" || category.name.toLowerCase() === "breakfast");
      if (base.intent === "breakfast") {
        const extra = breakfast ? ` The hotel's printed menu has a Breakfast section of ${breakfast.items.length} dishes.` : "";
        return { ...base, content: base.content + extra, cards: [card] };
      }
      return {
        ...base,
        content: `Tejjora has an on-site restaurant and room service. The hotel's printed menu lists ${dishCount} dishes across ${menu.length} sections. Opening hours and table reservations are not confirmed in the website data, so please check those with the hotel.`,
        cards: [card],
      };
    }
    case "location":
    case "contact":
      return { ...base, cards: [contactCard()] };
    case "nearby":
    case "nearby-shopping":
    case "directions-igp":
    case "airport":
    case "railway":
      return { ...base, cards: [placesCard()] };
    case "virtual-tour":
      return { ...base, cards: [{ kind: "feature", eyebrow: "360° tour", title: "Walk through the hotel", body: "Every stop on the guest route, from arrival to the rooms. Media is labelled honestly where photography is still pending.", href: "/virtual-tour", image: assets.lobby[1], cta: "Open the tour" }] };
    case "planner":
      return { ...base, cards: [{ kind: "feature", eyebrow: "Plan your stay", title: "A plan in four steps", body: "Trip, arrival, dates and extras: a suggested room and an outline of the stay, handed straight to booking.", href: "/plan-your-stay", image: assets.rooms.premium[0], cta: "Start planning" }] };
    default:
      return base;
  }
}

async function offersReply(): Promise<ConciergeReply> {
  const card = await offersCard();
  if (!card) {
    return reply(
      "offers-none",
      "There are no offers published on the website right now. The rate you see when you check dates is the hotel's own direct rate, and I won't invent a discount.",
      [{ label: "Check dates", href: "/book" }, { label: "Ask on WhatsApp", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, do you have any current offers?")}`, external: true }],
    );
  }
  return reply(
    "offers",
    `Here ${card.offers.length === 1 ? "is the offer" : `are the ${card.offers.length} offers`} the hotel has published. Terms are on the offers page; the booking engine applies any valid code when your room is held.`,
    [{ label: "See offers", href: "/offers" }, { label: "Check dates", href: "/book" }],
    "hotel-knowledge",
    [card],
  );
}

const BOOKING_STATUS_PHRASES = ["booking status", "reservation status", "payment status", "my booking", "my reservation", "booking reference", "booking id", "confirmation number"];

/** "Where is my booking?": answered by the secure lookup page, never in chat and never by the model. */
export function isBookingStatusQuestion(tokens: string[]) {
  if (containsAny(tokens, BOOKING_STATUS_PHRASES)) return true;
  const aboutBooking = containsAny(tokens, ["booking", "reservation", "payment", "paid", "refund"]);
  return aboutBooking && containsAny(tokens, ["status", "confirmed", "confirmation", "gone through", "went through", "received", "cancelled", "canceled", "where is my"]);
}

// Earlier answers a short follow-up ("and the Premium?", "what about 3 nights?") may continue.
const STAY_TOPICS = new Set(["live-rates", "live-availability", "availability-development", "live-quote", "room-comparison", "rooms", "availability-needs-dates"]);

function isShortFollowUp(last: string, tokens: string[], hasRoom: boolean) {
  return tokens.length <= 8 && (/^\s*(and|also|what about|how about|same|then|for)\b/i.test(last) || (hasRoom && tokens.length <= 4));
}

export type DeterministicOptions = { /** Let the optional Gemini rewrite polish static wording (never live data). */ polish?: boolean };

/** The deterministic grounded router: rules + the same tools and templates the model uses. */
export async function deterministicReply(messages: ConciergeMessage[], options: DeterministicOptions = {}): Promise<ConciergeReply> {
  {
    const lastIndex = messages.map((message) => message.role).lastIndexOf("user");
    const last = lastIndex >= 0 ? messages[lastIndex].content : "";
    const finish = (value: ConciergeReply): Promise<ConciergeReply> => (options.polish === false ? Promise.resolve(value) : polishConciergeReply(last, value));
    const tokens = normalizeForIntent(last);
    const before = messages.slice(0, Math.max(0, lastIndex));
    const slotsBefore = extractSlots(before);
    const previousIntent = [...before].reverse().find((message) => message.role === "assistant")?.intent;
    const now = new Date();
    const statedDates = stayFromMessage(last, slotsBefore, now);
    let dates = statedDates;
    const requestedRoomId = detectRoomId(tokens);
    const followUpRoom = requestedRoomId ?? slotsBefore.roomId;
    const canInherit = Boolean(slotsBefore.checkIn && slotsBefore.checkOut);
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

    const explicitRoom = containsAny(tokens, ["room", "rooms", "deluxe", "premium", "super deluxe", "category", "categories"]);
    // Questions about breakfast, parking, pickup etc. mention "stay" or "available" without
    // asking about rooms; they must not be routed to room availability or room rates.
    const nonRoomSubject = containsAny(tokens, ["breakfast", "lunch", "dinner", "food", "meal", "menu", "restaurant", "parking", "wifi", "wi fi", "pickup", "pick up", "airport", "taxi", "cab", "laundry"]);
    const availabilityLanguage = containsAny(tokens, ["availability", "available", "vacant", "vacancy", "room left", "rooms left", "sold out", "free", "open", "do you have", "have you got", "can i book", "can we book", "is there a room", "any room", "any rooms"]);
    const roomContext = explicitRoom || (!nonRoomSubject && containsAny(tokens, ["stay", "date", "dates", "tonight", "tomorrow", "weekend", "booking"]));
    // "Is a room free from 12 to 14 Dec?": a room question that states dates is an availability question
    // even when it uses no availability word. Rate questions keep their own route (below).
    const datedRoomQuestion = Boolean(statedDates) && explicitRoom && !nonRoomSubject;
    const availabilityIntent = (availabilityLanguage && roomContext) || datedRoomQuestion;
    const rateLanguage = containsAny(tokens, ["price", "prices", "rate", "rates", "cost", "tariff", "how much"]);
    const rateIntent = rateLanguage && (explicitRoom || (!nonRoomSubject && containsAny(tokens, ["stay", "night", "nights", "tariff", "rate", "rates"])));
    const compareIntent = containsAny(tokens, ["compare", "comparison", "difference", "differences", "versus", "vs", "which room", "which is better"]) && explicitRoom;

    const topical = STAY_TOPICS.has(previousIntent ?? "");
    const followUp = !availabilityIntent && !rateIntent && !compareIntent && topical && isShortFollowUp(last, tokens, Boolean(requestedRoomId));
    if (!dates && canInherit && (availabilityIntent || rateIntent || followUp)) dates = { checkIn: slotsBefore.checkIn!, checkOut: slotsBefore.checkOut! };
    if (dates && !statedDates) {
      const validation = validateStayDates(dates.checkIn, dates.checkOut);
      if (!validation.ok) return reply("invalid-stay-dates", validation.error, [{ label: "Choose valid dates", href: "/book" }]);
    }

    // What a stay in one room costs: the booking engine's own itemised quote (same as the booking page).
    if ((rateIntent || followUp) && dates && followUpRoom) {
      const adults = extractSlots(messages).adults ?? 2;
      const run = await executeTool("quote_stay", { roomId: followUpRoom, checkIn: dates.checkIn, checkOut: dates.checkOut, adults, children: extractSlots(messages).children ?? 0 }, { now });
      if (run.ok) return finish(reply(run.output.intent, run.output.summary, run.output.actions ?? [], "live-operations", run.output.cards ?? []));
    }
    if (followUp && !dates) return finish(await currentRateReply());
    if (followUp && dates) return finish(await availabilityReply(dates.checkIn, dates.checkOut, requestedRoomId));
    if (availabilityIntent && dates) return finish(await availabilityReply(dates.checkIn, dates.checkOut, requestedRoomId));
    if ((availabilityIntent || containsAny(tokens, ["check rooms", "check room"])) && !dates) {
      return reply(
        "availability-needs-dates",
        "I can check the current website inventory, but I need both check-in and check-out dates. You can type them like “2 Oct 2026 to 4 Oct 2026” or use the booking date picker.",
        [{ label: "Choose dates", href: "/book" }],
      );
    }
    if (rateIntent && dates) return finish(await availabilityReply(dates.checkIn, dates.checkOut, requestedRoomId));
    if (rateIntent) return finish(await currentRateReply());
    if (compareIntent) return finish(await roomComparisonReply());
    if (containsAny(tokens, ["offer", "offers", "deal", "deals", "discount", "discounts", "promo", "promotion", "coupon", "package", "packages"])) return finish(await offersReply());
    if (isBookingStatusQuestion(tokens) || mentionsBookingReference(last)) {
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

    // Dishes the guest named, read from the published menu (prices exactly as on /dining).
    if (staticReply.intent === "fallback" || staticReply.intent === "restaurant" || staticReply.intent === "breakfast") {
      const { menu } = await menuCard();
      const found = findDishes(last, tokens, menu);
      if (found) {
        const names = found.dishes.slice(0, 3).map((dish) => `${dish.name} (${formatMoney(dish.price)})`).join(", ");
        return finish(reply(
          "menu-dishes",
          `Yes, the hotel's menu lists ${names}${found.dishes.length > 3 ? " and more" : ""}. Prices are per full portion as printed; a 5% service charge and applicable taxes are added.`,
          [{ label: "Open the menu", href: "/dining#menu" }, { label: "Ask the kitchen", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I have a question about the menu.")}`, external: true }],
          "hotel-knowledge",
          [{ kind: "dishes", query: found.query, dishes: found.dishes }],
        ));
      }
    }

    // Staff-approved answers (AI knowledge, FAQs, policies) before the "not confirmed" replies.
    if (staticReply.intent === "fallback" || staticReply.intent === "unconfirmed-policy") {
      const [entry] = await findApprovedAnswers(tokens, tokenize, 1);
      if (entry) return finish(reply("approved-knowledge", entry.answer, [{ label: "Ask the hotel", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I have a question about my stay.")}`, external: true }]));
    }

    return finish(await enrich(staticReply));
  }
}

export const hybridConciergeProvider: ConciergeProvider = {
  reply: (messages: ConciergeMessage[]) => deterministicReply(messages, { polish: true }),
};
