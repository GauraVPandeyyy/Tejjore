import "server-only";
import { hotel } from "@/data/hotel";
import { amenities } from "@/data/amenities";
import { formatMoney } from "@/data/commerce";
import { nearbyPlaces } from "@/data/nearby";
import { availableRoomsOnDate } from "@/lib/booking/capacity";
import { bookingEnvironmentMode, searchAvailability } from "@/lib/booking/inventory";
import { roomOccupancy } from "@/lib/booking/occupancy";
import { stayNightlyRates } from "@/lib/booking/operations";
import { calculateBookingPrice } from "@/lib/booking/pricing";
import { averageNightlyRate, stayRoomSubtotal } from "@/lib/booking/rateCard";
import { readBookingStore } from "@/lib/booking/store";
import { occupancyError, validateStayDates } from "@/lib/booking/validation";
import { getPublicPropertyFacts } from "@/lib/content/facts";
import { getRooms } from "@/lib/content/rooms";
import { matchesQuery } from "@/components/dining/menuSearch";
import { commerceConfig } from "@/data/commerce";
import type { BookingRequestPayload } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { contactCard, findApprovedAnswers, hotelAddress, mapsRoute, menuCard, offersCard, placesCard, ratesCard, roomItems } from "./grounded";
import { tokenize } from "./matching";
import type { ConciergeAction, ConciergeCard } from "./provider";
import type { LlmToolDeclaration } from "./llm";

/**
 * The concierge's tools. Everything here is read-only and runs on the server; the model only picks
 * a tool and its arguments, which are re-validated here (dates through validateStayDates, rooms
 * from an allow-list, strict keys, bounded numbers). Each tool returns:
 *  - `data`: what the model may use (nothing private: published or verified content and booking
 *    engine output only),
 *  - `summary`: the deterministic wording of the same result, used if the model's text fails the
 *    grounding check or the model is unavailable,
 *  - `cards` / `actions`: what the chat renders.
 */
export type ToolContext = { now: Date };
export type ToolOutput = {
  intent: string;
  data: unknown;
  summary: string;
  cards?: ConciergeCard[];
  actions?: ConciergeAction[];
  /** True when the result comes from the live booking system. */
  live?: boolean;
};

type Schema = Record<string, unknown>;
type Tool<A> = {
  declaration: LlmToolDeclaration;
  parse(args: Record<string, unknown>): A | string;
  run(args: A, context: ToolContext): Promise<ToolOutput>;
};

const ROOM_IDS = ["deluxe", "super-deluxe", "premium"] as const;

/* ------------------------------------------------------------------ argument helpers */

function strict(args: Record<string, unknown>, allowed: string[]) {
  const extra = Object.keys(args).filter((key) => !allowed.includes(key));
  return extra.length ? `Unexpected argument: ${extra[0]}` : null;
}

function text(value: unknown, max = 80) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function roomArg(value: unknown): RoomId | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" && (ROOM_IDS as readonly string[]).includes(value) ? (value as RoomId) : null;
}

function stayArgs(args: Record<string, unknown>) {
  const checkIn = text(args.checkIn, 10);
  const checkOut = text(args.checkOut, 10);
  if (!checkIn || !checkOut) return "checkIn and checkOut are required (YYYY-MM-DD).";
  const validation = validateStayDates(checkIn, checkOut);
  return validation.ok ? { checkIn, checkOut, nights: validation.nights } : validation.error;
}

const stayProps: Schema = {
  checkIn: { type: "string", description: "Check-in date, YYYY-MM-DD (India time)." },
  checkOut: { type: "string", description: "Check-out date, YYYY-MM-DD; after check-in." },
};

function roomName(roomId: RoomId) {
  return { deluxe: "Deluxe Room", "super-deluxe": "Super Deluxe Room", premium: "Premium Room" }[roomId];
}

function bookHref(checkIn?: string, checkOut?: string, roomId?: RoomId) {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (roomId) params.set("room", roomId);
  const query = params.toString();
  return query ? `/book?${query}` : "/book";
}

