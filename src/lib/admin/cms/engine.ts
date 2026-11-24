import "server-only";
import { recordAudit } from "@/lib/admin/audit";
import type { AdminContext } from "@/lib/admin/session";
import { roleHasPermission } from "@/lib/admin/permissions";
import { contentDatabase, type ContentDb } from "@/lib/content/db";
import { mediaSrc } from "@/lib/content/mediaUrl";
import { revalidateContent } from "@/lib/content/revalidate";
import type { ContentDomain } from "@/lib/content/tags";
import { CMS_RESOURCES, CMS_ROOM_IDS, type CmsResourceDef, type CmsResourceId, type FieldDef } from "./schema";
import { removeStoredMedia } from "@/lib/admin/media/storage";

/**
 * Admin CMS engine. Every content mutation goes through here, so each one is:
 *   1. validated server-side against the shared field definitions (schema.ts) and the resource's
 *      publication rules below (the database CHECK constraints from Phase 2 back them up);
 *   2. permission-checked per field (the route has already checked the resource permission);
 *   3. written to the Phase 2 table (the only content store);
 *   4. audited (recordAudit) and
 *   5. followed by revalidation of only the touched content domains.
 * Errors are typed so routes return sanitized messages; database detail never reaches staff.
 */
type Row = Record<string, unknown>;

export class CmsInputError extends Error {
  constructor(public fields: Record<string, string>, message = "Please correct the highlighted fields.") {
    super(message);
  }
}
export class CmsForbidden extends Error {}
export class CmsNotFound extends Error {}
export class CmsConflict extends Error {}
export class CmsUnavailable extends Error {}

type RuleContext = {
  admin: Pick<AdminContext, "userId" | "role">;
  db: ContentDb;
  prev: Row | null;
  next: Row;
  changed: Set<string>;
  notices: string[];
  fail: (field: string, message: string) => void;
};

