import type { Room } from "@/types/hotel";
import { assets } from "./assets";
import { commerceConfig } from "./commerce";

const sharedAmenities = [
  { id: "air-conditioning", label: "Air conditioning" },
  { id: "wifi", label: "Complimentary Wi-Fi" },
  { id: "tv", label: "Flat-screen TV" },
  { id: "work-desk", label: "Work desk" },
  { id: "private-bathroom", label: "Private bathroom" },
];

export const rooms: Room[] = [
  {
    id: "deluxe",
    name: "Deluxe Room",
    shortDescription: "A calm, well-considered base for short city stays and uncomplicated business trips.",
    longDescription: "The Deluxe Room is positioned as Tejjora's most straightforward stay: comfortable, uncluttered and designed around the things that matter after a long day in Lucknow — a private bathroom, air conditioning, reliable Wi-Fi, a work surface and space to switch off.",
    startingPrice: commerceConfig.roomRates.deluxe,
    currency: "INR",
    maxGuests: null,
    bedType: null,
    sizeSqFt: null,
    view: null,
    amenities: sharedAmenities,
    imageSet: [...assets.rooms.deluxe],
    panorama: assets.panoramas.deluxe,
    video: assets.videos.deluxe,
  },
  {
    id: "super-deluxe",
    name: "Super Deluxe Room",
    shortDescription: "A room for guests who want a little more breathing room around the stay.",
    longDescription: "Super Deluxe sits between practicality and a more relaxed sense of space. It keeps the same useful Tejjora essentials while giving longer stays, couples and work-focused guests a more generous room experience.",
    startingPrice: commerceConfig.roomRates["super-deluxe"],
    currency: "INR",
    maxGuests: null,
    bedType: null,
    sizeSqFt: null,
    view: null,
    amenities: sharedAmenities,
    imageSet: [...assets.rooms.superDeluxe],
    panorama: assets.panoramas.superDeluxe,
    video: assets.videos.superDeluxe,
  },
  {
    id: "premium",
    name: "Premium Room",
    shortDescription: "The most elevated expression of the current Tejjora room collection.",
    longDescription: "Premium is the room to start with when the stay itself matters as much as the itinerary. The category is presented with Tejjora's most elevated room imagery and is intended for guests choosing the hotel for more than a quick overnight stop.",
    startingPrice: commerceConfig.roomRates.premium,
    currency: "INR",
    maxGuests: null,
    bedType: null,
    sizeSqFt: null,
    view: null,
    amenities: sharedAmenities,
    imageSet: [...assets.rooms.premium],
    panorama: assets.panoramas.premium,
    video: assets.videos.premium,
  },
];
