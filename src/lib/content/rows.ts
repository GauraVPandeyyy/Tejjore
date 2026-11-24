import type { FactStatus, FactValue } from "@/data/propertyFacts";

/**
 * Row shapes, keyed exactly like the database columns (db/migrations/003, 004). Content queries
 * select into these shapes (dates as YYYY-MM-DD text, timestamps as ISO text), and the catalog
 * (src/data → rows) produces the same shapes, so database rows and fallback rows go through one
 * mapper per domain.
 */
export type RoomRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  body: string | null;
  size_sqft: number | null;
  bed_type: string | null;
  max_adults: number | null;
  max_children: number | null;
  view: string | null;
  amenities: Array<{ id: string; label: string } | string>;
  sort_order: number;
  published: boolean;
};

export type MediaAssetRow = {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  blur_data: string | null;
  alt: string;
  credit: string | null;
  provenance: string;
  licence: string | null;
  source_url: string | null;
  notes?: string | null;
};

export type EntityMediaRow = {
  entity_type: string;
  entity_id: string;
  media_id: string;
  role: string;
  sort_order: number;
  layout_hint: string | null;
};

/** entity_media joined with its media_assets row. */
export type EntityMediaJoinRow = EntityMediaRow & Omit<MediaAssetRow, "notes">;

export type PropertyFactRow = {
  key: string;
  value: FactValue;
  status: FactStatus;
  source: string;
  public: boolean;
  notes: string | null;
};

export type OfferRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  terms: string | null;
  valid_from: string | null;
  valid_to: string | null;
  room_ids: string[];
  adjustment_type: string | null;
  adjustment_value: number | string | null;
  promo_code: string | null;
  is_demo: boolean;
  sort_order: number;
  published: boolean;
};

export type FaqRow = {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  published: boolean;
  approved_by: string | null;
  approved_at: string | null;
};

export type PolicyRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  sort_order: number;
  published: boolean;
  approved_by: string | null;
  approved_at: string | null;
};

export type TestimonialRow = {
  id: string;
  author_display: string;
  text: string;
  rating: number | null;
  source: string;
  source_url: string | null;
  review_date: string | null;
  consent: boolean;
  sort_order: number;
  published: boolean;
};

export type AnnouncementRow = {
  id: string;
  text: string;
  link: string | null;
  publish_from: string | null;
  publish_until: string | null;
  published: boolean;
};

export type SeoPageRow = {
  path: string;
  title: string | null;
  description: string | null;
  og_media_id: string | null;
  noindex: boolean;
};

export type TourSceneRow = {
  id: string;
  slug: string;
  label: string;
  eyebrow: string | null;
  description: string | null;
  media_id: string | null;
  panorama_path: string | null;
  panorama_width: number | null;
  fallback_image_path: string | null;
  initial_yaw: number;
  initial_pitch: number;
  initial_fov: number;
  ready: boolean;
  provenance: string;
  source_note: string | null;
  sort_order: number;
};

export type TourHotspotRow = {
  id: string;
  scene_id: string;
  yaw: number;
  pitch: number;
  label: string;
  target_type: string;
  target_value: string;
  sort_order: number;
};

export type AiKnowledgeRow = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  public: boolean;
  approved: boolean;
};

export type MenuCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  note: string | null;
  published: boolean;
};

export type MenuItemRow = {
  id: string;
  category_id: string;
  name: string;
  source_name: string | null;
  description: string | null;
  portion: string | null;
  variants: string[];
  price_full: number | string;
  price_half: number | string | null;
  contains_egg: boolean;
  available: boolean;
  signature: boolean;
  sort_order: number;
  published: boolean;
  review_note: string | null;
};

export type RestaurantSettingsRow = {
  id: number;
  public_name: string | null;
  opening_time: string | null;
  prep_minutes_min: number | null;
  prep_minutes_max: number | null;
  service_charge_pct: number | string | null;
  taxes_note: string | null;
  allergy_note: string | null;
  no_cancel_note: string | null;
  price_change_note: string | null;
  service_charge_note: string | null;
  ordering_enabled: boolean;
  room_delivery_enabled: boolean | null;
};