function nightsLabel(nights: number) {
  return `${nights} night${nights === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ tools */

const listRooms: Tool<Record<string, never>> = {
  declaration: { name: "list_rooms", description: "The hotel's room categories with photos' summaries and the current 'from' price per night (room only). Use for questions about which rooms exist or how they differ.", parameters: { type: "object", properties: {} } },
  parse: (args) => strict(args, []) ?? {},
  async run() {
    const rooms = await roomItems();
    const { data } = await getRooms();
    const shared = data[0]?.amenities.map((item) => item.label) ?? [];
    return {
      intent: "rooms",
      live: true,
      cards: [{ kind: "rooms", title: "The three rooms", rooms }],
      actions: [{ label: "Compare rooms", href: "/rooms" }, { label: "Check dates", href: "/book" }],
      data: {
        roomCount: rooms.length,
        rooms: rooms.map((room) => ({ id: room.id, name: room.name, summary: room.summary, fromPricePerNightRoomOnly: room.fromRate, priceNote: room.rateNote })),
        inEveryRoom: shared,
        notConfirmed: "Bed type, room size, occupancy and a guaranteed room-level lake view are not confirmed for any room.",
      },
      summary: `Tejjora has ${rooms.length} room categories: ${rooms.map((room) => `${room.name}${room.fromRate !== null ? ` from ${formatMoney(room.fromRate)} per night, room only` : ""}`).join("; ")}. Each lists ${shared.join(", ").toLowerCase()}. Bed type, room size, occupancy and a guaranteed room-level lake view are not confirmed, so I won't guess them.`,
    };
  },
};

const getCurrentRates: Tool<Record<string, never>> = {
  declaration: { name: "get_current_rates", description: "Today's direct room rates per night (room only): the 'from' price, the standard rate and tonight's rate for each room. Use for general price questions without dates.", parameters: { type: "object", properties: {} } },
  parse: (args) => strict(args, []) ?? {},
  async run() {
    const card = await ratesCard();
    if (!card) {
      return { intent: "live-rates-unavailable", live: true, data: { unavailable: true, reason: "The live rate system could not be read." }, summary: "I can't read the hotel's live rates at the moment, so I won't quote a number. Choose your dates on the booking page for the exact price, or ask the hotel directly.", actions: [{ label: "Check dates", href: "/book" }] };
    }
    const tonight = card.rooms.filter((room) => room.tonightRate !== room.fromRate);
    return {
      intent: "live-rates",
      live: true,
      cards: [card],
      actions: [{ label: "Check dates", href: "/book" }, { label: "Compare rooms", href: "/rooms" }],
      data: { currency: "INR", unit: "per room per night, room only", rooms: card.rooms.map((room) => ({ name: room.name, from: room.fromRate, standard: room.standardRate, tonight: room.tonightRate, note: room.note })) },
      summary: `Direct rates per night, room only: ${card.rooms.map((room) => `${room.name} from ${formatMoney(room.fromRate)}`).join(" · ")}. These come from this website's current booking system.${tonight.length ? ` Tonight: ${tonight.map((room) => `${room.name.replace(" Room", "")} ${formatMoney(room.tonightRate)}`).join(" · ")}.` : ""} Choose your dates for the exact price of your stay.`,
    };
  },
};

