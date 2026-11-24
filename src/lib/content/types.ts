import type { Room } from "@/types/hotel";
import type { RoomRateCard } from "@/lib/booking/rateCard";
import type { FactStatus, FactValue } from "@/data/propertyFacts";

export type { FactStatus, FactValue };

/** Where a content read came from. `fallback` = the TypeScript data in src/data (DB not configured, unreachable, unmigrated or unseeded). */
export type ContentSource = "database" | "fallback";

export type ContentResult<T> = {
  data: T;
  source: ContentSource;
};

export type MediaProvenance = "tejjora" | "licensed" | "illustrative" | "placeholder";
export type MediaLayoutHint = "landscape" | "portrait" | "wide" | "square";
export type MediaEntityType = "room" | "gallery" | "restaurant" | "offer" | "tour" | "home" | "page";

export type MediaAsset = {
  id: string;
  /** Site-relative path (under public/images) or a Supabase Storage public URL for admin uploads. */
  src: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  alt: string;
  credit: string | null;
  provenance: MediaProvenance;
  licence: string | null;
  sourceUrl: string | null;
};

export type EntityMediaItem = {
  entityType: MediaEntityType;
  entityId: string;
  role: string;
  sortOrder: number;
  layoutHint: MediaLayoutHint | null;
  media: MediaAsset;
};

/**
 * Room content plus its live price. `startingPrice` mirrors `rate.fromRate`; both come from the
 * admin booking configuration (see lib/booking/rateCard.ts) and are null when it cannot be read.
 */
export type RoomContent = Room & {
  rate: RoomRateCard | null;
  slug: string;
  maxAdults: number | null;
  maxChildren: number | null;
  sortOrder: number;
};

export type PropertyFact = {
  key: string;
  value: FactValue;
  status: FactStatus;
  source: string;
  public: boolean;
};

export type PublicFacts = {
  get(key: string): FactValue | undefined;
  text(key: string): string | undefined;
  entries: Array<{ key: string; value: FactValue }>;
};

export type Offer = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  terms: string | null;
  validFrom: string | null;
  validTo: string | null;
  roomIds: string[];
  adjustmentType: "percent" | "fixed" | null;
  adjustmentValue: number | null;
  promoCode: string | null;
  isDemo: boolean;
  published: boolean;
};

export type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  published: boolean;
};

export type Policy = {
  id: string;
  slug: string;
  title: string;
  body: string;
  published: boolean;
  approvedAt: string | null;
};

export type TestimonialSource = "google" | "tripadvisor" | "direct" | "demo";

export type Testimonial = {
  id: string;
  authorDisplay: string;
  text: string;
  rating: number | null;
  source: TestimonialSource;
  sourceUrl: string | null;
  reviewDate: string | null;
  consent: boolean;
  published: boolean;
};

export type Announcement = {
  id: string;
  text: string;
  link: string | null;
  publishFrom: string | null;
  publishUntil: string | null;
  published: boolean;
};

export type SeoPage = {
  path: string;
  title: string | null;
  description: string | null;
  ogImage: MediaAsset | null;
  noindex: boolean;
};

export type TourHotspot = {
  id: string;
  yaw: number;
  pitch: number;
  label: string;
  targetType: "scene" | "room" | "booking" | "url";
  targetValue: string;
};

export type TourScene = {
  id: string;
  slug: string;
  label: string;
  eyebrow: string | null;
  description: string | null;
  panoramaPath: string | null;
  panoramaWidth: number | null;
  fallbackImagePath: string | null;
  initialView: { yaw: number; pitch: number; fov: number };
  ready: boolean;
  provenance: MediaProvenance;
  /** True only for Tejjora's own (or licensed) property media; demo/placeholder scenes must stay labelled. */
  isPropertyMedia: boolean;
  sourceNote: string | null;
  hotspots: TourHotspot[];
};

export type AiKnowledgeEntry = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  public: boolean;
  approved: boolean;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  sourceName: string | null;
  description: string | null;
  portion: string | null;
  variants: string[];
  priceFull: number;
  priceHalf: number | null;
  containsEgg: boolean;
  available: boolean;
  signature: boolean;
};

export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  note: string | null;
  items: MenuItem[];
};

export type RestaurantSettings = {
  publicName: string | null;
  openingTime: string | null;
  prepMinutesMin: number | null;
  prepMinutesMax: number | null;
  serviceChargePct: number | null;
  taxesNote: string | null;
  allergyNote: string | null;
  noCancelNote: string | null;
  priceChangeNote: string | null;
  serviceChargeNote: string | null;
  orderingEnabled: boolean;
  roomDeliveryEnabled: boolean | null;
};

export type GalleryCategoryName = "Stay" | "Hotel" | "Dining";

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  category: GalleryCategoryName;
  shape: MediaLayoutHint;
};
