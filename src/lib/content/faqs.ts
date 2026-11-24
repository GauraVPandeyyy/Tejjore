import "server-only";
import { faqRows } from "./catalog";
import type { FaqRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, Faq } from "./types";
import { bool, mapRows, text } from "./validate";

function mapFaq(row: FaqRow): Faq {
  return {
    id: text(row, "id", 200),
    category: text(row, "category", 40),
    question: text(row, "question", 300),
    answer: text(row, "answer", 3000),
    published: bool(row, "published"),
  };
}

const toPublished = (rows: FaqRow[]) => mapRows("faqs", rows, mapFaq).filter((faq) => faq.published);

/**
 * Published FAQs in display order. An empty table (never seeded) falls back to the current
 * FAQ copy; once seeded, unpublishing every FAQ is respected.
 */
export async function getPublishedFaqs(options?: ReadOptions): Promise<ContentResult<Faq[]>> {
  return readContent(
    {
      domain: "faq",
      key: "faqs:published",
      load: async (db) => {
        const rows = (
          await db.query<FaqRow>(
            `SELECT id, category, question, answer, sort_order, published, approved_by,
                    to_char(approved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS approved_at
               FROM faqs ORDER BY sort_order, id`,
          )
        ).rows;
        return rows.length ? toPublished(rows) : null;
      },
      fallback: () => toPublished(faqRows()),
    },
    options,
  );
}
