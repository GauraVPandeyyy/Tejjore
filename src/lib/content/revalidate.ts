import "server-only";
import { revalidateTag } from "next/cache";
import { CONTENT_TAGS, type ContentDomain } from "./tags";

const globalForRevalidate = globalThis as typeof globalThis & { __tejjoraRevalidateSpy?: ((tags: string[]) => void) | null };

/**
 * Invalidate only the content domains an admin mutation touched (Phase 3). Admin saves run in
 * Route Handlers, where `updateTag` is unavailable, so the edit expires immediately with
 * `{ expire: 0 }` (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md).
 *
 * Never throws: the edit is already committed, and the 600 s time-based refresh still applies.
 */
export function revalidateContent(...domains: ContentDomain[]) {
  const tags = [...new Set(domains)].map((domain) => CONTENT_TAGS[domain]);
  if (globalForRevalidate.__tejjoraRevalidateSpy) {
    globalForRevalidate.__tejjoraRevalidateSpy(tags);
    return tags;
  }
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      console.error(`[content] could not revalidate ${tag}`, error instanceof Error ? error.message : error);
    }
  }
  return tags;
}

/** Tests only: record revalidated tags instead of calling Next.js (null restores the default). */
export function setRevalidateSpyForTests(spy: ((tags: string[]) => void) | null) {
  globalForRevalidate.__tejjoraRevalidateSpy = spy;
}