type ServerSpec = {
  table: string;
  entity: string;
  domains: ContentDomain[];
  order: string;
  /** Approval-tracked resources: `flag` = the table also has a boolean `approved` column. */
  approval?: { flag: boolean; reapproveOn: string[]; unpublish?: boolean };
  stampUpdatedBy?: boolean;
  /** Computed read-only columns. */
  computed?: Record<string, string>;
  /** Fields derived in decode() rather than selected. */
  virtual?: string[];
  decode?: (row: Row) => Row;
  encode?: Record<string, (value: unknown) => unknown>;
  rules?: (ctx: RuleContext) => void | Promise<void>;
  afterDelete?: (row: Row) => Promise<void>;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SITE_PATH = /^\/(?!\/)[A-Za-z0-9/_.-]+$/;
const RATING_CLAIM = /★|☆|\b[0-5](\.\d)?\s*(\/\s*5|out of 5|-?stars?)\b|\brated\b|\b\d+\+?\s*reviews?\b|\b(5|five)[- ]star\b/i;
const isPropertyProvenance = (value: unknown) => value === "tejjora" || value === "licensed";
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";

async function mediaProvenance(db: ContentDb, id: unknown) {
  const rows = (await db.query<{ provenance: string }>("SELECT provenance FROM media_assets WHERE id = $1", [id])).rows;
  return rows[0]?.provenance ?? null;
}

function requireWindow(ctx: RuleContext, from: string, to: string, message: string) {
  const start = ctx.next[from];
  const end = ctx.next[to];
  if (typeof start === "string" && typeof end === "string" && end < start) ctx.fail(to, message);
}

function approvalRequiredToPublish(ctx: RuleContext, message: string) {
  if (ctx.next.published === true && ctx.next.approved !== true) ctx.fail("published", message);
}

const SPECS: Record<CmsResourceId, ServerSpec> = {
  rooms: {
    table: "rooms",
    entity: "room",
    domains: ["rooms"],
    order: "sort_order, id",
    decode: (row) => ({
      ...row,
      amenities: Array.isArray(row.amenities)
        ? row.amenities.map((item) => (typeof item === "string" ? item : (item as { label?: string }).label ?? "")).filter(Boolean)
        : [],
    }),
    encode: {
      amenities: (labels) => {
        const unique = [...new Set((labels as string[]).map((label) => label.trim()).filter(Boolean))];
        return unique.map((label) => ({ id: slugify(label), label }));
      },
    },
    rules: (ctx) => {
      if (!(CMS_ROOM_IDS as readonly string[]).includes(String(ctx.next.id))) ctx.fail("id", "Unknown room.");
    },
  },
  offers: {
    table: "offers",
    entity: "offer",
    domains: ["offers"],
    order: "sort_order, title",
    encode: { promo_code: (value) => (typeof value === "string" ? value.toUpperCase() : value) },
    rules: (ctx) => {
      const { next, prev } = ctx;
      requireWindow(ctx, "valid_from", "valid_to", "The offer cannot end before it starts.");
      if ((next.adjustment_type === null || next.adjustment_type === undefined) !== (next.adjustment_value === null || next.adjustment_value === undefined)) {
        ctx.fail("adjustment_value", "Set both the adjustment type and value, or neither.");
      }
      if (next.adjustment_type === "percent" && Number(next.adjustment_value) > 100) ctx.fail("adjustment_value", "A percentage cannot exceed 100.");
      if (typeof next.promo_code === "string" && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(next.promo_code)) {
        ctx.fail("promo_code", "3–32 characters: letters, digits, - or _.");
      }
      if (ctx.changed.has("is_demo")) {
        if (ctx.admin.role !== "owner") ctx.fail("is_demo", "Only the owner can approve a demo offer as real.");
        else if (prev && prev.is_demo === false && next.is_demo === true && prev.published === true) ctx.fail("is_demo", "Unpublish the offer first.");
      }
      if (next.is_demo === true && next.published === true) ctx.fail("published", "Demo offers stay unpublished until the owner approves a real offer.");
    },
  },
  facts: {
    table: "property_facts",
    entity: "property_fact",
    domains: ["facts"],
    order: "key",
    stampUpdatedBy: true,
    rules: (ctx) => {
      if (!/^[a-z][a-z0-9_.]{1,79}$/.test(String(ctx.next.key))) ctx.fail("key", "Lowercase letters, digits, dots and underscores.");
      if (ctx.next.public === true && ctx.next.status !== "verified") {
        ctx.fail("public", "Only a verified fact can be public. Provisional, placeholder and conflicting facts stay private.");
      }
    },
  },
  faqs: {
    table: "faqs",
    entity: "faq",
    domains: ["faq"],
    order: "category, sort_order, id",
    approval: { flag: false, reapproveOn: [] },
    rules: (ctx) => {
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(String(ctx.next.category))) ctx.fail("category", "Lowercase letters, digits and hyphens.");
    },
  },
  policies: {
    table: "policies",
    entity: "policy",
    domains: ["policies"],
    order: "sort_order, title",
    approval: { flag: false, reapproveOn: ["title", "body"], unpublish: true },
    rules: (ctx) => approvalRequiredToPublish(ctx, "A policy can be published only after the hotel approves its wording."),
  },
  announcements: {
    table: "announcements",
    entity: "announcement",
    domains: ["announcements"],
    order: "created_at DESC",
    rules: (ctx) => {
      const { publish_from: from, publish_until: until } = ctx.next;
      if (typeof from === "string" && typeof until === "string" && until <= from) ctx.fail("publish_until", "The end must be after the start.");
    },
  },
  testimonials: {
    table: "testimonials",
    entity: "testimonial",
    domains: ["testimonials"],
    order: "sort_order, review_date DESC NULLS LAST, id",
    rules: (ctx) => {
      const { next, prev } = ctx;
      if (prev?.source === "demo" && next.source !== "demo") {
        ctx.fail("source", "A demo review cannot become a genuine review. Add the genuine review as a new entry.");
      }
      if (next.published === true) {
        if (next.source === "demo") ctx.fail("published", "Demo reviews can never be published.");
        if (next.consent !== true) ctx.fail("consent", "Record the guest's consent before publishing.");
        if ((next.source === "google" || next.source === "tripadvisor") && !next.source_url) ctx.fail("source_url", "Published Google or Tripadvisor reviews need their source link.");
      }
    },
  },
  seo: {
    table: "seo_pages",
    entity: "seo_page",
    domains: ["seo"],
    order: "path",
    rules: async (ctx) => {
      for (const field of ["title", "description"]) {
        if (typeof ctx.next[field] === "string" && RATING_CLAIM.test(ctx.next[field] as string)) {
          ctx.fail(field, "SEO text cannot carry ratings, star or review-count claims.");
        }
      }
      if (ctx.changed.has("og_media_id") && ctx.next.og_media_id) {
        const provenance = await mediaProvenance(ctx.db, ctx.next.og_media_id);
        if (!provenance) ctx.fail("og_media_id", "Media not found.");
        else if (!isPropertyProvenance(provenance)) ctx.fail("og_media_id", "Share images must be Tejjora or licensed photography.");
      }
    },
  },
  media: {
    table: "media_assets",
    entity: "media_asset",
    domains: ["media"],
    order: "created_at DESC, id",
    virtual: ["url"],
    computed: {
      usage: `((SELECT count(*) FROM entity_media em WHERE em.media_id = media_assets.id)
             + (SELECT count(*) FROM seo_pages s WHERE s.og_media_id = media_assets.id)
             + (SELECT count(*) FROM tour_scenes t WHERE t.media_id = media_assets.id))::int`,
    },
    decode: (row) => ({ ...row, url: mediaSrc(row.storage_path) }),
    rules: (ctx) => {
      const { next, prev } = ctx;
      if (next.provenance !== "placeholder" && !(typeof next.alt === "string" && next.alt.trim())) ctx.fail("alt", "Alt text is required.");
      if (next.provenance === "licensed" && !next.licence) ctx.fail("licence", "Licensed media needs its licence.");
      if (prev && !isPropertyProvenance(prev.provenance) && isPropertyProvenance(next.provenance) && ctx.admin.role !== "owner") {
        ctx.fail("provenance", "Only the owner can reclassify illustrative or placeholder media as property photography.");
      }
    },
    afterDelete: async (row) => removeStoredMedia(String(row.storage_path)),
  },
  "menu-categories": {
    table: "menu_categories",
    entity: "menu_category",
    domains: ["menu"],
    order: "sort_order, id",
  },
  "menu-items": {
    table: "menu_items",
    entity: "menu_item",
    domains: ["menu"],
    order: "category_id, sort_order, id",
    rules: (ctx) => {
      const { price_full: full, price_half: half } = ctx.next;
      if (half !== null && half !== undefined && Number(half) > Number(full)) ctx.fail("price_half", "The half price cannot exceed the full price.");
    },
  },
  "restaurant-settings": {
    table: "restaurant_settings",
    entity: "restaurant_settings",
    domains: ["restaurant"],
    order: "id",
    stampUpdatedBy: true,
    rules: (ctx) => {
      const { prep_minutes_min: min, prep_minutes_max: max } = ctx.next;
      if (typeof min === "number" && typeof max === "number" && min > max) ctx.fail("prep_minutes_max", "Must be at least the minimum.");
    },
  },
  "tour-scenes": {
    table: "tour_scenes",
    entity: "tour_scene",
    domains: ["tour"],
    order: "sort_order, slug",
    rules: async (ctx) => {
      const { next, prev } = ctx;
      if (prev && !isPropertyProvenance(prev.provenance) && isPropertyProvenance(next.provenance) && ctx.admin.role !== "owner") {
        ctx.fail("provenance", "Only the owner can reclassify a demo or placeholder scene as property media.");
      }
      for (const field of ["panorama_path", "fallback_image_path"]) {
        const value = next[field];
        if (typeof value === "string" && (!SITE_PATH.test(value) || value.includes(".."))) ctx.fail(field, "A site path such as /panoramas/lobby.jpg.");
      }
      let mediaKind: string | null = null;
      if (next.media_id) {
        mediaKind = await mediaProvenance(ctx.db, next.media_id);
        if (!mediaKind) ctx.fail("media_id", "Media not found.");
        else if (isPropertyProvenance(next.provenance) && !isPropertyProvenance(mediaKind)) {
          ctx.fail("provenance", `The panorama media is ${mediaKind}; the scene cannot claim property photography.`);
        }
      }
      if (next.ready === true) {
        if (!next.panorama_path && !next.media_id) ctx.fail("ready", "A scene can be ready only with a panorama.");
        if (!isPropertyProvenance(next.provenance)) {
          // The label is what the viewer's scene rail shows, so the disclosure must be there.
          const labelled = /\b(demo|sample|placeholder|illustrative|illustration)\b/i.test(String(next.label ?? ""));
          if (!labelled) ctx.fail("label", "A demo or placeholder scene must say so in its label (e.g. \"360 Room Demo\").");
          if (!next.source_note) ctx.fail("source_note", "Explain where this non-property panorama comes from.");
        }
      }
    },
  },
  "tour-hotspots": {
    table: "tour_hotspots",
    entity: "tour_hotspot",
    domains: ["tour"],
    order: "scene_id, sort_order, id",
    rules: async (ctx) => {
      const { target_type: type, target_value: value } = ctx.next;
      if (typeof value !== "string") return;
      if (type === "url") {
        if (!/^(\/(?!\/)|https:\/\/)/.test(value)) ctx.fail("target_value", "Use a /path or an https:// link.");
      } else if (type === "room" || type === "booking") {
        if (!(CMS_ROOM_IDS as readonly string[]).includes(value)) ctx.fail("target_value", "Use a room id: deluxe, super-deluxe or premium.");
      } else if (type === "scene") {
        const found = (await ctx.db.query("SELECT 1 FROM tour_scenes WHERE id = $1 OR slug = $1", [value])).rows.length;
        if (!found || !SLUG.test(value)) ctx.fail("target_value", "Use the slug of an existing scene.");
      }
    },
  },
  "ai-knowledge": {
    table: "ai_knowledge",
    entity: "ai_knowledge",
    domains: ["aiKnowledge"],
    order: "topic, id",
    approval: { flag: true, reapproveOn: ["topic", "question", "answer"] },
    rules: (ctx) => {
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(String(ctx.next.topic))) ctx.fail("topic", "Lowercase letters, digits and hyphens.");
    },
  },
};

