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
    eyebrow: "FIRST LIGHT",
    headline: "The lake wakes first.",
    copy: "A quiet beginning above Gomti Nagar.",
    shortNote: "A softer start to the day.",
    desktopAsset: assets.terraceView.morning,
    mobileAsset: assets.terraceView.morning,
    tone: "mist",
  },
  {
    id: "day",
    label: "Day",
    timeLabel: "12:30",
    eyebrow: "MIDDAY",
    headline: "Light across the water.",
    copy: "The terrace opens into a brighter side of the city.",
    shortNote: "The city in full light.",
    desktopAsset: assets.terraceView.day,
    mobileAsset: assets.terraceView.day,
    tone: "clear",
  },
  {
    id: "evening",
    label: "Evening",
    timeLabel: "17:45",
    eyebrow: "GOLDEN HOUR",
    headline: "The city softens at the edge.",
    copy: "Golden hour becomes the transition back to Tejjora.",
    shortNote: "A slower return to the hotel.",
    desktopAsset: assets.terraceView.evening,
    mobileAsset: assets.terraceView.evening,
    tone: "golden",
  },
  {
    id: "night",
    label: "Night",
    timeLabel: "20:30",
    eyebrow: "AFTER DARK",
    headline: "After dark, the view stays.",
    copy: "A calmer final frame above the movement of Lucknow.",
    shortNote: "The lake, away from the rush.",
    desktopAsset: assets.terraceView.night,
    mobileAsset: assets.terraceView.night,
    tone: "night",
  },
];
