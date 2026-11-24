import type { AdminPermission } from "@/lib/admin/permissions";

/**
 * Admin CMS resources: one definition per content table, shared by the server (validation and
 * SQL, src/lib/admin/cms/engine.ts) and the dashboard (generic list + form). Pure data, no
 * secrets. API field names are the database column names.
 *
 * The tables, constraints and publication rules come from Phase 2 (db/migrations/003–004); the
 * public getters in src/lib/content stay the only readers of public content.
 */
export type FieldKind =
  | "text" | "textarea" | "slug" | "select" | "url"
  | "int" | "number" | "bool" | "triBool"
  | "date" | "time" | "datetime"
  | "list" | "json" | "approval";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Text: max length. Numbers: max value. Lists: max items. */
  max?: number;
  min?: number;
  step?: number;
  options?: readonly string[];
  /** Options are the rows of another resource (key + title). */
  optionsFrom?: CmsResourceId;
  /** Set when the row is created, then fixed (stable ids and slugs). */
  createOnly?: boolean;
  /** Shown, never written by the form. */
  readOnly?: boolean;
  /** Field-level permission instead of the resource's manage permission (kitchen availability). */
  permission?: AdminPermission;
  /** url: also accept site-relative paths. */
  relative?: boolean;
  /** list/json storage. */
  db?: "jsonb" | "text[]";
  help?: string;
};

export type CmsResourceId =
  | "rooms" | "offers"
  | "facts" | "faqs" | "policies" | "announcements" | "testimonials"
  | "seo" | "media"
  | "menu-categories" | "menu-items" | "restaurant-settings"
  | "tour-scenes" | "tour-hotspots"
  | "ai-knowledge";

export type CmsResourceDef = {
  id: CmsResourceId;
  label: string;
  singular: string;
  view: AdminPermission;
  manage: AdminPermission;
  key: string;
  /** Field shown as the row title (falls back to the key). */
  title: string;
  /** Columns shown in the list. */
  columns: string[];
  create: boolean;
  remove: boolean;
  fields: FieldDef[];
  /** Optional list filter (select of this field's values). */
  filterField?: string;
  intro?: string;
};

export const CMS_ROOM_IDS = ["deluxe", "super-deluxe", "premium"] as const;
export const PROVENANCES = ["tejjora", "licensed", "illustrative", "placeholder"] as const;
export const FACT_STATUSES = ["verified", "provisional", "placeholder", "conflict"] as const;
export const TESTIMONIAL_SOURCES = ["google", "tripadvisor", "direct", "demo"] as const;
/** Public, indexable routes that may carry an SEO override (wired through generateMetadata). */
export const SEO_PATHS = ["/", "/rooms", "/rooms/deluxe", "/rooms/super-deluxe", "/rooms/premium", "/dining", "/dining/menu", "/experience", "/gallery", "/location", "/contact", "/plan-your-stay", "/policies", "/faq", "/virtual-tour", "/book"] as const;

const sortOrder: FieldDef = { name: "sort_order", label: "Sort order", kind: "int", min: -10000, max: 10000 };
const published: FieldDef = { name: "published", label: "Published", kind: "bool" };
const approvedBy: FieldDef = { name: "approved_by", label: "Approved by", kind: "text", readOnly: true };
const approvedAt: FieldDef = { name: "approved_at", label: "Approved at", kind: "datetime", readOnly: true };

