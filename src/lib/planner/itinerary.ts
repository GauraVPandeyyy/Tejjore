import { nearbyPlaces } from "@/data/nearby";
import type { PlanMyStayInput, PlanMyStayResult, TripPurpose } from "@/types/planner";

/**
 * A day-by-day suggested rhythm for the stay the planner describes. It is built only from facts the
 * hotel has verified: a front desk open around the clock, the restaurant (breakfast, Indian and Chinese
 * mains, biryani, desserts), room service, free private parking, and the named nearby places (which
 * open live directions in Google Maps). It never states opening hours, travel times or prices, and it
 * says "suggested" because it is a prompt for the trip, not a schedule the hotel promises.
 */
export type ItineraryPart = "Morning" | "Afternoon" | "Evening";
export type ItineraryBlock = {
  part: ItineraryPart;
  title: string;
  copy: string;
  link?: { href: string; label: string; external?: boolean };
};
export type ItineraryDay = {
  /** 1-based position in the shown days. */
  number: number;
  kind: "arrival" | "stay" | "departure";
  /** ISO date when the trip has dates, otherwise null (a sample rhythm). */
  date: string | null;
  heading: string;
  blocks: ItineraryBlock[];
};

/** The most days shown; a longer stay repeats the "a day in Lucknow" rhythm, so more cards add nothing. */
export const MAX_ITINERARY_DAYS = 5;

const mapsLink = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

function place(id: string) {
  return nearbyPlaces.find((item) => item.id === id);
}

function placeBlock(id: string, part: ItineraryPart, lead: string): ItineraryBlock | null {
  const found = place(id);
  if (!found) return null;
  return { part, title: found.name, copy: `${lead} Open live directions from the hotel before you set off.`, link: { href: mapsLink(found.mapsQuery), label: "See it in Maps", external: true } };
}

/** What fills the afternoon of a full day, by the kind of trip. */
function afternoonFor(purpose: TripPurpose, destination: string): ItineraryBlock {
  const named = destination.trim();
  if (named) {
    return { part: "Afternoon", title: named, copy: `The place you said matters most. Check live directions from the hotel and leave a little room around it.`, link: { href: mapsLink(`${named} Lucknow`), label: "Directions", external: true } };
  }
  const options: Record<TripPurpose, ItineraryBlock | null> = {
    couple: placeBlock("ambedkar-memorial", "Afternoon", "A landmark in Lucknow to wander slowly."),
    family: placeBlock("singapore-mall", "Afternoon", "A shopping stop that keeps everyone in one place."),
    business: placeBlock("igp", "Afternoon", "A business and events venue near the hotel."),
    weekend: placeBlock("ambedkar-memorial", "Afternoon", "A landmark in Lucknow for an easy afternoon."),
    celebration: placeBlock("singapore-mall", "Afternoon", "Somewhere to look for something for the occasion."),
    solo: placeBlock("singapore-mall", "Afternoon", "A simple outing with no schedule attached."),
  };
  return options[purpose] ?? { part: "Afternoon", title: "Lucknow at your pace", copy: "Use live routes for shopping, business or sightseeing rather than fixed travel-time promises." };
}

function eveningFor(purpose: TripPurpose): ItineraryBlock {
  const dinner: Record<TripPurpose, string> = {
    couple: "Dinner at the hotel’s restaurant, then an unhurried evening.",
    family: "Dinner together at the restaurant, or room service if the day has been long.",
    business: "Dinner at the restaurant, or room service and a quiet desk.",
    weekend: "Dinner at the restaurant and an early, easy night.",
    celebration: "Dinner at the restaurant — talk to the hotel about anything you would like arranged.",
    solo: "Dinner at the restaurant or room service, whichever suits the day.",
  };
  return { part: "Evening", title: "Back at the hotel", copy: dinner[purpose], link: { href: "/dining", label: "The menu" } };
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  return Math.round((Date.parse(`${checkOut}T12:00:00Z`) - Date.parse(`${checkIn}T12:00:00Z`)) / 86_400_000);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildItinerary(input: PlanMyStayInput, result: PlanMyStayResult): ItineraryDay[] {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const dated = nights >= 1;
  // Without dates a three-day sample is shown, so the plan is still useful before dates are chosen.
  const totalDays = dated ? nights + 1 : 3;
  const shown = Math.min(totalDays, MAX_ITINERARY_DAYS);
  const breakfastNote = input.preferences.breakfast ? "Your plan carries the breakfast rate into booking." : "Breakfast is served at the hotel’s restaurant.";
  const days: ItineraryDay[] = [];

  for (let index = 0; index < shown; index += 1) {
    const isFirst = index === 0;
    const isLast = index === shown - 1 && shown > 1;
    // The last shown day is always the departure, even when the middle of a long stay is summarised.
    const date = dated ? addDays(input.checkIn, isLast ? nights : index) : null;

    if (isFirst) {
      days.push({
        number: 1,
        kind: "arrival",
        date,
        heading: "Arrive and settle in",
        blocks: [
          { part: "Afternoon", title: "The road to Vikalp Khand", copy: result.arrivalGuidance, link: { href: "/location", label: "Getting here" } },
          { part: "Afternoon", title: "Straight to the desk", copy: `The front desk is open around the clock${input.preferences.earlyCheckIn ? ", and your early check-in request travels with the booking for the hotel to confirm" : ""}.` },
          eveningFor(input.purpose),
        ],
      });
    } else if (isLast) {
      days.push({
        number: shown,
        kind: "departure",
        date,
        heading: "An easy goodbye",
        blocks: [
          { part: "Morning", title: "Breakfast, then check-out", copy: `${breakfastNote} ${input.preferences.lateCheckout ? "Your late check-out request goes to the hotel with the booking, subject to availability." : "Ask the front desk if you need a hand with luggage or a cab."}` },
          { part: "Afternoon", title: "Your booking, any time", copy: "Look up or change your booking with its reference and registered mobile.", link: { href: "/manage-booking", label: "Manage booking" } },
        ],
      });
    } else {
      days.push({
        number: index + 1,
        kind: "stay",
        date,
        heading: index === 1 ? "A day in Lucknow" : "Another unhurried day",
        blocks: [
          { part: "Morning", title: "Breakfast at the hotel", copy: breakfastNote, link: { href: "/dining#breakfast", label: "Breakfast menu" } },
          afternoonFor(input.purpose, index === 1 ? input.destination : ""),
          eveningFor(input.purpose),
        ],
      });
    }
  }
  return days;
}
