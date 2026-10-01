import type { TerraceViewState } from "@/types/hotel";
import { assets } from "./assets";

/**
 * Signature homepage sequence.
 * On desktop this is designed as a scroll-linked terrace/lake-view story.
 * On mobile it becomes a lighter sequential experience to avoid over-pinning.
 * Real terrace photographs replace the placeholders later without changing component logic.
 */

export const terraceViewSequence: TerraceViewState[] = [
  {
    id: "morning",
    label: "Morning",
    timeLabel: "06:30",
    headline: "The lake wakes first.",
    copy: "A quiet beginning above Gomti Nagar.",
    asset: assets.terraceView.morning,
    tone: "mist",
  },
  {
    id: "day",
    label: "Day",
    timeLabel: "12:30",
    headline: "Light across the water.",
    copy: "The terrace opens into a brighter side of the city.",
    asset: assets.terraceView.day,
    tone: "clear",
  },
  {
    id: "evening",
    label: "Evening",
    timeLabel: "17:45",
    headline: "The city softens at the edge.",
    copy: "Golden hour becomes the transition back to Tejjora.",
    asset: assets.terraceView.evening,
    tone: "golden",
  },
  {
    id: "night",
    label: "Night",
    timeLabel: "20:30",
    headline: "After dark, the view stays.",
    copy: "A calmer final frame above the movement of Lucknow.",
    asset: assets.terraceView.night,
    tone: "night",
  },
];
/**
 * Editorial illustration of how a stay can flow through the day.
 * Times are narrative waypoints, not published service hours.
 */
export const dayAtTejjora = [
  {
    id: "morning",
    time: "07:30",
    label: "A quieter start",
    headline: "Breakfast before the city begins.",
    copy: "Start downstairs, then head into Gomti Nagar with the hotel behind you and the day ahead.",
    image: assets.food.breakfastHero,
    imageIsPlaceholder: true,
  },
  {
    id: "city",
    time: "09:30",
    label: "Into Gomti Nagar",
    headline: "Close to the movement, without living in it.",
    copy: "Business, meetings, shopping and the rest of Lucknow stay within easy reach from Vikalp Khand.",
    image: assets.hero.alternateImages[1],
    imageIsPlaceholder: false,
  },
  {
    id: "return",
    time: "17:45",
    label: "Back by the view",
    headline: "The pace changes when the light does.",
    copy: "Return to Tejjora as the terrace shifts into evening and the lake becomes the quieter half of the day.",
    image: assets.terraceView.evening,
    imageIsPlaceholder: true,
  },
  {
    id: "dinner",
    time: "20:00",
    label: "Dinner downstairs",
    headline: "One last move, without leaving the hotel.",
    copy: "The on-site restaurant keeps the end of the day simple, with direct assistance from the hotel team.",
    image: assets.restaurant[3],
    imageIsPlaceholder: false,
  },
] as const;

export const whyTejjora = [
  {
    id: "view",
    label: "The View",
    headline: "A stay with a horizon.",
    copy: "The terrace and lake-facing identity give Tejjora a sense of pause that is unusual for an urban stay.",
    image: assets.terraceView.day,
    imageIsPlaceholder: true,
  },
  {
    id: "location",
    label: "The City",
    headline: "Gomti Nagar stays close.",
    copy: "Vikalp Khand places the hotel inside one of Lucknow's most active business and residential districts.",
    image: assets.hero.image,
    imageIsPlaceholder: false,
  },
  {
    id: "table",
    label: "The Table",
    headline: "Breakfast to dinner, downstairs.",
    copy: "An on-site restaurant means the hotel can carry the day beyond the room without adding another journey.",
    image: assets.restaurant[0],
    imageIsPlaceholder: false,
  },
  {
    id: "scale",
    label: "The Scale",
    headline: "29 rooms. Three ways to stay.",
    copy: "The room collection stays easy to understand: Deluxe, Super Deluxe and Premium.",
    image: assets.rooms.premium[0],
    imageIsPlaceholder: false,
  },
  {
    id: "people",
    label: "The People",
    headline: "Direct help, day or night.",
    copy: "A 24-hour front desk and direct hotel contact keep questions, requests and arrival support close to the property.",
    image: assets.lobby[2],
    imageIsPlaceholder: false,
  },
] as const;
