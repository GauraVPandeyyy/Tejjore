export type RoomId = "deluxe" | "super-deluxe" | "premium";

export type RoomAmenity = {
  id: string;
  label: string;
};

export type Room = {
  id: RoomId;
  name: string;
  shortDescription: string;
  longDescription: string;
  startingPrice: number | null;
  currency: "INR";
  maxGuests: number | null;
  bedType: string | null;
  sizeSqFt: number | null;
  view: string | null;
  amenities: RoomAmenity[];
  imageSet: string[];
  panorama: string | null;
  video: string | null;
};

export type TerraceTimeState = "morning" | "day" | "evening" | "night";

export type TerraceViewState = {
  id: string;
  label: string;
  timeLabel: string;
  eyebrow: string;
  headline: string;
  copy: string;
  shortNote: string;
  desktopAsset: string;
  mobileAsset: string;
  tone: "mist" | "clear" | "golden" | "night";
};
