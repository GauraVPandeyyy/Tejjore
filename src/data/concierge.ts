import type { IconName } from "@/components/ui/Icon";

export type ConciergeQuickAction = {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  prompt: string;
  /** Opens the inline date tool instead of sending a message. */
  dates?: boolean;
  /** Variant used when the chat was opened about a specific room ({topic} = its name). */
  topical?: string;
  topicalLabel?: string;
};

/** The six starting points on Mezbaan's welcome screen. Each maps to a grounded answer. */
export const conciergeQuickActions: ConciergeQuickAction[] = [
  { id: "rates", label: "Rooms & rates", hint: "Live direct rates", icon: "key", prompt: "What are the current room rates?" },
  { id: "dates", label: "Check my dates", hint: "Exact price for a stay", icon: "calendar", prompt: "I want to check room availability.", dates: true, topicalLabel: "Dates for the {topic}" },
  { id: "compare", label: "Compare rooms", hint: "Deluxe, Super Deluxe, Premium", icon: "bed", prompt: "Compare the three room categories." },
  { id: "dining", label: "Dining & menu", hint: "Sections and dishes", icon: "dish", prompt: "Tell me about the restaurant and the menu." },
  { id: "arrive", label: "Getting here", hint: "Address and live routes", icon: "compass", prompt: "How do I get to Tejjora Lake View?" },
  { id: "tour", label: "360° tour", hint: "Walk through the hotel", icon: "orbit", prompt: "Can I see the hotel virtually?" },
];

type FollowUp = { id: string; label: string; prompt: string; dates?: boolean };

const rates: FollowUp = { id: "rates", label: "Current room rates", prompt: "What are the current room rates?" };
const dates: FollowUp = { id: "dates", label: "Check availability", prompt: "I want to check room availability.", dates: true };
const compare: FollowUp = { id: "compare", label: "Compare rooms", prompt: "Compare the three room categories." };
const menu: FollowUp = { id: "menu", label: "The menu", prompt: "Tell me about the restaurant and the menu." };
const breakfast: FollowUp = { id: "breakfast", label: "Breakfast", prompt: "What breakfast is available?" };
const directions: FollowUp = { id: "arrive", label: "Getting here", prompt: "How do I get to Tejjora Lake View?" };
const offers: FollowUp = { id: "offers", label: "Any offers?", prompt: "Are there any offers right now?" };
const tour: FollowUp = { id: "tour", label: "360° tour", prompt: "Can I see the hotel virtually?" };
const contact: FollowUp = { id: "contact", label: "Talk to the hotel", prompt: "How can I contact the hotel?" };

/** Next steps offered under an answer, chosen by the answer's intent. */
export const conciergeFollowUps: Record<string, FollowUp[]> = {
  default: [rates, dates, menu, directions],
  "live-rates": [dates, compare, offers],
  "live-rates-unavailable": [dates, contact],
  "live-availability": [compare, menu, directions],
  "availability-development": [compare, menu, directions],
  "availability-none": [dates, contact],
  "availability-needs-dates": [dates, rates],
  "room-comparison": [rates, dates, tour],
  rooms: [rates, dates, tour],
  restaurant: [breakfast, rates, directions],
  breakfast: [menu, rates, dates],
  "menu-dishes": [menu, breakfast, dates],
  location: [tour, rates, contact],
  offers: [dates, rates],
  "offers-none": [dates, compare],
  fallback: [contact, rates, menu],
};

export const conciergeGuardrailCopy =
  "Rates and availability come live from the hotel’s booking system. Anything not confirmed by the hotel is never guessed.";
