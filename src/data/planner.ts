import type { ArrivalSource, TripPurpose } from "@/types/planner";

export const tripPurposeOptions: Array<{ id: TripPurpose; index: string; label: string; copy: string }> = [
  { id: "couple", index: "01", label: "Couple", copy: "A quieter stay with room to slow down, dine in and spend time by the view." },
  { id: "family", index: "02", label: "Family", copy: "Keep rooms, dining, parking and practical requests easy to coordinate." },
  { id: "business", index: "03", label: "Business", copy: "A work-friendly base in Gomti Nagar with Wi-Fi, desk space and direct hotel help." },
  { id: "weekend", index: "04", label: "Weekend getaway", copy: "A short city reset with breakfast, Lucknow time and an unhurried return." },
  { id: "celebration", index: "05", label: "Celebration", copy: "Build around a room, dining and any special arrangement you want to discuss." },
  { id: "solo", index: "06", label: "Solo traveller", copy: "Simple, flexible and easy to manage without unnecessary planning steps." },
];

export const arrivalOptions: Array<{ id: ArrivalSource; index: string; label: string; copy: string }> = [
  { id: "airport", index: "01", label: "Airport", copy: "Route from Chaudhary Charan Singh International Airport." },
  { id: "railway", index: "02", label: "Railway", copy: "Route from your Lucknow railway arrival point." },
  { id: "driving", index: "03", label: "Driving", copy: "Drive directly to Vikalp Khand; parking is listed among hotel amenities." },
  { id: "local", index: "04", label: "Already in Lucknow", copy: "Use live directions from wherever you are." },
];

export const preferenceOptions = [
  { id: "breakfast", label: "Breakfast", copy: "Carry breakfast into the booking preference." },
  { id: "airportPickup", label: "Airport pickup", copy: "Ask Tejjora to confirm whether a pickup can be arranged." },
  { id: "earlyCheckIn", label: "Early check-in", copy: "Request an earlier arrival, subject to availability." },
  { id: "lateCheckout", label: "Late checkout", copy: "Request a later departure, subject to availability." },
] as const;