const searchAvailabilityTool: Tool<{ checkIn: string; checkOut: string; nights: number }> = {
  declaration: { name: "search_availability", description: "Live availability and the exact room-only price of each room for a stay. Use whenever the guest gives dates. Counts are never exposed; each room is reported as available or not.", parameters: { type: "object", properties: stayProps, required: ["checkIn", "checkOut"] } },
  parse(args) {
    const extra = strict(args, ["checkIn", "checkOut"]);
    return extra ?? stayArgs(args);
  },
  async run({ checkIn, checkOut, nights }) {
    const results = await searchAvailability(checkIn, checkOut);
    const preview = bookingEnvironmentMode() === "development";
    const configured = results.some((item) => item.total > 0);
    const rooms = results.map((item) => ({
      id: item.roomId,
      name: roomName(item.roomId),
      stayTotal: stayRoomSubtotal(item.nightlyRates),
      averageNightly: averageNightlyRate(item.nightlyRates),
      availability: preview ? "unconfirmed (the site is using test inventory)" : !configured ? "unconfirmed (online inventory not configured)" : item.available > 0 ? "available" : "not available online",
    }));
    const card: ConciergeCard = {
      kind: "availability",
      checkIn,
      checkOut,
      nights,
      preview: preview || !configured,
      rooms: results.map((item) => ({ id: item.roomId, name: roomName(item.roomId), available: preview || !configured ? -1 : item.available, stayTotal: stayRoomSubtotal(item.nightlyRates), averageRate: averageNightlyRate(item.nightlyRates), bookHref: bookHref(checkIn, checkOut, item.roomId) })),
    };
    const lines = rooms.map((room) => `${room.name}: ${formatMoney(room.stayTotal)} for ${nightsLabel(nights)}, room only (${room.availability})`);
    return {
      intent: preview || !configured ? "availability-development" : "live-availability",
      live: true,
      cards: [card],
      actions: [{ label: "Open booking", href: bookHref(checkIn, checkOut) }],
      data: { checkIn, checkOut, nights, currency: "INR", priceBasis: "per room for the whole stay, room only, before taxes and extras", rooms },
      summary: `For ${checkIn} to ${checkOut} (${nightsLabel(nights)}): ${lines.join("; ")}.${preview || !configured ? " Room counts are not confirmed because the site is not yet on live inventory, so please confirm availability with the hotel." : " Availability can change until a reservation is held."}`,
    };
  },
};

