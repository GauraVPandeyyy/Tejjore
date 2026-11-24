import "server-only";
import { randomUUID } from "node:crypto";
import { recordAudit } from "@/lib/admin/audit";
import { CmsInputError, CmsNotFound, CmsUnavailable, cmsDatabase, getCmsRow, mapCmsDbError } from "@/lib/admin/cms/engine";
import { CMS_ROOM_IDS, PROVENANCES } from "@/lib/admin/cms/schema";
import type { AdminContext } from "@/lib/admin/session";
import { mediaSrc } from "@/lib/content/mediaUrl";
import { revalidateContent } from "@/lib/content/revalidate";
import { MEDIA_ACCEPTED_TYPES, MEDIA_MAX_BYTES, MediaRejected, processUpload } from "./process";
import { mediaStorage } from "./storage";

type Actor = { admin: Pick<AdminContext, "userId" | "role">; request?: Request };
type Fields = Record<string, unknown>;

const ENTITY_TYPES = ["room", "gallery", "restaurant", "offer", "tour", "home", "page"] as const;
const GALLERY_IDS = ["hotel", "stay", "dining"];
const LAYOUTS = ["landscape", "portrait", "wide", "square"];
const STAGING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const isPropertyProvenance = (value: unknown) => value === "tejjora" || value === "licensed";

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Upload metadata: alt text and provenance are required; licensed media needs its licence. */
export function validateMediaMeta(input: Fields) {
  const errors: Record<string, string> = {};
  const alt = str(input.alt);
  const provenance = str(input.provenance);
  const credit = str(input.credit) || null;
  const licence = str(input.licence) || null;
  const sourceUrl = str(input.source_url) || null;
  const notes = str(input.notes) || null;
  if (!alt) errors.alt = "Alt text is required.";
  else if (alt.length > 300) errors.alt = "At most 300 characters.";
  if (!(PROVENANCES as readonly string[]).includes(provenance)) errors.provenance = "Choose where this image comes from.";
  if (provenance === "licensed" && !licence) errors.licence = "Licensed media needs its licence.";
  if (credit && credit.length > 200) errors.credit = "At most 200 characters.";
  if (licence && licence.length > 200) errors.licence = "At most 200 characters.";
  if (sourceUrl && !/^https:\/\/\S{1,490}$/.test(sourceUrl)) errors.source_url = "Use an https:// link.";
  if (notes && notes.length > 2000) errors.notes = "At most 2000 characters.";
  if (Object.keys(errors).length) throw new CmsInputError(errors);
  return { alt, provenance, credit, licence, source_url: sourceUrl, notes };
}

function requireStorage() {
  const storage = mediaStorage();
  if (!storage) throw new CmsUnavailable("Media storage is not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a public bucket).");
  return storage;
}

/** Validate → re-encode → store → record. A failed database write removes the stored object. */
export async function uploadMedia(bytes: Uint8Array, input: Fields, { admin, request }: Actor) {
  const db = cmsDatabase();
  const meta = validateMediaMeta(input);
  const storage = requireStorage();
  let image;
  try {
    image = await processUpload(bytes);
  } catch (error) {
    if (error instanceof MediaRejected) throw new CmsInputError({ file: error.message }, error.message);
    throw error;
  }
  const now = new Date();
  const objectPath = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${image.extension}`;
  const storagePath = await storage.put(objectPath, image.data, image.contentType);
  let id: string;
  try {
    const result = await db.query<{ id: string }>(
      `INSERT INTO media_assets (storage_path, width, height, blur_data, alt, credit, provenance, licence, source_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [storagePath, image.width, image.height, image.blurDataUrl.length <= 4096 ? image.blurDataUrl : null, meta.alt, meta.credit, meta.provenance, meta.licence, meta.source_url, meta.notes],
    );
    id = result.rows[0].id;
  } catch (error) {
    await storage.remove(storagePath).catch(() => undefined);
    mapCmsDbError(error);
  }
  await recordAudit(admin, {
    action: "media_asset.uploaded",
    entity: "media_asset",
    entityId: id,
    diff: { alt: meta.alt, provenance: meta.provenance, credit: meta.credit, licence: meta.licence, width: image.width, height: image.height, sourceFormat: image.sourceFormat, bytes: bytes.length },
    request,
  });
  revalidateContent("media");
  return getCmsRow("media", id);
}

/** Step 1 of a large upload: a signed URL the browser uploads the original to (Supabase only). */
export async function createStagedUpload(input: Fields) {
  const storage = requireStorage();
  if (!storage.createSignedUpload) throw new CmsUnavailable("Direct uploads are used in this environment.");
  const type = str(input.contentType);
  const size = Number(input.size);
  if (!(MEDIA_ACCEPTED_TYPES as readonly string[]).includes(type)) throw new CmsInputError({ file: "Only JPEG, PNG, WebP or AVIF images are accepted (SVG is not)." });
  if (!Number.isFinite(size) || size <= 0 || size > MEDIA_MAX_BYTES) throw new CmsInputError({ file: "Images must be 15 MB or smaller." });
  const stagingId = randomUUID();
  return { stagingId, uploadUrl: await storage.createSignedUpload(`staging/${stagingId}`) };
}

