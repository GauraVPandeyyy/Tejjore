import "server-only";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { STORAGE_PREFIX, storageBaseUrl } from "@/lib/content/mediaUrl";

/**
 * Where processed admin uploads are stored.
 *   - Supabase Storage (production): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only; never
 *     sent to the browser) and a public bucket (SUPABASE_MEDIA_BUCKET, default "tejjora-media").
 *     Large originals can go browser → signed upload URL → staging object, so the 15 MB limit does
 *     not depend on the host's request-body limit; the server then validates, re-encodes and
 *     stores the final WebP and deletes the staging object.
 *   - Local folder (development only, never production): public/uploads/media.
 *   - Tests inject an in-memory store.
 * Without storage in production, uploads fail closed with a clear message.
 */
export type MediaStorage = {
  kind: "supabase" | "local" | "memory";
  /** Stores the final object; returns the media_assets.storage_path value. */
  put(objectPath: string, data: Uint8Array, contentType: string): Promise<string>;
  remove(storagePath: string): Promise<void>;
  createSignedUpload?(objectPath: string): Promise<string>;
  readStaged?(objectPath: string, maxBytes: number): Promise<Uint8Array>;
  removeStaged?(objectPath: string): Promise<void>;
};

const LOCAL_PREFIX = "/uploads/media/";
const globalForMedia = globalThis as typeof globalThis & { __tejjoraMediaStorageOverride?: MediaStorage | null };

const bucket = () => (process.env.SUPABASE_MEDIA_BUCKET?.trim() || "tejjora-media").toLowerCase();

function supabaseStorage(base: string, key: string): MediaStorage {
  const name = bucket();
  const headers = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${key}`, apikey: key, ...extra });
  const call = async (url: string, init: RequestInit) => {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000), cache: "no-store" });
    // Storage errors are logged by status only; the response body may echo request details.
    if (!response.ok) throw new Error(`Supabase Storage responded ${response.status}`);
    return response;
  };
  const removeObject = async (objectPath: string) => {
    await call(`${base}/storage/v1/object/${name}`, { method: "DELETE", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: [objectPath] }) });
  };
  return {
    kind: "supabase",
    async put(objectPath, data, contentType) {
      await call(`${base}/storage/v1/object/${name}/${objectPath}`, {
        method: "POST",
        headers: headers({ "Content-Type": contentType, "x-upsert": "false", "Cache-Control": "max-age=31536000" }),
        body: new Uint8Array(data),
      });
      return `${STORAGE_PREFIX}${name}/${objectPath}`;
    },
    async remove(storagePath) {
      const prefix = `${STORAGE_PREFIX}${name}/`;
      if (storagePath.startsWith(prefix)) await removeObject(storagePath.slice(prefix.length));
    },
    async createSignedUpload(objectPath) {
      const response = await call(`${base}/storage/v1/object/upload/sign/${name}/${objectPath}`, { method: "POST", headers: headers() });
      const payload = (await response.json()) as { url?: string };
      if (!payload.url?.startsWith("/")) throw new Error("Supabase Storage returned no signed upload URL");
      return `${base}/storage/v1${payload.url}`;
    },
    async readStaged(objectPath, maxBytes) {
      const response = await call(`${base}/storage/v1/object/${name}/${objectPath}`, { method: "GET", headers: headers() });
      if (Number(response.headers.get("content-length") ?? 0) > maxBytes) throw new RangeError("too large");
      const reader = response.body?.getReader();
      if (!reader) return new Uint8Array();
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel();
          throw new RangeError("too large");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return bytes;
    },
    removeStaged: removeObject,
  };
}

function localStorage(): MediaStorage {
  const root = join(process.cwd(), "public", "uploads", "media");
  return {
    kind: "local",
    async put(objectPath, data) {
      const file = join(root, basename(objectPath));
      mkdirSync(root, { recursive: true });
      writeFileSync(file, data, { flag: "wx" });
      return `${LOCAL_PREFIX}${basename(objectPath)}`;
    },
    async remove(storagePath) {
      if (!storagePath.startsWith(LOCAL_PREFIX)) return;
      try {
        unlinkSync(join(root, basename(storagePath)));
      } catch {
        // Already gone.
      }
    },
  };
}

export function mediaStorage(): MediaStorage | null {
  if (globalForMedia.__tejjoraMediaStorageOverride) return globalForMedia.__tejjoraMediaStorageOverride;
  const base = storageBaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (base && key) return supabaseStorage(base, key);
  if (process.env.NODE_ENV !== "production") return localStorage();
  return null;
}

export function mediaStorageStatus() {
  const storage = mediaStorage();
  return { mode: storage?.kind ?? "unavailable", signedUploads: Boolean(storage?.createSignedUpload) } as const;
}

/** Removes an uploaded object this app owns (seeded /images/... files are never touched). */
export async function removeStoredMedia(storagePath: string) {
  if (!storagePath.startsWith(STORAGE_PREFIX) && !storagePath.startsWith(LOCAL_PREFIX)) return;
  await mediaStorage()?.remove(storagePath);
}

/** Tests only. */
export function setMediaStorageForTests(storage: MediaStorage | null) {
  globalForMedia.__tejjoraMediaStorageOverride = storage;
}

export function memoryMediaStorage(): MediaStorage & { objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    kind: "memory",
    objects,
    async put(objectPath, data) {
      objects.set(objectPath, data);
      return `${LOCAL_PREFIX}${basename(objectPath)}`;
    },
    async remove(storagePath) {
      for (const key of objects.keys()) if (storagePath.endsWith(basename(key))) objects.delete(key);
    },
  };
}