type QuoteArgs = { roomId: RoomId; checkIn: string; checkOut: string; nights: number; adults: number; children: number; rooms: number };
const quoteStay: Tool<QuoteArgs> = {
  declaration: {
    name: "quote_stay",
    description: "The exact itemised cost of a stay in one room category, calculated by the booking engine from live nightly rates. ALWAYS use this for 'how much for N nights' or any total; never add numbers yourself.",
    parameters: { type: "object", properties: { roomId: { type: "string", enum: [...ROOM_IDS] }, ...stayProps, adults: { type: "integer", description: "Adults, default 2." }, children: { type: "integer", description: "Children, default 0." }, rooms: { type: "integer", description: "Number of rooms, default 1." } }, required: ["roomId", "checkIn", "checkOut"] },
  },
  parse(args) {
    const extra = strict(args, ["roomId", "checkIn", "checkOut", "adults", "children", "rooms"]);
    if (extra) return extra;
    const roomId = roomArg(args.roomId);
    if (!roomId) return "roomId must be deluxe, super-deluxe or premium.";
    const stay = stayArgs(args);
    if (typeof stay === "string") return stay;
    const adults = integer(args.adults, 1, 12, 2);
    const children = integer(args.children, 0, 8, 0);
    const rooms = integer(args.rooms, 1, 6, 1);
    if (adults === null || children === null || rooms === null) return "Guest or room counts are out of range.";
    return { roomId, ...stay, adults, children, rooms };
  },
  async run({ roomId, checkIn, checkOut, nights, adults, children, rooms }) {
    const limits = (await roomOccupancy())[roomId];
    const tooMany = occupancyError(limits, adults, children, rooms);
    if (tooMany) return { intent: "live-quote", live: true, data: { error: tooMany }, summary: tooMany, actions: [{ label: "Check dates", href: bookHref(checkIn, checkOut, roomId) }] };

    const store = await readBookingStore();
    const preview = bookingEnvironmentMode() === "development";
    let soldOut = false;
    for (let index = 0; index < nights; index += 1) {
      const date = new Date(Date.parse(`${checkIn}T12:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10);
      if (availableRoomsOnDate(store, roomId, date).available < rooms) soldOut = true;
    }
    if (soldOut && !preview) {
      const message = `The ${roomName(roomId)} is not available online for those dates, so I can't quote it.`;
      return { intent: "live-quote", live: true, data: { available: false }, summary: message, actions: [{ label: "Try other dates", href: "/book" }] };
    }
    const nightly = stayNightlyRates(store, roomId, checkIn, checkOut);
    // Same inputs as POST /api/reservations/quote: live nightly rates, room-only plan, no add-ons, no promo.
    const payload = { stay: { checkIn, checkOut, adults, children, rooms }, roomId, ratePlanId: "room-only", addonIds: [], guest: { firstName: "Guest", phone: "0000000000", email: "guest@example.com", preferredContact: "email" }, source: "website" } as unknown as BookingRequestPayload;
    const pricing = calculateBookingPrice(payload, 0, { nightlyRates: nightly });
    const taxConfigured = commerceConfig.pricing.taxConfigured;
    const serviceConfigured = commerceConfig.pricing.serviceChargeConfigured;
    const lines = [
      { label: `Room, ${nightsLabel(nights)}${rooms > 1 ? ` × ${rooms} rooms` : ""}`, amount: pricing.roomSubtotal },
      ...(pricing.extraGuestCharge ? [{ label: "Additional adults", amount: pricing.extraGuestCharge }] : []),
      ...(pricing.childrenCharge ? [{ label: "Children", amount: pricing.childrenCharge }] : []),
      ...(taxConfigured ? [{ label: "Tax", amount: pricing.tax }] : []),
      ...(serviceConfigured ? [{ label: "Service charge", amount: pricing.serviceCharge }] : []),
    ];
    const note = `${taxConfigured ? "" : "Taxes are not yet configured on the website; "}Room only, no add-ons or promo code. The full total is shown again before you pay.`;
    const card: ConciergeCard = { kind: "quote", roomName: roomName(roomId), checkIn, checkOut, nights, nightly: pricing.nightlyRates ?? nightly, lines, total: pricing.grandTotal, preview, bookHref: bookHref(checkIn, checkOut, roomId), note };
    return {
      intent: "live-quote",
      live: true,
      cards: [card],
      actions: [{ label: `Book the ${roomName(roomId).replace(" Room", "")}`, href: bookHref(checkIn, checkOut, roomId) }],
      data: { room: roomName(roomId), checkIn, checkOut, nights, adults, children, rooms, currency: "INR", nightlyRates: pricing.nightlyRates ?? nightly, roomSubtotal: pricing.roomSubtotal, extraGuestCharge: pricing.extraGuestCharge, childrenCharge: pricing.childrenCharge, tax: taxConfigured ? pricing.tax : "not configured", serviceCharge: serviceConfigured ? pricing.serviceCharge : "not configured", grandTotal: pricing.grandTotal, availability: preview ? "unconfirmed (the site is using test inventory)" : "available", note },
      summary: `${roomName(roomId)}, ${checkIn} to ${checkOut} (${nightsLabel(nights)}): ${formatMoney(pricing.grandTotal)} in total${taxConfigured ? "" : " before taxes"}, room only. ${note}${preview ? " Availability isn't confirmed because the site is using test inventory." : ""}`,
    };
  },
};

const listActiveOffers: Tool<Record<string, never>> = {
  declaration: { name: "list_active_offers", description: "Offers the hotel has published and that are valid today. Returns an empty list when there are none; never imply a discount otherwise.", parameters: { type: "object", properties: {} } },
  parse: (args) => strict(args, []) ?? {},
  async run() {
    const card = await offersCard();
    if (!card) return { intent: "offers-none", data: { offers: [], note: "No offers are currently published." }, summary: "There are no offers published on the website right now. The rate you see when you check dates is the hotel's own direct rate, and I won't invent a discount.", actions: [{ label: "Check dates", href: "/book" }] };
    return { intent: "offers", cards: [card], actions: [{ label: "See offers", href: "/offers" }, { label: "Check dates", href: "/book" }], data: { offers: card.offers.map((offer) => ({ title: offer.title, summary: offer.summary, validUntil: offer.validTo })) }, summary: `Published offers: ${card.offers.map((offer) => offer.title).join("; ")}. Terms are on the offers page; the booking engine applies any valid code when your room is held.` };
  },
};

const searchMenu: Tool<{ query?: string; section?: string }> = {
  declaration: { name: "search_menu", description: "Search the hotel restaurant's printed menu: dish names, prices (full and half portions where printed), egg marker and whether a dish is available today. With no arguments, lists the menu sections.", parameters: { type: "object", properties: { query: { type: "string", description: "Dish or ingredient, e.g. 'paneer tikka'." }, section: { type: "string", description: "A menu section name, e.g. 'Breakfast'." } } } },
  parse(args) {
    const extra = strict(args, ["query", "section"]);
    return extra ?? { query: text(args.query), section: text(args.section) };
  },
  async run({ query, section }) {
    const { card, menu } = await menuCard();
    const wanted = section?.toLowerCase();
    const items = menu.flatMap((category) =>
      wanted && !category.name.toLowerCase().includes(wanted) && !category.slug.includes(wanted)
        ? []
        : category.items.filter((item) => !query || matchesQuery(`${item.name} ${item.description ?? ""}`, query)).map((item) => ({ item, category })),
    );
    if (!query && !section) {
      return { intent: "restaurant", cards: [card], actions: [{ label: "Open the menu", href: "/dining#menu" }], data: { sections: card.sections.map((entry) => ({ name: entry.name, dishes: entry.count, fromPrice: entry.fromPrice })), notes: card.notes }, summary: `The hotel's printed menu has ${card.sections.length} sections. ${card.notes.join(". ")}.` };
    }
    if (!items.length) return { intent: "menu-dishes", data: { matches: [], note: "No dish on the printed menu matches." }, summary: `I couldn't find "${query ?? section}" on the hotel's printed menu.`, actions: [{ label: "Open the menu", href: "/dining#menu" }] };
    const shown = items.slice(0, 8);
    const dishes = shown.map(({ item, category }) => ({ name: item.name, section: category.name, price: item.priceFull, halfPrice: item.priceHalf, containsEgg: item.containsEgg, available: item.available, href: `/dining#menu-${category.slug}` }));
    return {
      intent: "menu-dishes",
      cards: [{ kind: "dishes", query: query ?? section ?? "", dishes }],
      actions: [{ label: "Open the menu", href: "/dining#menu" }],
      data: { currency: "INR", priceBasis: "per full portion as printed; a 5% service charge and applicable taxes are added", matches: dishes.map((dish) => ({ name: dish.name, section: dish.section, price: dish.price, halfPrice: dish.halfPrice, availableToday: dish.available })), more: Math.max(0, items.length - shown.length) },
      summary: `The menu lists ${dishes.slice(0, 3).map((dish) => `${dish.name} (${formatMoney(dish.price)})${dish.available ? "" : ", not available today"}`).join(", ")}${items.length > 3 ? " and more" : ""}. Prices are per full portion as printed; a 5% service charge and applicable taxes are added.`,
    };
  },
};

const getRestaurantInfo: Tool<Record<string, never>> = {
  declaration: { name: "get_restaurant_info", description: "Restaurant operating facts: preparation time, service charge, taxes, allergy note, whether online ordering is on. Opening hours are reported only if the hotel has set them.", parameters: { type: "object", properties: {} } },
  parse: (args) => strict(args, []) ?? {},
  async run() {
    const { card, dishCount, menu } = await menuCard();
    const { getRestaurantSettings } = await import("@/lib/content/restaurant");
    const { data: settings } = await getRestaurantSettings();
    const prep = settings.prepMinutesMin && settings.prepMinutesMax ? `${settings.prepMinutesMin}-${settings.prepMinutesMax} minutes` : null;
    return {
      intent: "restaurant",
      cards: [card],
      actions: [{ label: "See dining", href: "/dining" }],
      data: { onSiteRestaurant: true, roomService: true, dishes: dishCount, sections: menu.length, openingHours: settings.openingTime ?? "not confirmed", preparationTime: prep, serviceCharge: settings.serviceChargePct ? `${settings.serviceChargePct}% excluded from the printed rates` : null, taxes: settings.taxesNote, allergyNote: settings.allergyNote, noCancellation: settings.noCancelNote, onlineOrdering: settings.orderingEnabled ? "on" : "currently off (call or WhatsApp the restaurant)", tableReservations: "not confirmed" },
      summary: `Tejjora has an on-site restaurant and room service. The printed menu lists ${dishCount} dishes across ${menu.length} sections${prep ? `; orders take about ${prep}` : ""}. Opening hours and table reservations are not confirmed in the website data, so please check those with the hotel.`,
    };
  },
};

const getPropertyFacts: Tool<{ topic?: string }> = {
  declaration: { name: "get_property_facts", description: "Verified public facts about the hotel (name, address, phone, number of rooms, amenities, nearby places). Anything not returned is unconfirmed.", parameters: { type: "object", properties: { topic: { type: "string", description: "Optional word to filter fact keys, e.g. 'address', 'amenities', 'rooms'." } } } },
  parse(args) {
    const extra = strict(args, ["topic"]);
    return extra ?? { topic: text(args.topic, 40)?.toLowerCase() };
  },
  async run({ topic }) {
    const { data: facts } = await getPublicPropertyFacts();
    const entries = facts.entries.filter((entry) => !topic || entry.key.toLowerCase().includes(topic)).slice(0, 40);
    const names = amenities.map((item) => item.label);
    return {
      intent: "approved-knowledge",
      data: { facts: entries, amenities: names, notConfirmed: "Any policy, timing, distance or facility not listed here is unconfirmed." },
      summary: entries.length ? `Confirmed facts: ${entries.map((entry) => `${entry.key}: ${typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value)}`).join("; ")}.` : `Confirmed amenities include ${names.join(", ")}. I don't have other confirmed details on that.`,
    };
  },
};

const getFaq: Tool<{ question: string }> = {
  declaration: { name: "get_faq", description: "Staff-approved answers (approved AI knowledge, published FAQs and policies) matching the guest's question. Use for policy-style questions: check-in, cancellation, pets, parking, payment. If nothing matches, the fact is unconfirmed: say so.", parameters: { type: "object", properties: { question: { type: "string", description: "The guest's question in a few words." } }, required: ["question"] } },
  parse(args) {
    const extra = strict(args, ["question"]);
    if (extra) return extra;
    const question = text(args.question, 200);
    return question ? { question } : "question is required.";
  },
  async run({ question }) {
    const matches = await findApprovedAnswers(tokenize(question), tokenize);
    if (!matches.length) return { intent: "fallback", data: { matches: [], note: "No approved answer exists. Do not guess; say it is not confirmed and offer the hotel's phone or WhatsApp." }, summary: "I do not have a confirmed answer for that in Tejjora's current hotel information, so I would rather not guess. You can ask the hotel directly.", actions: [{ label: "Ask on WhatsApp", href: `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I have a question about my stay.")}`, external: true }] };
    return { intent: "approved-knowledge", data: { matches: matches.map((match) => ({ source: match.source, title: match.title, answer: match.answer.slice(0, 1200) })) }, summary: matches[0].answer.slice(0, 600) };
  },
};

const getDirections: Tool<{ place?: string }> = {
  declaration: { name: "get_directions", description: "The hotel's address and Google Maps route links to the hotel's verified nearby places. Travel times and distances are NOT available; never state them.", parameters: { type: "object", properties: { place: { type: "string", description: "Optional place name, e.g. 'airport', 'Singapore Mall'." } } } },
  parse(args) {
    const extra = strict(args, ["place"]);
    return extra ?? { place: text(args.place, 60)?.toLowerCase() };
  },
  async run({ place }) {
    const words = place ? tokenize(place).filter((word) => word.length >= 3) : [];
    const picked = nearbyPlaces.filter((entry) => words.some((word) => `${entry.name} ${entry.category} ${entry.id}`.toLowerCase().includes(word)));
    const ids = picked.length ? picked.map((entry) => entry.id) : undefined;
    const card = placesCard(ids);
    return {
      intent: "location",
      cards: [contactCard(), card],
      actions: [{ label: "Open hotel route", href: mapsRoute(hotelAddress), external: true }, { label: "Getting here", href: "/location" }],
      data: { address: hotelAddress, places: card.places.map((entry) => ({ name: entry.name, category: entry.category, routeLink: "shown as a card" })), note: "Distances and travel times are not stored; live times are in Maps." },
      summary: `Tejjora Lake View is at ${hotelAddress}. ${picked.length ? `Route links to ${picked.map((entry) => entry.name).join(", ")} are below.` : "Route links to nearby places are below."} I won't estimate travel time; Maps shows it live.`,
    };
  },
};

const getContact: Tool<Record<string, never>> = {
  declaration: { name: "get_contact", description: "The hotel's phone number, WhatsApp link and address.", parameters: { type: "object", properties: {} } },
  parse: (args) => strict(args, []) ?? {},
  async run() {
    return { intent: "contact", cards: [contactCard()], data: { phone: hotel.phoneDisplay, whatsapp: "available on the same number", address: hotelAddress }, summary: `You can contact Tejjora Lake View on ${hotel.phoneDisplay}. WhatsApp is also available on the same hotel number.` };
  },
};

const startBooking: Tool<{ roomId?: RoomId; checkIn?: string; checkOut?: string }> = {
  declaration: { name: "start_booking", description: "Builds a link to the booking page with the room and dates pre-filled. It books nothing.", parameters: { type: "object", properties: { roomId: { type: "string", enum: [...ROOM_IDS] }, ...stayProps } } },
  parse(args) {
    const extra = strict(args, ["roomId", "checkIn", "checkOut"]);
    if (extra) return extra;
    const roomId = roomArg(args.roomId);
    if (roomId === null) return "roomId must be deluxe, super-deluxe or premium.";
    const stay = args.checkIn || args.checkOut ? stayArgs(args) : null;
    if (typeof stay === "string") return stay;
    return { roomId, ...(stay ? { checkIn: stay.checkIn, checkOut: stay.checkOut } : {}) };
  },
  async run({ roomId, checkIn, checkOut }) {
    const href = bookHref(checkIn, checkOut, roomId);
    return { intent: "booking", data: { link: "provided as a button", note: "Booking is completed by the guest on the booking page. A reservation is confirmed only after payment." }, summary: "You can check dates, choose an available room category, review the exact price and proceed through checkout. A reservation becomes confirmed only after the booking and payment flow completes.", actions: [{ label: "Open booking", href }] };
  },
};

const openBookingStatusForm: Tool<Record<string, never>> = {
  declaration: { name: "open_booking_status_form", description: "Use when the guest asks about an existing booking or payment. Booking status is never read in chat: this only points to the secure lookup page (reference + registered mobile).", parameters: { type: "object", properties: {} } },
  parse: (args) => strict(args, []) ?? {},
  async run() {
    return { intent: "booking-status-privacy", data: { instruction: "Tell the guest to use the Manage booking page with their reference and registered mobile number. Do not ask for or repeat the reference or mobile here." }, summary: "For privacy, I will not reveal a reservation or payment status inside chat. Use Manage booking with your booking reference and registered mobile number.", actions: [{ label: "Manage booking", href: "/manage-booking" }] };
  },
};

/* ------------------------------------------------------------------ registry */

// The allow-list the model can call: nothing else is ever executed.
const registry = {
  list_rooms: listRooms,
  get_current_rates: getCurrentRates,
  search_availability: searchAvailabilityTool,
  quote_stay: quoteStay,
  list_active_offers: listActiveOffers,
  search_menu: searchMenu,
  get_restaurant_info: getRestaurantInfo,
  get_property_facts: getPropertyFacts,
  get_faq: getFaq,
  get_directions: getDirections,
  get_contact: getContact,
  start_booking: startBooking,
  open_booking_status_form: openBookingStatusForm,
} as const;

type ToolName = keyof typeof registry;

export const toolNames = Object.keys(registry) as ToolName[];

export function toolDeclarations(): LlmToolDeclaration[] {
  return toolNames.map((name) => registry[name].declaration);
}

export type ToolRun = { ok: true; output: ToolOutput } | { ok: false; error: string };

/** Runs one model-requested tool call: allow-listed name, strict arguments, errors never throw. */
export async function executeTool(name: string, args: unknown, context: ToolContext): Promise<ToolRun> {
  if (!Object.prototype.hasOwnProperty.call(registry, name)) return { ok: false, error: `Unknown tool: ${name.slice(0, 40)}` };
  const tool = registry[name as ToolName] as unknown as Tool<unknown>;
  const raw = args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  const parsed = tool.parse(raw);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  try {
    return { ok: true, output: await tool.run(parsed, context) };
  } catch (error) {
    console.warn(`[concierge] tool ${name} failed: ${error instanceof Error ? error.message.split("\n")[0] : "unknown error"}`);
    return { ok: false, error: "That information is temporarily unavailable." };
  }
}
