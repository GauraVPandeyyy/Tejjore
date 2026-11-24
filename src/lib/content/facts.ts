import "server-only";
import { propertyFactRows } from "./catalog";
import { isPublicFact } from "./rules";
import type { PropertyFactRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, FactValue, PropertyFact, PublicFacts } from "./types";
import { InvalidRow, bool, mapRows, oneOf, text } from "./validate";

const STATUSES = ["verified", "provisional", "placeholder", "conflict"] as const;

function mapFact(row: PropertyFactRow): PropertyFact {
  if (row.value === undefined) throw new InvalidRow("value: missing");
  return {
    key: text(row, "key", 80),
    value: row.value,
    status: oneOf(row, "status", STATUSES),
    source: text(row, "source", 300),
    public: bool(row, "public"),
  };
}

/** Only verified + public facts leave this module; the rule is re-applied after the SQL filter. */
function publicEntries(rows: PropertyFactRow[]) {
  return mapRows("property_facts", rows, mapFact)
    .filter(isPublicFact)
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((fact) => ({ key: fact.key, value: fact.value }));
}

function toPublicFacts(entries: Array<{ key: string; value: FactValue }>): PublicFacts {
  const byKey = new Map(entries.map((entry) => [entry.key, entry.value]));
  return {
    entries,
    get: (key) => byKey.get(key),
    text: (key) => {
      const value = byKey.get(key);
      return typeof value === "string" ? value : undefined;
    },
  };
}

/**
 * Public property facts for pages, structured data and the AI. Never returns provisional,
 * placeholder, conflict or private facts, from the database or from the fallback.
 */
export async function getPublicPropertyFacts(options?: ReadOptions): Promise<ContentResult<PublicFacts>> {
  const result = await readContent(
    {
      domain: "facts",
      key: "facts:public",
      load: async (db) => {
        const rows = (
          await db.query<PropertyFactRow>(
            "SELECT key, value, status, source, public, notes FROM property_facts WHERE status = 'verified' AND public ORDER BY key",
          )
        ).rows;
        if (rows.length) return publicEntries(rows);
        const total = await db.query<{ total: number }>("SELECT count(*)::int AS total FROM property_facts");
        return Number(total.rows[0]?.total ?? 0) > 0 ? [] : null;
      },
      fallback: () => publicEntries(propertyFactRows()),
    },
    options,
  );
  return { data: toPublicFacts(result.data), source: result.source };
}

export async function getPublicPropertyFact(key: string, options?: ReadOptions) {
  const result = await getPublicPropertyFacts(options);
  return { data: result.data.get(key), source: result.source };
}