/** Step 2: read the staged original, then the same validation and re-encoding as a direct upload. */
export async function finalizeStagedUpload(input: Fields, actor: Actor) {
  const storage = requireStorage();
  const stagingId = str(input.stagingId);
  if (!STAGING_ID.test(stagingId) || !storage.readStaged) throw new CmsInputError({ file: "Upload not found. Please upload again." });
  validateMediaMeta(input);
  let bytes: Uint8Array;
  try {
    bytes = await storage.readStaged(`staging/${stagingId}`, MEDIA_MAX_BYTES);
  } catch (error) {
    if (error instanceof RangeError) throw new CmsInputError({ file: "Images must be 15 MB or smaller." });
    throw new CmsInputError({ file: "Upload not found. Please upload again." });
  } finally {
    // The original is never kept, whatever the outcome.
    void storage.removeStaged?.(`staging/${stagingId}`).catch(() => undefined);
  }
  return uploadMedia(bytes, input, actor);
}

// ------------------------------------------------------------------------------------------------
// Entity assignment (entity_media)

function parseLink(input: Fields) {
  const errors: Record<string, string> = {};
  const entityType = str(input.entity_type);
  const entityId = str(input.entity_id);
  const role = str(input.role) || "gallery";
  const mediaId = str(input.media_id);
  if (!(ENTITY_TYPES as readonly string[]).includes(entityType)) errors.entity_type = "Unknown entity type.";
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(entityId)) errors.entity_id = "Invalid entity.";
  else if (entityType === "room" && !(CMS_ROOM_IDS as readonly string[]).includes(entityId)) errors.entity_id = "Unknown room.";
  else if (entityType === "gallery" && !GALLERY_IDS.includes(entityId)) errors.entity_id = "Gallery sections are hotel, stay and dining.";
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(role)) errors.role = "Lowercase letters, digits and hyphens.";
  if (!mediaId || mediaId.length > 200) errors.media_id = "Choose a media item.";
  if (Object.keys(errors).length) throw new CmsInputError(errors);
  return { entityType, entityId, role, mediaId };
}

export async function listEntityMedia(entityType: string, entityId: string) {
  const db = cmsDatabase();
  try {
    const rows = (
      await db.query<Record<string, unknown>>(
        `SELECT em.media_id, em.role, em.sort_order, em.layout_hint, m.storage_path, m.alt, m.provenance
           FROM entity_media em JOIN media_assets m ON m.id = em.media_id
          WHERE em.entity_type = $1 AND em.entity_id = $2 ORDER BY em.role, em.sort_order, em.media_id`,
        [entityType, entityId],
      )
    ).rows;
    return rows.map(({ storage_path: storagePath, ...row }) => ({ ...row, url: mediaSrc(storagePath) }));
  } catch (error) {
    mapCmsDbError(error);
  }
}

export async function linkMedia(input: Fields, { admin, request }: Actor) {
  const db = cmsDatabase();
  const link = parseLink(input);
  const sortOrder = input.sort_order === undefined || input.sort_order === null || input.sort_order === "" ? 0 : Number(input.sort_order);
  const layout = str(input.layout_hint) || null;
  if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 10000) throw new CmsInputError({ sort_order: "Expected a whole number." });
  if (layout && !LAYOUTS.includes(layout)) throw new CmsInputError({ layout_hint: "Choose landscape, portrait, wide or square." });
  const media = (await db.query<{ provenance: string }>("SELECT provenance FROM media_assets WHERE id = $1", [link.mediaId])).rows[0];
  if (!media) throw new CmsNotFound("Media not found.");
  // Rooms and the gallery present property photography; illustrative or placeholder art never does.
  if ((link.entityType === "room" || link.entityType === "gallery") && !isPropertyProvenance(media.provenance)) {
    throw new CmsInputError({ media_id: `This media is ${media.provenance}. Rooms and the gallery show Tejjora or licensed photography only.` });
  }
  try {
    await db.query(
      `INSERT INTO entity_media (entity_type, entity_id, media_id, role, sort_order, layout_hint) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (entity_type, entity_id, role, media_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, layout_hint = EXCLUDED.layout_hint`,
      [link.entityType, link.entityId, link.mediaId, link.role, sortOrder, layout],
    );
  } catch (error) {
    mapCmsDbError(error);
  }
  await recordAudit(admin, { action: "entity_media.linked", entity: "entity_media", entityId: `${link.entityType}:${link.entityId}`, diff: { mediaId: link.mediaId, role: link.role, sortOrder }, request });
  revalidateContent("media");
  return { ok: true };
}

export async function unlinkMedia(input: Fields, { admin, request }: Actor) {
  const db = cmsDatabase();
  const link = parseLink(input);
  const result = await db.query(
    "DELETE FROM entity_media WHERE entity_type = $1 AND entity_id = $2 AND role = $3 AND media_id = $4 RETURNING media_id",
    [link.entityType, link.entityId, link.role, link.mediaId],
  );
  if (!result.rows.length) throw new CmsNotFound("That media is not assigned here.");
  await recordAudit(admin, { action: "entity_media.unlinked", entity: "entity_media", entityId: `${link.entityType}:${link.entityId}`, diff: { mediaId: link.mediaId, role: link.role }, request });
  revalidateContent("media");
  return { ok: true };
}
