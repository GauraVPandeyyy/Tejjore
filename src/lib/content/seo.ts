import "server-only";
import type { Metadata } from "next";
import { mapMediaAsset } from "./media";
import type { MediaAssetRow, SeoPageRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, SeoPage } from "./types";
import { bool, mapRows, optionalText, text } from "./validate";

type SeoJoinRow = SeoPageRow & Partial<Omit<MediaAssetRow, "id" | "notes">> & { media_id: string | null };

function mapSeoPage(row: SeoJoinRow): SeoPage {
  let ogImage = null;
  if (row.media_id && row.storage_path) {
    try {
      ogImage = mapMediaAsset({ ...(row as unknown as MediaAssetRow), id: row.media_id });
    } catch {
      ogImage = null;
    }
  }
  return {
    path: text(row, "path", 200),
    title: optionalText(row, "title", 120),
    description: optionalText(row, "description", 320),
    ogImage,
    noindex: bool(row, "noindex"),
  };
}

/** Per-path override, or null. Routes without a row keep their code-defined metadata. */
export async function getSeoPage(path: string, options?: ReadOptions): Promise<ContentResult<SeoPage | null>> {
  return readContent<SeoPage | null>(
    {
      domain: "seo",
      key: `seo:${path}`,
      tags: ["media"],
      load: async (db) => {
        const rows = (
          await db.query<SeoJoinRow>(
            `SELECT s.path, s.title, s.description, s.og_media_id, s.noindex,
                    m.id AS media_id, m.storage_path, m.width, m.height, m.blur_data, m.alt, m.credit, m.provenance, m.licence, m.source_url
               FROM seo_pages s LEFT JOIN media_assets m ON m.id = s.og_media_id
              WHERE s.path = $1`,
            [path],
          )
        ).rows;
        return mapRows("seo_pages", rows, mapSeoPage)[0] ?? null;
      },
      fallback: () => null,
    },
    options,
  );
}

/** Route helper for `generateMetadata`: the page's own metadata plus its admin SEO override. */
export async function seoMetadata(path: string, base: Metadata): Promise<Metadata> {
  return applySeoOverride(base, (await getSeoPage(path)).data);
}

/**
 * Merge a stored override onto the page's own metadata (wired into the public routes in Phase 3C).
 * Only property-media OG images are used, never placeholder or illustrative art.
 */
export function applySeoOverride(base: Metadata, page: SeoPage | null): Metadata {
  if (!page) return base;
  const merged: Metadata = { ...base };
  if (page.title) merged.title = page.title;
  if (page.description) merged.description = page.description;
  if (page.noindex) merged.robots = { index: false, follow: true };
  if (page.ogImage && (page.ogImage.provenance === "tejjora" || page.ogImage.provenance === "licensed")) {
    merged.openGraph = { ...(base.openGraph ?? {}), images: [{ url: page.ogImage.src, alt: page.ogImage.alt }] };
  }
  return merged;
}
