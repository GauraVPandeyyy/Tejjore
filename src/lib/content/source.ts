import "server-only";
import { cachedContent } from "./cache";
import { contentDatabase, type ContentDb } from "./db";
import { CONTENT_TAGS, type ContentDomain } from "./tags";
import type { ContentResult } from "./types";

export type { ContentDb };

export type ReadOptions = {
  /** Injected database (tests). Bypasses the Next.js data cache and the failure circuit. */
  db?: ContentDb;
  /** Clock for time-windowed content (offers, announcements). */
  now?: Date;
};

/** A loader returns null when the domain has never been seeded, which also selects the fallback. */
type Loader<T> = (db: ContentDb) => Promise<T | null>;

// After a failure, skip the database for that domain briefly instead of waiting on a timeout for
// every component on the page. Per domain, so one broken table cannot hide the others.
const CIRCUIT_MS = 30_000;
const openUntil = new Map<ContentDomain, number>();
const lastLogged = new Map<ContentDomain, number>();

function describe(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "42P01" || code === "42703") return "content tables are missing; run: npm run db:migrate";
  return error instanceof Error ? error.message.split("\n")[0] : "unknown error";
}

function reportFailure(domain: ContentDomain, error: unknown) {
  const now = Date.now();
  openUntil.set(domain, now + CIRCUIT_MS);
  if (now - (lastLogged.get(domain) ?? 0) > 5 * 60_000) {
    lastLogged.set(domain, now);
    console.warn(`[content] ${domain}: database read failed, using fallback content (${describe(error)})`);
  }
}

/**
 * DB → validate/filter → domain object, else the safe TypeScript fallback. The fallback is built
 * by the caller from src/data and passes through the same publication rules.
 */
export async function readContent<T>(
  spec: { domain: ContentDomain; key: string; tags?: ContentDomain[]; load: Loader<T>; fallback: () => T },
  options: ReadOptions = {},
): Promise<ContentResult<T>> {
  const fallback = (): ContentResult<T> => ({ data: spec.fallback(), source: "fallback" });

  if (options.db) {
    try {
      const data = await spec.load(options.db);
      return data === null ? fallback() : { data, source: "database" };
    } catch (error) {
      reportFailure(spec.domain, error);
      return fallback();
    }
  }

  const db = contentDatabase();
  if (!db) return fallback();
  if ((openUntil.get(spec.domain) ?? 0) > Date.now()) return fallback();

  const tags = [...new Set([spec.domain, ...(spec.tags ?? [])])].map((domain) => CONTENT_TAGS[domain]);
  try {
    // null ("not seeded") is cached too, until the seed's revalidation or the time-based refresh.
    const data = await cachedContent(() => spec.load(db), spec.key, tags)();
    return data === null ? fallback() : { data, source: "database" };
  } catch (error) {
    reportFailure(spec.domain, error);
    return fallback();
  }
}

/** Test helper: forget circuit state between cases. */
export function resetContentCircuit() {
  openUntil.clear();
  lastLogged.clear();
}
