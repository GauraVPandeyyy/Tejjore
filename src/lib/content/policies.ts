import "server-only";
import { policyRows } from "./catalog";
import { isPublicPolicy } from "./rules";
import type { PolicyRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, Policy } from "./types";
import { bool, mapRows, optionalText, text } from "./validate";

function mapPolicy(row: PolicyRow): Policy {
  return {
    id: text(row, "id", 200),
    slug: text(row, "slug", 120),
    title: text(row, "title", 160),
    body: text(row, "body", 6000),
    published: bool(row, "published"),
    approvedAt: optionalText(row, "approved_at", 40),
  };
}

const toPublic = (rows: PolicyRow[]) => mapRows("policies", rows, mapPolicy).filter(isPublicPolicy);

/**
 * Hotel-approved, published policies only. The generic guidance in src/data/policies.ts is never
 * returned here: it is placeholder text, so the policies page presents it as general guidance.
 */
export async function getPublishedPolicies(options?: ReadOptions): Promise<ContentResult<Policy[]>> {
  return readContent(
    {
      domain: "policies",
      key: "policies:published",
      load: async (db) =>
        toPublic(
          (
            await db.query<PolicyRow>(
              `SELECT id, slug, title, body, sort_order, published, approved_by,
                      to_char(approved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS approved_at
                 FROM policies WHERE published AND approved_at IS NOT NULL ORDER BY sort_order, slug`,
            )
          ).rows,
        ),
      fallback: () => toPublic(policyRows()),
    },
    options,
  );
}
