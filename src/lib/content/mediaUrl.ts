import { sitePath } from "./validate";

/**
 * Admin uploads live in Supabase Storage. `media_assets.storage_path` then holds a storage key
 * (`supabase://<bucket>/<object>`), never a full URL, so the project URL can change without
 * rewriting rows. Seeded media keeps site-relative paths under public/images.
 */
export const STORAGE_PREFIX = "supabase://";

const OBJECT_PATTERN = /^[a-z0-9][a-z0-9_-]{1,62}\/[A-Za-z0-9/_.-]{1,400}$/;

export function storageBaseUrl() {
  const value = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "") ?? "";
  return /^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(value) ? value : null;
}

/** Public URL of a `supabase://bucket/object` key, or null when it is malformed or storage is not configured. */
export function storageObjectUrl(storagePath: string) {
  if (!storagePath.startsWith(STORAGE_PREFIX)) return null;
  const object = storagePath.slice(STORAGE_PREFIX.length);
  const base = storageBaseUrl();
  if (!base || !OBJECT_PATTERN.test(object) || object.includes("..")) return null;
  return `${base}/storage/v1/object/public/${object}`;
}

/** Displayable src for a media row: a safe site path or a Supabase public URL. */
export function mediaSrc(storagePath: unknown) {
  if (typeof storagePath !== "string") return null;
  return sitePath(storagePath) ?? storageObjectUrl(storagePath);
}
