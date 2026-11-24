import "server-only";
import { getPublicRoomRates } from "@/lib/booking/publicRates";
import { rooms as roomSource } from "@/data/rooms";
import type { RoomAmenity, RoomId } from "@/types/hotel";
import { roomRows } from "./catalog";
import { queryEntityMedia } from "./media";
import { isPropertyMedia } from "./rules";
import type { RoomRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, EntityMediaItem, RoomContent } from "./types";
import { InvalidRow, mapRows, optionalNumber, optionalText, text } from "./validate";

/** Stable booking keys. Never renamed: reservations, inventory, env vars and anchors depend on them. */
export const ROOM_IDS = ["deluxe", "super-deluxe", "premium"] as const satisfies readonly RoomId[];

const isRoomId = (value: string): value is RoomId => (ROOM_IDS as readonly string[]).includes(value);

function mapAmenities(value: unknown): RoomAmenity[] {
  if (!Array.isArray(value)) throw new InvalidRow("amenities: expected an array");
  return value.map((item) => {
    if (typeof item === "string" && item.trim()) return { id: item.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: item };
    if (item && typeof item === "object" && typeof item.id === "string" && typeof item.label === "string") return { id: item.id, label: item.label };
    throw new InvalidRow("amenities: invalid entry");
  });
}

/**
 * Descriptive content from `rooms`; photos from entity_media (property photography only).
 * Prices are attached afterwards by getRooms from the admin booking configuration (the data the
 * booking engine quotes with), never from editable content or copy. Panorama/video slots stay in
 * src/data until Phase 8.
 */
function mapRoom(row: RoomRow, media: EntityMediaItem[] | undefined): RoomContent {
  const id = text(row, "id", 40);
  if (!isRoomId(id)) throw new InvalidRow("id: not a booking room type");
  const source = roomSource.find((room) => room.id === id);
  const maxAdults = optionalNumber(row, "max_adults", 1, 12);
  const maxChildren = optionalNumber(row, "max_children", 0, 12);
  const photos = (media ?? []).filter((item) => isPropertyMedia(item.media.provenance)).map((item) => item.media.src);
  return {
    id,
    slug: text(row, "slug", 80),
    name: text(row, "name", 120),
    shortDescription: optionalText(row, "summary", 600) ?? "",
    longDescription: optionalText(row, "body", 6000) ?? "",
    startingPrice: null,
    rate: null,
    currency: "INR",
    maxAdults,
    maxChildren,
    maxGuests: maxAdults === null ? null : maxAdults + (maxChildren ?? 0),
    bedType: optionalText(row, "bed_type", 120),
    sizeSqFt: optionalNumber(row, "size_sqft", 50, 10000),
    view: optionalText(row, "view", 160),
    amenities: mapAmenities(row.amenities),
    imageSet: photos.length ? photos : [...(source?.imageSet ?? [])],
    panorama: source?.panorama ?? null,
    video: source?.video ?? null,
    sortOrder: optionalNumber(row, "sort_order") ?? 0,
  };
}

const ROOM_COLUMNS = "id, slug, name, summary, body, size_sqft, bed_type, max_adults, max_children, view, amenities, sort_order, published";

function toRooms(rows: RoomRow[], mediaByRoom: Record<string, EntityMediaItem[]>) {
  return mapRows("rooms", rows.filter((row) => row.published === true), (row) => mapRoom(row, mediaByRoom[row.id])).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

function fallbackRooms() {
  // Catalog rows already carry the src/data photos, so no media join is needed here.
  return toRooms(roomRows(), {});
}

/** Published rooms in display order. An unseeded `rooms` table falls back to src/data. */
export async function getRooms(options?: ReadOptions): Promise<ContentResult<RoomContent[]>> {
  const [content, rates] = await Promise.all([readRoomContent(options), getPublicRoomRates()]);
  // The "from" price is the rate card's fromRate: the same number the concierge quotes and the
  // lowest nightly rate the booking engine will charge. No rate card → no price on the page.
  return {
    ...content,
    data: content.data.map((room) => {
      const rate = rates?.[room.id] ?? null;
      return { ...room, rate, startingPrice: rate?.fromRate ?? null };
    }),
  };
}

function readRoomContent(options?: ReadOptions): Promise<ContentResult<RoomContent[]>> {
  return readContent(
    {
      domain: "rooms",
      key: "rooms:published",
      tags: ["media"],
      load: async (db) => {
        const rows = (await db.query<RoomRow>(`SELECT ${ROOM_COLUMNS} FROM rooms ORDER BY sort_order, id`)).rows;
        if (!rows.length) return null;
        const media = await queryEntityMedia(db, "room", rows.map((row) => row.id), "gallery");
        const byRoom: Record<string, EntityMediaItem[]> = {};
        for (const item of media) (byRoom[item.entityId] ??= []).push(item);
        return toRooms(rows, byRoom);
      },
      fallback: fallbackRooms,
    },
    options,
  );
}

export async function getRoomById(id: string, options?: ReadOptions) {
  const result = await getRooms(options);
  return { data: result.data.find((room) => room.id === id) ?? null, source: result.source };
}

export async function getRoomBySlug(slug: string, options?: ReadOptions) {
  const result = await getRooms(options);
  return { data: result.data.find((room) => room.slug === slug) ?? null, source: result.source };
}