// ------------------------------------------------------------------------------------------------
// Field parsing

function parseField(field: FieldDef, raw: unknown): { value?: unknown; error?: string } {
  const empty = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
  if (field.kind === "bool" || field.kind === "approval") return typeof raw === "boolean" ? { value: raw } : { error: "Expected yes or no." };
  if (field.kind === "triBool") return raw === null || typeof raw === "boolean" ? { value: raw } : { error: "Expected yes, no or empty." };
  if (field.kind === "list") {
    const list = raw === null || raw === undefined ? [] : raw;
    if (!Array.isArray(list) || list.some((item) => typeof item !== "string" || item.length > 120)) return { error: "Expected a list of short texts." };
    const items = list.map((item: string) => item.trim()).filter(Boolean);
    if (field.max && items.length > field.max) return { error: `At most ${field.max} entries.` };
    if (field.options && items.some((item) => !field.options!.includes(item))) return { error: "Contains a value that is not allowed." };
    if (field.required && !items.length) return { error: "Required." };
    return { value: [...new Set(items)] };
  }
  if (empty) return field.required ? { error: "Required." } : { value: null };
  switch (field.kind) {
    case "int":
    case "number": {
      const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (!Number.isFinite(value) || (field.kind === "int" && !Number.isInteger(value))) return { error: field.kind === "int" ? "Expected a whole number." : "Expected a number." };
      if (field.min !== undefined && value < field.min) return { error: `At least ${field.min}.` };
      if (field.max !== undefined && value > field.max) return { error: `At most ${field.max}.` };
      return { value };
    }
    case "json": {
      if (typeof raw !== "string") return { value: raw };
      try {
        return { value: JSON.parse(raw) };
      } catch {
        return { error: "Not valid JSON. Text needs double quotes, e.g. \"Lucknow\"." };
      }
    }
    default: {
      if (typeof raw !== "string") return { error: "Expected text." };
      const value = field.kind === "textarea" ? raw.replace(/\r\n/g, "\n").trim() : raw.trim();
      if (field.max && value.length > field.max) return { error: `At most ${field.max} characters.` };
      if (field.kind === "slug" && !SLUG.test(value)) return { error: "Lowercase letters, digits and single hyphens." };
      if (field.kind === "select" && field.options && !field.options.includes(value)) return { error: "Choose one of the listed values." };
      if (field.kind === "url" && !(/^https:\/\/[^\s]+$/.test(value) || (field.relative && /^\/(?!\/)[^\s]*$/.test(value)))) {
        return { error: field.relative ? "Use a /path or an https:// link." : "Use an https:// link." };
      }
      if (field.kind === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) return { error: "Expected a date." };
      if (field.kind === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return { error: "Expected a time (HH:MM)." };
      if (field.kind === "datetime" && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}:00+05:30`)))) {
        return { error: "Expected a date and time." };
      }
      return { value };
    }
  }
}

type Mode = "create" | "update";

/** Validates the submitted fields: unknown, read-only and fixed fields are refused by name. */
function parseInput(def: CmsResourceDef, spec: ServerSpec, input: Row, mode: Mode, admin: RuleContext["admin"]) {
  const errors: Record<string, string> = {};
  const values: Row = {};
  let forbidden = false;
  for (const [name, raw] of Object.entries(input)) {
    const field = def.fields.find((item) => item.name === name);
    if (!field) {
      errors[name] = name === def.key ? `The ${def.singular} ${name} is a stable key and cannot be changed.` : "Unknown field.";
      continue;
    }
    if (field.readOnly || (field.createOnly && mode === "update")) {
      errors[name] = field.createOnly || name === def.key ? "This is a stable key and cannot be changed." : "This field is read-only.";
      continue;
    }
    if (!roleHasPermission(admin.role, field.permission ?? def.manage) && !roleHasPermission(admin.role, def.manage)) forbidden = true;
    const parsed = parseField(field, raw);
    if (parsed.error) errors[name] = parsed.error;
    else values[name] = spec.encode?.[name] ? spec.encode[name](parsed.value) : parsed.value;
  }
  if (mode === "create") {
    for (const field of def.fields) {
      if (field.required && !field.readOnly && !(field.name in input)) errors[field.name] = "Required.";
    }
  }
  if (forbidden) throw new CmsForbidden("Your role does not allow changing these fields.");
  if (Object.keys(errors).length) throw new CmsInputError(errors);
  return values;
}

// ------------------------------------------------------------------------------------------------
// SQL

const quote = (name: string) => `"${name}"`;

function selectList(def: CmsResourceDef, spec: ServerSpec) {
  const parts = new Map<string, string>([[def.key, quote(def.key)]]);
  for (const field of def.fields) {
    const column = quote(field.name);
    if (spec.virtual?.includes(field.name)) continue;
    if (spec.computed?.[field.name]) parts.set(field.name, `${spec.computed[field.name]} AS ${column}`);
    else if (field.kind === "approval") parts.set(field.name, spec.approval?.flag ? column : `(approved_at IS NOT NULL) AS ${column}`);
    else if (field.kind === "date") parts.set(field.name, `to_char(${column}, 'YYYY-MM-DD') AS ${column}`);
    else if (field.kind === "time") parts.set(field.name, `to_char(${column}, 'HH24:MI') AS ${column}`);
    else if (field.kind === "datetime") parts.set(field.name, `to_char(${column} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD"T"HH24:MI') AS ${column}`);
    else if (field.kind === "number") parts.set(field.name, `${column}::float8 AS ${column}`);
    else parts.set(field.name, column);
  }
  return [...parts.values()].join(", ");
}

function placeholder(field: FieldDef, value: unknown, params: unknown[]) {
  const ref = (item: unknown) => {
    params.push(item);
    return `$${params.length}`;
  };
  if (value === null) return ref(null);
  if (field.kind === "json" || (field.kind === "list" && field.db === "jsonb")) return `${ref(JSON.stringify(value))}::jsonb`;
  if (field.kind === "list") return `${ref(value)}::text[]`;
  if (field.kind === "datetime") return `${ref(`${value}:00+05:30`)}::timestamptz`;
  if (field.kind === "date") return `${ref(value)}::date`;
  if (field.kind === "time") return `${ref(value)}::time`;
  return ref(value);
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  testimonials_demo_never_published: "Demo reviews can never be published.",
  testimonials_published_needs_consent: "Record the guest's consent before publishing.",
  testimonials_third_party_needs_link: "Published Google or Tripadvisor reviews need their source link.",
  policies_published_needs_approval: "A policy can be published only after it is approved.",
  offers_demo_never_published: "Demo offers cannot be published.",
  offers_window_chk: "The offer cannot end before it starts.",
  offers_adjustment_pair_chk: "Set both the adjustment type and value, or neither.",
  offers_percent_chk: "A percentage cannot exceed 100.",
  menu_items_half_not_above_full: "The half price cannot exceed the full price.",
  tour_scenes_ready_needs_panorama: "A scene can be ready only with a panorama.",
  media_assets_licensed_needs_licence: "Licensed media needs its licence.",
  announcements_window_chk: "The end must be after the start.",
  restaurant_settings_prep_range: "The preparation range is invalid.",
  tour_hotspots_target_chk: "The hotspot target is not valid for its type.",
};

/** Maps database rule violations to staff-safe messages; anything else is rethrown (logged, generic). */
function mapDbError(error: unknown): never {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const constraint = typeof error === "object" && error && "constraint" in error ? String((error as { constraint?: unknown }).constraint ?? "") : "";
  const message = error instanceof Error ? error.message : "";
  if (code === "23514") {
    if (/stable keys/.test(message)) throw new CmsInputError({}, "Room ids are stable keys and cannot be renamed.");
    throw new CmsInputError({}, CONSTRAINT_MESSAGES[constraint] ?? "This change was refused by a content rule.");
  }
  if (code === "23505") throw new CmsConflict("That identifier is already in use.");
  if (code === "23503") throw new CmsConflict("This item is linked to other content, or refers to something that does not exist.");
  if (code === "23502" || code === "22P02" || code === "22007" || code === "22008" || code === "22003") throw new CmsInputError({}, "A value is missing or not valid.");
  if (code === "42P01" || code === "42703") throw new CmsUnavailable("Content tables are missing. Apply the database migrations (npm run db:migrate).");
  throw error;
}

function database() {
  const db = contentDatabase();
  if (!db) throw new CmsUnavailable("Content editing needs the database (DATABASE_URL with migrations 003–005).");
  return db;
}

export function cmsResource(id: CmsResourceId) {
  return { def: CMS_RESOURCES[id], spec: SPECS[id] };
}

async function fetchRows(db: ContentDb, id: CmsResourceId, key?: string) {
  const { def, spec } = cmsResource(id);
  const where = key === undefined ? "" : ` WHERE ${quote(def.key)}::text = $1`;
  try {
    const result = await db.query<Row>(
      `SELECT ${selectList(def, spec)} FROM ${spec.table}${where} ORDER BY ${spec.order} LIMIT 1000`,
      key === undefined ? [] : [key],
    );
    return result.rows.map((row) => (spec.decode ? spec.decode(row) : row));
  } catch (error) {
    mapDbError(error);
  }
}

export async function listCmsRows(id: CmsResourceId) {
  return fetchRows(database(), id);
}

export async function getCmsRow(id: CmsResourceId, key: string) {
  const row = (await fetchRows(database(), id, key))[0];
  if (!row) throw new CmsNotFound(`${CMS_RESOURCES[id].singular} not found.`);
  return row;
}

type Mutation = { admin: Pick<AdminContext, "userId" | "role">; request?: Request };

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const titleOf = (def: CmsResourceDef, row: Row) => String(row[def.title] ?? row[def.key] ?? "").slice(0, 120);

async function runRules(def: CmsResourceDef, spec: ServerSpec, ctx: Omit<RuleContext, "fail">) {
  const errors: Record<string, string> = {};
  const full: RuleContext = { ...ctx, fail: (field, message) => void (errors[field] ??= message) };
  await spec.rules?.(full);
  if (Object.keys(errors).length) throw new CmsInputError(errors);
}

/** Resolves the approval flag; content changes withdraw an approval unless re-approved in the same save. */
function resolveApproval(spec: ServerSpec, prev: Row | null, values: Row, next: Row, changed: Set<string>, notices: string[]) {
  if (!spec.approval) return;
  const before = prev?.approved === true;
  let desired = "approved" in values ? values.approved === true : before;
  const contentChanged = spec.approval.reapproveOn.some((field) => changed.has(field));
  if (prev && contentChanged && values.approved !== true && desired) {
    desired = false;
    notices.push("The wording changed, so it needs approval again.");
    if (spec.approval.unpublish && next.published === true) {
      next.published = false;
      changed.add("published");
      notices.push("It was unpublished until it is approved again.");
    }
  }
  next.approved = desired;
  if (desired !== before) changed.add("approved");
  else changed.delete("approved");
}

function approvalAssignments(spec: ServerSpec, approved: boolean, admin: Mutation["admin"], params: unknown[]) {
  const sets: Array<[string, string]> = [];
  if (spec.approval?.flag) sets.push(["approved", `$${params.push(approved)}`]);
  if (approved) {
    sets.push(["approved_by", `$${params.push(admin.userId)}`], ["approved_at", "NOW()"]);
  } else {
    sets.push(["approved_by", "NULL"], ["approved_at", "NULL"]);
  }
  return sets;
}

export async function createCmsRow(id: CmsResourceId, input: Row, { admin, request }: Mutation) {
  const { def, spec } = cmsResource(id);
  if (!def.create) throw new CmsForbidden(`New ${def.label.toLowerCase()} cannot be created here.`);
  const db = database();
  const values = parseInput(def, spec, input, "create", admin);
  const next: Row = { ...values };
  const changed = new Set(Object.keys(values));
  const notices: string[] = [];
  resolveApproval(spec, null, values, next, changed, notices);
  await runRules(def, spec, { admin, db, prev: null, next, changed, notices });

  const params: unknown[] = [];
  const columns: string[] = [];
  const exprs: string[] = [];
  for (const field of def.fields) {
    if (field.kind === "approval" || !(field.name in next)) continue;
    columns.push(quote(field.name));
    exprs.push(placeholder(field, next[field.name], params));
  }
  if (spec.approval) {
    for (const [column, expr] of approvalAssignments(spec, next.approved === true, admin, params)) {
      columns.push(quote(column));
      exprs.push(expr);
    }
  }
  if (spec.stampUpdatedBy) {
    columns.push(quote("updated_by"));
    exprs.push(`$${params.push(admin.userId)}`);
  }
  let key: string;
  try {
    const result = await db.query<{ key: unknown }>(
      `INSERT INTO ${spec.table} (${columns.join(", ")}) VALUES (${exprs.join(", ")}) RETURNING ${quote(def.key)}::text AS key`,
      params,
    );
    key = String(result.rows[0]?.key);
  } catch (error) {
    mapDbError(error);
  }
  const row = await getCmsRow(id, key);
  await recordAudit(admin, { action: `${spec.entity}.created`, entity: spec.entity, entityId: key, diff: { created: values, title: titleOf(def, row) }, request });
  revalidateContent(...spec.domains);
  return { row, notices };
}

export async function updateCmsRow(id: CmsResourceId, key: string, input: Row, { admin, request }: Mutation) {
  const { def, spec } = cmsResource(id);
  const db = database();
  const values = parseInput(def, spec, input, "update", admin);
  const prev = await getCmsRow(id, key);
  const next: Row = { ...prev, ...values };
  const changed = new Set(Object.keys(values).filter((name) => name !== "approved" && !sameValue(prev[name], values[name])));
  const notices: string[] = [];
  resolveApproval(spec, prev, values, next, changed, notices);
  await runRules(def, spec, { admin, db, prev, next, changed, notices });
  if (!changed.size) return { row: prev, notices: ["No changes to save."] };

  const params: unknown[] = [];
  const sets: string[] = [];
  for (const name of changed) {
    const field = def.fields.find((item) => item.name === name);
    if (!field || field.kind === "approval") continue;
    sets.push(`${quote(name)} = ${placeholder(field, next[name], params)}`);
  }
  if (changed.has("approved")) {
    for (const [column, expr] of approvalAssignments(spec, next.approved === true, admin, params)) sets.push(`${quote(column)} = ${expr}`);
  }
  if (spec.stampUpdatedBy) sets.push(`"updated_by" = $${params.push(admin.userId)}`);
  params.push(key);
  try {
    await db.query(`UPDATE ${spec.table} SET ${sets.join(", ")} WHERE ${quote(def.key)}::text = $${params.length}`, params);
  } catch (error) {
    mapDbError(error);
  }
  const row = await getCmsRow(id, key);
  const changes = Object.fromEntries([...changed].map((name) => [name, { from: prev[name] ?? null, to: row[name] ?? null }]));
  await recordAudit(admin, { action: `${spec.entity}.updated`, entity: spec.entity, entityId: key, diff: { changes }, request });
  revalidateContent(...spec.domains);
  return { row, notices };
}

export async function deleteCmsRow(id: CmsResourceId, key: string, { admin, request }: Mutation) {
  const { def, spec } = cmsResource(id);
  if (!def.remove) throw new CmsForbidden(`${def.label} cannot be deleted.`);
  const db = database();
  const prev = await getCmsRow(id, key);
  try {
    await db.query(`DELETE FROM ${spec.table} WHERE ${quote(def.key)}::text = $1`, [key]);
  } catch (error) {
    mapDbError(error);
  }
  await recordAudit(admin, { action: `${spec.entity}.deleted`, entity: spec.entity, entityId: key, diff: { deleted: titleOf(def, prev) }, request });
  revalidateContent(...spec.domains);
  await spec.afterDelete?.(prev).catch((error) => console.error(`[cms] cleanup after deleting ${spec.entity} failed`, error instanceof Error ? error.message : error));
  return { ok: true };
}

/** For the media/orders modules, which share the database guard and error mapping. */
export { database as cmsDatabase, mapDbError as mapCmsDbError };
