import { unstable_cache } from "next/cache";
import { CONTENT_REVALIDATE_SECONDS } from "./tags";

/**
 * Data cache for content reads. This project does not enable `cacheComponents`, so the
 * documented Next.js 16 API for non-fetch data is `unstable_cache` with tags
 * (node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md);
 * invalidation uses `revalidateTag(tag, profile)` (see revalidate.ts).
 *
 * Rejections are never cached, so a database failure falls back for that request only.
 * Outside a Next.js request/build (tests, scripts) there is no incremental cache, and the
 * loader runs directly.
 */
export function cachedContent<T>(load: () => Promise<T>, key: string, tags: string[]): () => Promise<T> {
  const cached = unstable_cache(load, ["tejjora-content", "v1", key], { tags, revalidate: CONTENT_REVALIDATE_SECONDS });
  return async () => {
    try {
      return await cached();
    } catch (error) {
      if (error instanceof Error && error.message.includes("incrementalCache missing")) return load();
      throw error;
    }
  };
}
