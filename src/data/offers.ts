import { assets } from "./assets";

/**
 * DEMO CONTENT: promotional concepts for layout/product testing.
 * Replace, disable or edit before production if the hotel does not offer them.
 */
export const offers = [
  {
    id: "weekend-by-the-lake",
    label: "Weekend",
    title: "A slower weekend in Gomti Nagar",
    copy: "A two-night city reset built around an unhurried arrival, breakfast and time by the terrace view.",
    image: assets.rooms.premium[0],
    inclusions: ["Two-night stay concept", "Breakfast preference", "Late checkout request"],
    demo: true,
  },
  {
    id: "business-base",
    label: "Business",
    title: "A practical base for the working week",
    copy: "For guests who want a calmer room, a work desk, breakfast and straightforward access to Gomti Nagar.",
    image: assets.lobby[1],
    inclusions: ["Business-stay concept", "Breakfast preference", "Direct hotel assistance"],
    demo: true,
  },
  {
    id: "celebration-stay",
    label: "Celebration",
    title: "A stay worth marking",
    copy: "A flexible celebration concept with room, dining and decoration requests coordinated directly with the hotel.",
    image: assets.restaurant[2],
    inclusions: ["Celebration-stay concept", "Dining enquiry", "Decoration request"],
    demo: true,
  },
] as const;
