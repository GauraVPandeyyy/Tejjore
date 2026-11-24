import "server-only";
import { entityMediaRows, mediaAssetRows } from "./catalog";
import { isPropertyMedia } from "./rules";
import type { EntityMediaJoinRow, MediaAssetRow } from "./rows";
import { readContent, type ContentDb, type ReadOptions } from "./source";
import type { ContentResult, EntityMediaItem, GalleryImage, MediaAsset, MediaEntityType } from "./types";
import { mediaSrc } from "./mediaUrl";
import { InvalidRow, mapRows, oneOf, optionalNumber, optionalText, text } from "./validate";

const PROVENANCES = ["tejjora", "licensed", "illustrative", "placeholder"] as const;
const LAYOUTS = ["landscape", "portrait", "wide", "square"] as const;
const ENTITY_TYPES = ["room", "gallery", "restaurant", "offer", "tour", "home", "page"] as const;

export function mapMediaAsset(row: Omit<MediaAssetRow, "notes">): MediaAsset {
  const src = mediaSrc(row.storage_path);
  if (!src) throw new InvalidRow("storage_path: not a site path or storage key");
  return {
    id: text(row, "id", 200),
    src,
    width: optionalNumber(row, "width", 1, 20000),
    height: optionalNumber(row, "height", 1, 20000),
    blurDataUrl: optionalText(row, "blur_data", 4096),
    alt: typeof row.alt === "string" ? row.alt : "",
    credit: optionalText(row, "credit", 200),
    provenance: oneOf(row, "provenance", PROVENANCES),
    licence: optionalText(row, "licence", 200),
    sourceUrl: optionalText(row, "source_url", 2000),
  };
}

function mapEntityMedia(row: EntityMediaJoinRow): EntityMediaItem {
  return {
    entityType: oneOf(row, "entity_type", ENTITY_TYPES),
    entityId: text(row, "entity_id", 120),
    role: text(row, "role", 40),
    sortOrder: optionalNumber(row, "sort_order") ?? 0,
    layoutHint: row.layout_hint === null ? null : oneOf(row, "layout_hint", LAYOUTS),
    media: mapMediaAsset({ ...row, id: row.media_id }),
  };
}

const MEDIA_COLUMNS =
  "em.entity_type, em.entity_id, em.media_id, em.role, em.sort_order, em.layout_hint, " +
  "m.id, m.storage_path, m.width, m.height, m.blur_data, m.alt, m.credit, m.provenance, m.licence, m.source_url";

/** One query for every entity of a type (no N+1): optional id list and role filter. */
export async function queryEntityMedia(db: ContentDb, entityType: MediaEntityType, entityIds: string[] | null, role: string | null) {
  const result = await db.query<EntityMediaJoinRow>(
    `SELECT ${MEDIA_COLUMNS}
       FROM entity_media em
       JOIN media_assets m ON m.id = em.media_id
      WHERE em.entity_type = $1
        AND ($2::text[] IS NULL OR em.entity_id = ANY($2::text[]))
        AND ($3::text IS NULL OR em.role = $3)
      ORDER BY em.sort_order, em.entity_id, m.id`,
    [entityType, entityIds, role],
  );
  return mapRows("entity_media", result.rows, mapEntityMedia);
}

/** Catalog rows joined in memory: the fallback goes through the same mapper as the database. */
function fallbackEntityMedia(entityType: MediaEntityType, entityIds: string[] | null, role: string | null) {
  const assets = new Map(mediaAssetRows().map((row) => [row.id, row]));
  const joined = entityMediaRows()
    .filter((row) => row.entity_type === entityType && (!entityIds || entityIds.includes(row.entity_id)) && (!role || row.role === role))
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((row) => {
      const asset = assets.get(row.media_id);
      return asset ? [{ ...asset, ...row, id: asset.id }] : [];
    });
  return mapRows("entity_media", joined, mapEntityMedia);
}

const groupByEntity = (items: EntityMediaItem[]) => {
  const grouped: Record<string, EntityMediaItem[]> = {};
  for (const item of items) (grouped[item.entityId] ??= []).push(item);
  return grouped;
};

/** Media for several entities of one type, grouped by entity id (one query). */
export async function getMediaForEntities(
  entityType: MediaEntityType,
  entityIds: string[],
  role: string | null = null,
  options?: ReadOptions,
): Promise<ContentResult<Record<string, EntityMediaItem[]>>> {
  const ids = [...entityIds].sort();
  return readContent(
    {
      domain: "media",
      key: `media:${entityType}:${ids.join(",")}:${role ?? "*"}`,
      load: async (db) => groupByEntity(await queryEntityMedia(db, entityType, ids, role)),
      fallback: () => groupByEntity(fallbackEntityMedia(entityType, ids, role)),
    },
    options,
  );
}

export async function getMediaForEntity(entityType: MediaEntityType, entityId: string, role: string | null = null, options?: ReadOptions) {
  const result = await getMediaForEntities(entityType, [entityId], role, options);
  return { data: result.data[entityId] ?? [], source: result.source } satisfies ContentResult<EntityMediaItem[]>;
}

const GALLERY_CATEGORIES = { hotel: "Hotel", stay: "Stay", dining: "Dining" } as const;

function toGalleryImages(items: EntityMediaItem[]): GalleryImage[] {
  return items
    .filter((item) => isPropertyMedia(item.media.provenance) && item.entityId in GALLERY_CATEGORIES)
    .map((item) => ({
      id: `${item.entityId}-${item.media.id}`,
      src: item.media.src,
      alt: item.media.alt,
      category: GALLERY_CATEGORIES[item.entityId as keyof typeof GALLERY_CATEGORIES],
      shape: item.layoutHint ?? "landscape",
    }));
}

/**
 * Public gallery: Tejjora (or licensed) photography only; illustrative and placeholder media are
 * never shown as property photos. An unseeded database falls back to the current gallery.
 */
export async function getGalleryImages(options?: ReadOptions): Promise<ContentResult<GalleryImage[]>> {
  return readContent(
    {
      domain: "media",
      key: "gallery",
      load: async (db) => {
        const images = toGalleryImages(await queryEntityMedia(db, "gallery", null, "gallery"));
        return images.length ? images : null;
      },
      fallback: () => toGalleryImages(fallbackEntityMedia("gallery", null, "gallery")),
    },
    options,
  );
}
