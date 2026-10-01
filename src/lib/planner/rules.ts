import { nearbyPlaces } from "@/data/nearby";
import type { PlanMyStayInput, PlanMyStayResult, StayPlanSuggestion } from "@/types/planner";
import type { RoomId } from "@/types/hotel";

const roomByPurpose: Record<PlanMyStayInput["purpose"], RoomId> = {
  couple: "premium",
  family: "premium",
  business: "super-deluxe",
  weekend: "premium",
  celebration: "premium",
  solo: "deluxe",
};

const roomReasons: Record<PlanMyStayInput["purpose"], string> = {
  couple: "Premium is the strongest starting point when the room and the pace of the stay matter as much as the itinerary.",
  family: "Premium is a useful starting point for a family enquiry; the hotel should confirm the right room mix and occupancy for your group.",
  business: "Super Deluxe balances a more generous room experience with the practical Wi-Fi and work-desk essentials shared across the collection.",
  weekend: "Premium gives a short leisure stay the most elevated starting point in the current room collection.",
  celebration: "Premium is the natural first room to consider when the stay is part of the occasion itself.",
  solo: "Deluxe keeps a solo Lucknow stay simple, comfortable and cost-conscious without overcomplicating the choice.",
};

const arrivalGuidance: Record<PlanMyStayInput["arrival"], string> = {
  airport: "Use live Google Maps directions from the airport. If pickup is selected, the hotel must still confirm availability and price.",
  railway: "Open live directions from your exact railway arrival point rather than relying on a fixed travel-time estimate.",
  driving: "Route directly to Tejjora's Vikalp Khand address. Free private parking is listed among the hotel's known amenities.",
  local: "Use live directions from your current location when you are ready to leave for Tejjora.",
};

function nearbyForPurpose(purpose: PlanMyStayInput["purpose"]) {
  const ids: string[] = [];
  if (purpose === "business" || purpose === "celebration") ids.push("igp");
  if (["couple","family","weekend"].includes(purpose)) ids.push("ambedkar-memorial", "singapore-mall");
  if (purpose === "solo") ids.push("singapore-mall");
  return ids.filter((id) => nearbyPlaces.some((place) => place.id === id));
}

function buildSuggestions(input: PlanMyStayInput): StayPlanSuggestion[] {
  const tone: Record<PlanMyStayInput["purpose"], string> = {
    couple: "Leave room in the itinerary for dinner, the terrace and a slower morning.",
    family: "Share the group size and practical room requirements early so the hotel can confirm the right setup.",
    business: "Keep the room as a reliable base around meetings rather than adding unnecessary travel between tasks.",
    weekend: "Balance one or two Lucknow plans with enough unstructured time back at the hotel.",
    celebration: "Coordinate dining and special requests directly so the room is not the only part of the occasion.",
    solo: "Keep the stay light: confirm the room, route and only the add-ons you actually need.",
  };
  return [
    { id: "arrival", label: "ARRIVAL", title: "Know the route before you leave.", copy: arrivalGuidance[input.arrival] },
    { id: "stay", label: "THE STAY", title: "Make the room fit the trip.", copy: tone[input.purpose] },
    { id: "city", label: "IN LUCKNOW", title: input.destination.trim() || "Keep the city within reach.", copy: input.destination.trim() ? `Keep ${input.destination.trim()} in the plan and check live directions before leaving the hotel.` : "Use live routes for business, shopping and sightseeing rather than fixed travel-time promises." },
  ];
}

export function createStayPlan(input: PlanMyStayInput): PlanMyStayResult {
  const addonIds: string[] = [];
  if (input.preferences.airportPickup) addonIds.push("airport-pickup");
  if (input.preferences.earlyCheckIn) addonIds.push("early-checkin");
  if (input.preferences.lateCheckout) addonIds.push("late-checkout");
  const partySize = input.adults + input.children;
  return {
    recommendedRoomId: roomByPurpose[input.purpose],
    roomReason: roomReasons[input.purpose],
    ratePlanId: input.preferences.breakfast ? "breakfast" : null,
    addonIds,
    arrivalGuidance: arrivalGuidance[input.arrival],
    fitNote: partySize > 2 ? "For this group size, treat the recommendation as a starting point. Tejjora should confirm the final room mix and occupancy." : "Use this recommendation as a starting point, then check live availability and the configured rate.",
    suggestions: buildSuggestions(input),
    nearbyPlaceIds: nearbyForPurpose(input.purpose),
  };
}
