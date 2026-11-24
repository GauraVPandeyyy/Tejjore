import "server-only";
import { isPublicTestimonial } from "./rules";
import type { TestimonialRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, Testimonial } from "./types";
import { bool, mapRows, oneOf, optionalIsoDate, optionalNumber, optionalText, text } from "./validate";

const SOURCES = ["google", "tripadvisor", "direct", "demo"] as const;

export function mapTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: text(row, "id", 200),
    authorDisplay: text(row, "author_display", 80),
    text: text(row, "text", 2000),
    rating: optionalNumber(row, "rating", 1, 5),
    source: oneOf(row, "source", SOURCES),
    sourceUrl: optionalText(row, "source_url", 2000),
    reviewDate: optionalIsoDate(row, "review_date"),
    consent: bool(row, "consent"),
    published: bool(row, "published"),
  };
}

/** Exported for tests: the single filter every testimonial passes before display. */
export const publicTestimonials = (rows: TestimonialRow[]) => mapRows("testimonials", rows, mapTestimonial).filter(isPublicTestimonial);

/**
 * Genuine, consented, published guest reviews. Demo review texts (src/data/reviews.ts) are never
 * a source here, so the fallback is empty: no reviews rather than invented ones.
 */
export async function getPublishedTestimonials(options?: ReadOptions): Promise<ContentResult<Testimonial[]>> {
  return readContent(
    {
      domain: "testimonials",
      key: "testimonials:published",
      load: async (db) =>
        publicTestimonials(
          (
            await db.query<TestimonialRow>(
              `SELECT id, author_display, text, rating, source, source_url,
                      to_char(review_date, 'YYYY-MM-DD') AS review_date, consent, sort_order, published
                 FROM testimonials
                WHERE published AND consent AND source <> 'demo'
                ORDER BY sort_order, review_date DESC NULLS LAST, id`,
            )
          ).rows,
        ),
      fallback: () => [],
    },
    options,
  );
}
