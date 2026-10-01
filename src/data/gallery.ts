import { assets } from "./assets";

export type GalleryCategory = "All" | "Stay" | "Hotel" | "Dining";

export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  category: Exclude<GalleryCategory, "All">;
  shape: "landscape" | "portrait" | "wide" | "square";
};

export const galleryCategories: GalleryCategory[] = ["All", "Stay", "Hotel", "Dining"];

export const galleryItems: GalleryItem[] = [
  { id: "hotel-01", src: assets.hero.image, alt: "Tejjora Lake View exterior in Gomti Nagar", category: "Hotel", shape: "wide" },
  { id: "hotel-02", src: assets.hero.alternateImages[0], alt: "Front exterior of Tejjora Lake View", category: "Hotel", shape: "portrait" },
  { id: "hotel-03", src: assets.lobby[0], alt: "Lobby at Tejjora Lake View", category: "Hotel", shape: "landscape" },
  { id: "hotel-04", src: assets.lobby[2], alt: "Reception at Tejjora Lake View", category: "Hotel", shape: "portrait" },
  { id: "hotel-05", src: assets.lobby[3], alt: "Arrival area at Tejjora Lake View", category: "Hotel", shape: "square" },

  { id: "stay-01", src: assets.rooms.deluxe[0], alt: "Deluxe Room at Tejjora Lake View", category: "Stay", shape: "landscape" },
  { id: "stay-02", src: assets.rooms.deluxe[1], alt: "Deluxe Room bed detail at Tejjora Lake View", category: "Stay", shape: "portrait" },
  { id: "stay-03", src: assets.rooms.deluxe[3], alt: "Deluxe Room reverse view at Tejjora Lake View", category: "Stay", shape: "wide" },
  { id: "stay-04", src: assets.rooms.superDeluxe[0], alt: "Super Deluxe Room at Tejjora Lake View", category: "Stay", shape: "portrait" },
  { id: "stay-05", src: assets.rooms.superDeluxe[2], alt: "Wide Super Deluxe Room at Tejjora Lake View", category: "Stay", shape: "landscape" },
  { id: "stay-06", src: assets.rooms.superDeluxe[3], alt: "Super Deluxe Room bed at Tejjora Lake View", category: "Stay", shape: "square" },
  { id: "stay-07", src: assets.rooms.premium[0], alt: "Premium Room at Tejjora Lake View", category: "Stay", shape: "wide" },
  { id: "stay-08", src: assets.rooms.premium[2], alt: "Premium Room bed at Tejjora Lake View", category: "Stay", shape: "portrait" },
  { id: "stay-09", src: assets.rooms.premium[3], alt: "Premium Room angle at Tejjora Lake View", category: "Stay", shape: "landscape" },
  { id: "stay-10", src: assets.rooms.premium[5], alt: "Premium Room window and curtain detail at Tejjora Lake View", category: "Stay", shape: "portrait" },

  { id: "dine-01", src: assets.restaurant[0], alt: "Dining room at Tejjora Lake View", category: "Dining", shape: "wide" },
  { id: "dine-02", src: assets.restaurant[1], alt: "Dining room depth view at Tejjora Lake View", category: "Dining", shape: "portrait" },
  { id: "dine-03", src: assets.restaurant[2], alt: "Restaurant seating at Tejjora Lake View", category: "Dining", shape: "square" },
  { id: "dine-04", src: assets.restaurant[3], alt: "Editorial restaurant view at Tejjora Lake View", category: "Dining", shape: "landscape" },
  { id: "dine-05", src: assets.restaurant[4], alt: "Restaurant perspective at Tejjora Lake View", category: "Dining", shape: "portrait" },
  { id: "dine-06", src: assets.restaurant[5], alt: "Daylight in the Tejjora dining room", category: "Dining", shape: "landscape" },
  { id: "dine-07", src: assets.restaurant[6], alt: "Wide restaurant view at Tejjora Lake View", category: "Dining", shape: "wide" },
];