export const CMS_RESOURCES: Record<CmsResourceId, CmsResourceDef> = {
  rooms: {
    id: "rooms", label: "Rooms", singular: "room", view: "rooms.view", manage: "rooms.manage",
    key: "id", title: "name", columns: ["name", "sort_order", "published"], create: false, remove: false,
    intro: "Room descriptions only. Rates, overrides and inventory stay in Availability & Rates; the room ids are fixed booking keys. Leave unknown specs empty.",
    fields: [
      { name: "id", label: "Room id (fixed)", kind: "text", readOnly: true },
      { name: "slug", label: "URL slug (fixed)", kind: "text", readOnly: true },
      { name: "name", label: "Name", kind: "text", required: true, max: 120 },
      { name: "summary", label: "Summary", kind: "textarea", max: 600 },
      { name: "body", label: "Description", kind: "textarea", max: 6000 },
      { name: "size_sqft", label: "Size (sq ft)", kind: "int", min: 50, max: 10000, help: "Empty until the hotel confirms it." },
      { name: "bed_type", label: "Bed type", kind: "text", max: 120 },
      { name: "max_adults", label: "Max adults", kind: "int", min: 1, max: 12 },
      { name: "max_children", label: "Max children", kind: "int", min: 0, max: 12 },
      { name: "view", label: "View", kind: "text", max: 160, help: "Only a confirmed view (the lake view is still provisional in the ledger)." },
      { name: "amenities", label: "Amenities (one per line)", kind: "list", max: 40, db: "jsonb" },
      sortOrder,
      published,
    ],
  },
  offers: {
    id: "offers", label: "Offers", singular: "offer", view: "offers.view", manage: "offers.manage",
    key: "id", title: "title", columns: ["title", "valid_from", "valid_to", "is_demo", "published"], create: true, remove: true,
    intro: "Only published, non-demo offers inside their dates appear publicly. Discounts here describe an offer; the booking engine's promo configuration still prices every stay.",
    fields: [
      { name: "slug", label: "Slug", kind: "slug", required: true, max: 80, createOnly: true },
      { name: "title", label: "Title", kind: "text", required: true, max: 160 },
      { name: "summary", label: "Summary", kind: "textarea", max: 800 },
      { name: "terms", label: "Terms", kind: "textarea", max: 4000 },
      { name: "valid_from", label: "Valid from", kind: "date" },
      { name: "valid_to", label: "Valid to", kind: "date" },
      { name: "room_ids", label: "Applicable rooms", kind: "list", options: CMS_ROOM_IDS, max: 10, db: "text[]" },
      { name: "adjustment_type", label: "Adjustment type", kind: "select", options: ["percent", "fixed"] },
      { name: "adjustment_value", label: "Adjustment value", kind: "number", min: 0, max: 1000000, step: 0.01 },
      { name: "promo_code", label: "Promo code", kind: "text", max: 32, help: "Uppercase letters, digits, - or _. Must also exist in the booking promo configuration to price a stay." },
      { name: "is_demo", label: "Demo concept (owner can clear)", kind: "bool", help: "Demo offers can never be published. Only the owner can approve a demo offer as real." },
      sortOrder,
      published,
    ],
  },
  facts: {
    id: "facts", label: "Property facts", singular: "fact", view: "content.view", manage: "content.manage",
    key: "key", title: "key", columns: ["key", "status", "public"], create: true, remove: true, filterField: "status",
    intro: "Only facts that are verified AND public reach pages, structured data or the concierge. Keep the content ledger's status.",
    fields: [
      { name: "key", label: "Key", kind: "text", required: true, max: 80, createOnly: true, help: "Lowercase, e.g. contact.phone" },
      { name: "value", label: "Value (JSON)", kind: "json", required: true, help: "Text in quotes, a number, true/false, a list or an object." },
      { name: "status", label: "Status", kind: "select", options: FACT_STATUSES, required: true },
      { name: "source", label: "Source", kind: "text", required: true, max: 300, help: "Ledger source ids, e.g. SRC-MENU" },
      { name: "public", label: "Public", kind: "bool" },
      { name: "notes", label: "Notes", kind: "textarea", max: 2000 },
      { name: "updated_by", label: "Last updated by", kind: "text", readOnly: true },
    ],
  },
  faqs: {
    id: "faqs", label: "FAQs", singular: "FAQ", view: "content.view", manage: "content.manage",
    key: "id", title: "question", columns: ["question", "category", "approved", "published"], create: true, remove: true, filterField: "category",
    fields: [
      { name: "category", label: "Category", kind: "text", required: true, max: 40, help: "Lowercase, e.g. general, home, contact" },
      { name: "question", label: "Question", kind: "text", required: true, max: 300 },
      { name: "answer", label: "Answer", kind: "textarea", required: true, max: 3000 },
      sortOrder,
      { name: "approved", label: "Approved by the hotel", kind: "approval" },
      approvedBy,
      approvedAt,
      published,
    ],
  },
  policies: {
    id: "policies", label: "Policies", singular: "policy", view: "content.view", manage: "content.manage",
    key: "id", title: "title", columns: ["title", "approved", "published"], create: true, remove: true,
    intro: "A policy is published only after the hotel approves its wording. Changing the wording withdraws the approval.",
    fields: [
      { name: "slug", label: "Slug", kind: "slug", required: true, max: 80, createOnly: true },
      { name: "title", label: "Title", kind: "text", required: true, max: 160 },
      { name: "body", label: "Wording", kind: "textarea", required: true, max: 6000 },
      sortOrder,
      { name: "approved", label: "Approved by the hotel", kind: "approval" },
      approvedBy,
      approvedAt,
      published,
    ],
  },
  announcements: {
    id: "announcements", label: "Announcements", singular: "announcement", view: "content.view", manage: "content.manage",
    key: "id", title: "text", columns: ["text", "publish_from", "publish_until", "published"], create: true, remove: true,
    fields: [
      { name: "text", label: "Text", kind: "text", required: true, max: 280 },
      { name: "link", label: "Link", kind: "url", relative: true, max: 500 },
      { name: "publish_from", label: "Show from (India time)", kind: "datetime" },
      { name: "publish_until", label: "Show until (India time)", kind: "datetime" },
      published,
    ],
  },
  testimonials: {
    id: "testimonials", label: "Testimonials", singular: "testimonial", view: "content.view", manage: "content.manage",
    key: "id", title: "author_display", columns: ["author_display", "source", "consent", "published"], create: true, remove: true,
    intro: "Genuine guest reviews only, with their source and the guest's consent. Demo reviews can never be published or converted into genuine ones.",
    fields: [
      { name: "author_display", label: "Shown as", kind: "text", required: true, max: 80, help: "As the guest agreed, e.g. \"Ananya S.\"" },
      { name: "text", label: "Review", kind: "textarea", required: true, max: 2000 },
      { name: "rating", label: "Rating (1–5)", kind: "int", min: 1, max: 5 },
      { name: "source", label: "Source", kind: "select", options: TESTIMONIAL_SOURCES, required: true },
      { name: "source_url", label: "Source link", kind: "url", max: 500, help: "Required for Google and Tripadvisor reviews." },
      { name: "review_date", label: "Review date", kind: "date" },
      { name: "consent", label: "Guest consent recorded", kind: "bool" },
      sortOrder,
      published,
    ],
  },
  seo: {
    id: "seo", label: "SEO", singular: "SEO entry", view: "seo.view", manage: "seo.manage",
    key: "path", title: "path", columns: ["path", "title", "noindex"], create: true, remove: true,
    intro: "Overrides a page's title, description, share image and indexing. Pages without an entry keep their built-in metadata. No ratings or star claims.",
    fields: [
      { name: "path", label: "Page", kind: "select", options: SEO_PATHS, required: true, createOnly: true },
      { name: "title", label: "Title", kind: "text", max: 120, help: "About 50–60 characters reads best in search results." },
      { name: "description", label: "Description", kind: "textarea", max: 320, help: "About 120–160 characters." },
      { name: "og_media_id", label: "Share image", kind: "select", optionsFrom: "media", help: "Property photography only." },
      { name: "noindex", label: "Hide from search engines", kind: "bool" },
    ],
  },
  media: {
    id: "media", label: "Media", singular: "media item", view: "media.view", manage: "media.manage",
    key: "id", title: "alt", columns: ["alt", "provenance", "usage"], create: false, remove: true, filterField: "provenance",
    fields: [
      { name: "url", label: "Preview", kind: "text", readOnly: true },
      { name: "storage_path", label: "Stored at", kind: "text", readOnly: true },
      { name: "width", label: "Width", kind: "int", readOnly: true },
      { name: "height", label: "Height", kind: "int", readOnly: true },
      { name: "usage", label: "Used by", kind: "int", readOnly: true },
      { name: "alt", label: "Alt text", kind: "text", max: 300, help: "Describe what the image shows. Required." },
      { name: "provenance", label: "Provenance", kind: "select", options: PROVENANCES, required: true, help: "Illustrative and placeholder media never appear as Tejjora photography." },
      { name: "credit", label: "Credit", kind: "text", max: 200 },
      { name: "licence", label: "Licence", kind: "text", max: 200, help: "Required for licensed media." },
      { name: "source_url", label: "Source URL", kind: "url", max: 500 },
      { name: "notes", label: "Notes", kind: "textarea", max: 2000 },
    ],
  },
  "menu-categories": {
    id: "menu-categories", label: "Menu categories", singular: "category", view: "restaurant.menu.view", manage: "restaurant.menu.manage",
    key: "id", title: "name", columns: ["name", "sort_order", "published"], create: true, remove: true,
    fields: [
      { name: "id", label: "Id", kind: "slug", required: true, max: 60, createOnly: true },
      { name: "slug", label: "Slug", kind: "slug", required: true, max: 60, createOnly: true },
      { name: "name", label: "Name", kind: "text", required: true, max: 80 },
      { name: "note", label: "Note", kind: "text", max: 300 },
      sortOrder,
      published,
    ],
  },
  "menu-items": {
    id: "menu-items", label: "Menu items", singular: "menu item", view: "restaurant.menu.view", manage: "restaurant.menu.manage",
    key: "id", title: "name", columns: ["name", "category_id", "price_full", "available", "published"], create: true, remove: true, filterField: "category_id",
    intro: "Prices are the printed menu's. Leave the half price empty unless the hotel prints one.",
    fields: [
      { name: "id", label: "Id", kind: "slug", required: true, max: 80, createOnly: true },
      { name: "category_id", label: "Category", kind: "select", optionsFrom: "menu-categories", required: true },
      { name: "name", label: "Name", kind: "text", required: true, max: 120 },
      { name: "source_name", label: "Printed spelling", kind: "text", readOnly: true },
      { name: "description", label: "Description", kind: "textarea", max: 600 },
      { name: "portion", label: "Portion", kind: "text", max: 60 },
      { name: "variants", label: "Variants (one per line)", kind: "list", max: 30, db: "jsonb" },
      { name: "price_full", label: "Price (₹)", kind: "number", required: true, min: 0, max: 100000, step: 0.01 },
      { name: "price_half", label: "Half price (₹)", kind: "number", min: 0, max: 100000, step: 0.01 },
      { name: "contains_egg", label: "Contains egg", kind: "bool" },
      { name: "available", label: "Available today", kind: "bool", permission: "restaurant.menu.availability" },
      { name: "signature", label: "Signature dish", kind: "bool" },
      sortOrder,
      published,
      { name: "review_note", label: "Owner review note", kind: "textarea", max: 500 },
    ],
  },
  "restaurant-settings": {
    id: "restaurant-settings", label: "Settings", singular: "settings", view: "restaurant.menu.view", manage: "restaurant.menu.manage",
    key: "id", title: "public_name", columns: ["public_name", "opening_time", "ordering_enabled"], create: false, remove: false,
    intro: "Leave unknown values empty: the restaurant name, opening time and room delivery are not confirmed yet.",
    fields: [
      { name: "public_name", label: "Restaurant name", kind: "text", max: 120 },
      { name: "opening_time", label: "Opening time", kind: "time" },
      { name: "prep_minutes_min", label: "Preparation from (min)", kind: "int", min: 0, max: 240 },
      { name: "prep_minutes_max", label: "Preparation to (min)", kind: "int", min: 0, max: 240 },
      { name: "service_charge_pct", label: "Service charge (%)", kind: "number", min: 0, max: 30, step: 0.01 },
      { name: "service_charge_note", label: "Service charge note", kind: "textarea", max: 600 },
      { name: "taxes_note", label: "Taxes note", kind: "textarea", max: 600 },
      { name: "allergy_note", label: "Allergy note", kind: "textarea", max: 600 },
      { name: "no_cancel_note", label: "No-cancellation note", kind: "textarea", max: 600 },
      { name: "price_change_note", label: "Price-change note", kind: "textarea", max: 600 },
      { name: "ordering_enabled", label: "Ordering enabled", kind: "bool", help: "Off by default. When on, guests can send order requests from /dining/menu." },
      { name: "room_delivery_enabled", label: "Room delivery", kind: "triBool", help: "Empty = not confirmed by the hotel." },
      { name: "updated_by", label: "Last updated by", kind: "text", readOnly: true },
    ],
  },
  "tour-scenes": {
    id: "tour-scenes", label: "Scenes", singular: "scene", view: "tour.view", manage: "tour.manage",
    key: "id", title: "label", columns: ["label", "provenance", "ready"], create: true, remove: true,
    intro: "A scene is ready only with a panorama. Demo or placeholder scenes must say so in their label (e.g. \"360 Room Demo\") and carry a source note. Only the owner can reclassify one as property media.",
    fields: [
      { name: "slug", label: "Slug", kind: "slug", required: true, max: 80, createOnly: true },
      { name: "label", label: "Label", kind: "text", required: true, max: 120 },
      { name: "eyebrow", label: "Eyebrow", kind: "text", max: 120 },
      { name: "description", label: "Description", kind: "textarea", max: 2000 },
      { name: "panorama_path", label: "Panorama path", kind: "text", max: 300, help: "Site path, e.g. /panoramas/lobby.jpg" },
      { name: "panorama_width", label: "Panorama width (px)", kind: "int", min: 256, max: 32768 },
      { name: "media_id", label: "Panorama media", kind: "select", optionsFrom: "media" },
      { name: "fallback_image_path", label: "Fallback image path", kind: "text", max: 300 },
      { name: "initial_yaw", label: "Initial yaw (rad)", kind: "number", min: -6.2832, max: 6.2832, step: 0.01 },
      { name: "initial_pitch", label: "Initial pitch (rad)", kind: "number", min: -1.5708, max: 1.5708, step: 0.01 },
      { name: "initial_fov", label: "Initial field of view (rad)", kind: "number", min: 0.1, max: 3.2, step: 0.01 },
      { name: "provenance", label: "Provenance", kind: "select", options: PROVENANCES, required: true },
      { name: "source_note", label: "Source note", kind: "textarea", max: 2000 },
      { name: "ready", label: "Ready", kind: "bool" },
      sortOrder,
    ],
  },
  "tour-hotspots": {
    id: "tour-hotspots", label: "Hotspots", singular: "hotspot", view: "tour.view", manage: "tour.manage",
    key: "id", title: "label", columns: ["label", "scene_id", "target_type", "target_value"], create: true, remove: true, filterField: "scene_id",
    fields: [
      { name: "scene_id", label: "Scene", kind: "select", optionsFrom: "tour-scenes", required: true },
      { name: "label", label: "Label", kind: "text", required: true, max: 80 },
      { name: "yaw", label: "Yaw (rad)", kind: "number", required: true, min: -6.2832, max: 6.2832, step: 0.01 },
      { name: "pitch", label: "Pitch (rad)", kind: "number", required: true, min: -1.5708, max: 1.5708, step: 0.01 },
      { name: "target_type", label: "Target type", kind: "select", options: ["scene", "room", "booking", "url"], required: true },
      { name: "target_value", label: "Target", kind: "text", required: true, max: 300, help: "Scene slug, room id (deluxe, super-deluxe, premium), or a /path or https:// link." },
      sortOrder,
    ],
  },
  "ai-knowledge": {
    id: "ai-knowledge", label: "AI Knowledge", singular: "entry", view: "ai_knowledge.view", manage: "ai_knowledge.manage",
    key: "id", title: "question", columns: ["question", "topic", "public", "approved"], create: true, remove: true, filterField: "topic",
    intro: "The concierge may use an entry only when it is public AND approved. Changing the question or answer withdraws the approval.",
    fields: [
      { name: "topic", label: "Topic", kind: "text", required: true, max: 40, help: "Lowercase, e.g. arrival, dining" },
      { name: "question", label: "Question", kind: "text", required: true, max: 300 },
      { name: "answer", label: "Answer", kind: "textarea", required: true, max: 3000 },
      { name: "public", label: "Public", kind: "bool" },
      { name: "approved", label: "Approved", kind: "approval" },
      approvedBy,
      approvedAt,
    ],
  },
};

export const isCmsResourceId = (value: string): value is CmsResourceId => Object.hasOwn(CMS_RESOURCES, value);
