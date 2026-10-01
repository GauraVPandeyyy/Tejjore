import { amenities } from "@/data/amenities";
import { bookingConfig } from "@/data/booking";
import { hotel } from "@/data/hotel";
import { nearbyPlaces } from "@/data/nearby";
import { restaurant } from "@/data/restaurant";
import { rooms } from "@/data/rooms";
import type { ConciergeAction, ConciergeReply } from "./provider";

const roomNames = rooms.map((room) => room.name).join(", ");
const amenityLabels = amenities.map((item) => item.label).join(", ");
const fullAddress = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;

function mapsDirections(destination: string) {
  const params = new URLSearchParams({
    api: "1",
    origin: fullAddress,
    destination,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function hotelWhatsApp(message: string) {
  return `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(message)}`;
}

const actions = {
  rooms: { label: "Explore rooms", href: "/rooms" },
  planner: { label: "Plan my stay", href: "/plan-your-stay" },
  booking: { label: "Check dates", href: "/book" },
  tour: { label: "Open virtual tour", href: "/virtual-tour" },
  location: { label: "Getting here", href: "/location" },
  restaurant: { label: "See dining", href: "/dining" },
  call: { label: "Call hotel", href: `tel:${hotel.phoneE164}`, external: true },
  whatsapp: {
    label: "Ask on WhatsApp",
    href: hotelWhatsApp("Hello Tejjora Lake View, I have a question about my stay."),
    external: true,
  },
} satisfies Record<string, ConciergeAction>;

function reply(intent: string, content: string, replyActions: ConciergeAction[] = []): ConciergeReply {
  return { role: "assistant", intent, content, actions: replyActions };
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function answerConciergeMessage(input: string): ConciergeReply {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");

  if (!text) {
    return reply(
      "empty",
      "Ask me about rooms, breakfast, parking, directions, the virtual tour or planning a stay.",
    );
  }

  const greetingPhrases = ["hello", "hi", "hey", "namaste", "hello there", "hi there", "hey there", "start", "help"];
  if (greetingPhrases.includes(text)) {
    return reply(
      "greeting",
      "Welcome to Tejjora. I can help with rooms, dining, parking, directions, the virtual tour and planning a stay. When current website inventory is available, I can also help you check configured room rates and availability.",
      [actions.planner, actions.booking],
    );
  }

  if (containsAny(text, ["pet", "pets", "dog", "cat"])) {
    return reply(
      "unconfirmed-policy",
      "I do not have a confirmed pet policy in the hotel information available here. Please check directly with Tejjora before travelling with a pet.",
      [actions.whatsapp, actions.call],
    );
  }

  if (containsAny(text, ["check in", "check-in", "checkin", "check out", "check-out", "checkout", "cancellation", "cancel", "policy", "policies", "id proof", "identity proof"])) {
    return reply(
      "unconfirmed-policy",
      "Those hotel policies and exact check-in/check-out times are not confirmed in the information available to me. Tejjora can confirm the applicable details for your stay directly.",
      [actions.whatsapp, actions.call],
    );
  }

  if (containsAny(text, ["price", "rate", "rates", "cost", "tariff", "cheap", "discount", "offer", "deal"])) {
    return reply(
      "rates",
      "Room rates can vary by date and current hotel configuration. Use Check Dates for the current website rate; I will not invent unconfigured inclusions, charges or policies.",
      [actions.booking, actions.whatsapp],
    );
  }

  const availabilityLanguage = containsAny(text, [
    "availability",
    "available",
    "vacant",
    "vacancy",
    "room left",
    "rooms left",
    "sold out",
  ]);
  const availabilityContext = containsAny(text, [
    "room",
    "rooms",
    "stay",
    "date",
    "tonight",
    "tomorrow",
    "weekend",
    "booking",
  ]);
  if (text === "availability" || (availabilityLanguage && availabilityContext)) {
    return reply(
      "availability",
      bookingConfig.availabilityCopy + " Use Check Dates to search the current website inventory for your stay.",
      [actions.booking, actions.whatsapp],
    );
  }

  if (containsAny(text, ["book", "booking", "reservation", "reserve", "stay request"])) {
    return reply(
      "booking",
      "You can check dates, choose an available room category, review the configured price and proceed through checkout. A reservation becomes confirmed only after the booking/payment flow reaches a confirmed state.",
      [actions.booking, actions.whatsapp],
    );
  }

  if (containsAny(text, ["which room", "choose room", "right room", "best room", "recommend room", "room type", "room category", "deluxe", "super deluxe", "premium room", "rooms"])) {
    return reply(
      "rooms",
      `Tejjora currently has three room categories: ${roomNames}. The confirmed data does not yet include final bed type, room size, occupancy or a guaranteed room-level lake view, so I will not guess those details. For a tailored suggestion based on your trip, use Plan My Stay.`,
      [actions.planner, actions.rooms, actions.booking],
    );
  }

  if (containsAny(text, ["lake view", "terrace", "view", "lake"])) {
    return reply(
      "lake-view",
      "The lake/terrace experience is a signature part of Tejjora's website experience. Room-specific lake views have not been confirmed for every category, so please do not treat the view as guaranteed for a particular room unless the hotel confirms it.",
      [{ label: "See the lake experience", href: "/#lake-view" }, actions.rooms],
    );
  }

  if (containsAny(text, ["parking", "car park", "park my car"])) {
    return reply(
      "parking",
      "Yes. Free private parking is listed among Tejjora Lake View's confirmed hotel amenities.",
      [actions.location, actions.booking],
    );
  }

  if (containsAny(text, ["wifi", "wi-fi", "internet"])) {
    return reply(
      "wifi",
      "Yes. Free Wi-Fi is listed among the confirmed hotel amenities.",
      [actions.booking],
    );
  }

  if (containsAny(text, ["breakfast", "vegetarian", "veg food", "morning meal"])) {
    return reply(
      "breakfast",
      "Tejjora lists daily breakfast and a vegetarian breakfast option. Exact menu items, timings and final inclusions should be confirmed with the hotel for your stay.",
      [actions.restaurant, actions.booking],
    );
  }

  if (containsAny(text, ["restaurant", "dining", "dinner", "food", "meal", "table"])) {
    return reply(
      "restaurant",
      `${restaurant.positioning} Tejjora has an on-site restaurant, and breakfast is listed as available. Restaurant timings, menu and table availability are not yet confirmed in the website data.`,
      [actions.restaurant, actions.whatsapp],
    );
  }

  if (containsAny(text, ["amenities", "facility", "facilities", "what do you have", "features"])) {
    return reply(
      "amenities",
      `Confirmed amenities currently include ${amenityLabels}. Room-specific details can vary, so the hotel should confirm anything essential to your stay.`,
      [actions.rooms, actions.whatsapp],
    );
  }

  if (containsAny(text, ["virtual", "360", "tour", "see room", "look around"])) {
    return reply(
      "virtual-tour",
      "You can open Tejjora's virtual-tour experience from the site. The viewer architecture is designed for hotel and room scenes; final spherical panorama coverage depends on the available 360 photography.",
      [actions.tour, actions.rooms],
    );
  }

  const igp = nearbyPlaces.find((place) => place.id === "igp");
  if (containsAny(text, ["indira gandhi", "igp", "pratishthan"])) {
    return reply(
      "directions-igp",
      "Indira Gandhi Pratishthan is one of the nearby business/event destinations highlighted by Tejjora. I will not invent a live travel time; open the route for current directions.",
      [
        { label: "Route to IGP", href: mapsDirections(igp?.mapsQuery ?? "Indira Gandhi Pratishthan Lucknow"), external: true },
        actions.location,
      ],
    );
  }

  const airport = nearbyPlaces.find((place) => place.id === "airport");
  if (containsAny(text, ["airport", "flight", "pickup", "pick up"])) {
    return reply(
      "airport",
      "For an airport arrival, Plan My Stay can include an airport-pickup request. Pickup availability and pricing are confirmed by the hotel, and live travel time should be checked in Maps.",
      [
        actions.planner,
        { label: "Airport route", href: mapsDirections(airport?.mapsQuery ?? "Chaudhary Charan Singh International Airport Lucknow"), external: true },
      ],
    );
  }

  const railway = nearbyPlaces.find((place) => place.id === "railway");
  if (containsAny(text, ["railway", "station", "train"])) {
    return reply(
      "railway",
      "Tejjora's stay planner supports railway arrivals. I will not guess a live journey time; use the route link for current directions.",
      [
        actions.planner,
        { label: "Railway route", href: mapsDirections(railway?.mapsQuery ?? "Lucknow Junction Railway Station"), external: true },
      ],
    );
  }

  const mall = nearbyPlaces.find((place) => place.id === "singapore-mall");
  if (containsAny(text, ["singapore mall", "shopping", "mall"])) {
    return reply(
      "nearby-shopping",
      "Singapore Mall is one of the nearby places highlighted on the Tejjora website. For current route conditions, open directions rather than relying on a fixed travel time.",
      [
        { label: "Route to Singapore Mall", href: mapsDirections(mall?.mapsQuery ?? "Singapore Mall Lucknow"), external: true },
        actions.location,
      ],
    );
  }

  const memorial = nearbyPlaces.find((place) => place.id === "ambedkar-memorial");
  if (containsAny(text, ["ambedkar", "memorial", "sightseeing", "nearby", "explore lucknow"])) {
    return reply(
      "nearby",
      "Tejjora highlights nearby Lucknow destinations including Dr. B. R. Ambedkar Memorial, Singapore Mall and Indira Gandhi Pratishthan. Use the location section for routes; live journey times are not stored on the site.",
      [
        { label: "Route to the memorial", href: mapsDirections(memorial?.mapsQuery ?? "Dr B R Ambedkar Memorial Lucknow"), external: true },
        actions.location,
      ],
    );
  }

  if (containsAny(text, ["address", "where are you", "where is", "location", "gomti nagar", "vikalp khand", "directions", "reach hotel", "navigate"])) {
    return reply(
      "location",
      `Tejjora Lake View is at ${fullAddress}. The location section can open current directions from your device; I will not estimate live traffic or travel time.`,
      [actions.location, { label: "Open hotel route", href: mapsDirections(fullAddress), external: true }],
    );
  }

  if (containsAny(text, ["phone", "call", "contact", "whatsapp", "number", "talk to hotel", "reception"])) {
    return reply(
      "contact",
      `You can contact Tejjora Lake View on ${hotel.phoneDisplay}. WhatsApp is also available on the same hotel number.`,
      [actions.whatsapp, actions.call],
    );
  }

  if (containsAny(text, ["plan my stay", "plan stay", "business trip", "family trip", "event trip", "city break", "short stay"])) {
    return reply(
      "planner",
      "Plan My Stay can suggest a room category and build a simple arrival/stay plan from your trip purpose, arrival mode, dates, guests and preferences. It is guidance, not a live availability decision.",
      [actions.planner, actions.booking],
    );
  }

  return reply(
    "fallback",
    "I do not have a confirmed answer for that in Tejjora's current hotel information, so I would rather not guess. You can ask the hotel directly, or use Plan My Stay for room and arrival guidance.",
    [actions.whatsapp, actions.planner, actions.call],
  );
}
