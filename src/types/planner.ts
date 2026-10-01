import type { RoomId } from "./hotel";

export type TripPurpose = "couple" | "family" | "business" | "weekend" | "celebration" | "solo";
export type ArrivalSource = "airport" | "railway" | "driving" | "local";

export type StayPreferences = {
  breakfast: boolean;
  airportPickup: boolean;
  earlyCheckIn: boolean;
  lateCheckout: boolean;
};

export type PlanMyStayInput = {
  purpose: TripPurpose;
  arrival: ArrivalSource;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  destination: string;
  preferences: StayPreferences;
};

export type StayPlanSuggestion = {
  id: string;
  label: string;
  title: string;
  copy: string;
};

export type PlanMyStayResult = {
  recommendedRoomId: RoomId;
  roomReason: string;
  ratePlanId: "breakfast" | null;
  addonIds: string[];
  arrivalGuidance: string;
  fitNote: string;
  suggestions: StayPlanSuggestion[];
  nearbyPlaceIds: string[];
};
