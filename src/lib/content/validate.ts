/**
 * Lightweight validation at the content boundary. Database rows are never trusted blindly: each
 * mapper reads fields through these helpers and throws InvalidRow on malformed data, and
 * `mapRows` drops that row (logging once) instead of crashing the page.
 */
export class InvalidRow extends Error {}

type Row = Record<string, unknown>;

export function text(row: Row, field: string, max = 10_000): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new InvalidRow(`${field}: expected text`);
  return value;
}

export function optionalText(row: Row, field: string, max = 10_000): string | null {
  const value = row[field];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > max) throw new InvalidRow(`${field}: expected text or null`);
  return value;
}

/** Accepts JS numbers and the string form node-postgres uses for NUMERIC/BIGINT. */
export function optionalNumber(row: Row, field: string, min = -Infinity, max = Infinity): number | null {
  const raw = row[field];
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "string" && raw.trim() ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new InvalidRow(`${field}: expected a number in range`);
  }
  return value;
}

export function number(row: Row, field: string, min = -Infinity, max = Infinity): number {
  const value = optionalNumber(row, field, min, max);
  if (value === null) throw new InvalidRow(`${field}: required number`);
  return value;
}

export function bool(row: Row, field: string): boolean {
  const value = row[field];
  if (typeof value !== "boolean") throw new InvalidRow(`${field}: expected boolean`);
  return value;
}

export function optionalBool(row: Row, field: string): boolean | null {
  const value = row[field];
  if (value === null || value === undefined) return null;
  return bool(row, field);
}

export function oneOf<const T extends string>(row: Row, field: string, allowed: readonly T[]): T {
  const value = row[field];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) throw new InvalidRow(`${field}: unexpected value`);
  return value as T;
}

export function stringArray(row: Row, field: string, maxItems = 50): string[] {
  const value = row[field];
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string")) {
    throw new InvalidRow(`${field}: expected a string array`);
  }
  return value as string[];
}

/** Site-relative asset path: no scheme, no traversal. Remote storage URLs arrive in Phase 3. */
export function sitePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/(?!\/)[A-Za-z0-9/_.-]+$/.test(value) && !value.includes("..") ? value : null;
}

/** ISO calendar date (YYYY-MM-DD) or null. */
export function optionalIsoDate(row: Row, field: string): string | null {
  const value = row[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InvalidRow(`${field}: expected YYYY-MM-DD`);
  return value;
}

const reported = new Set<string>();

/** Maps rows, skipping (and reporting once per row) any that fail validation. */
export function mapRows<R extends Row, T>(domain: string, rows: R[], mapper: (row: R) => T | null): T[] {
  const result: T[] = [];
  for (const row of rows) {
    try {
      const mapped = mapper(row);
      if (mapped !== null) result.push(mapped);
    } catch (error) {
      if (!(error instanceof InvalidRow)) throw error;
      const id = String(row.id ?? row.key ?? row.path ?? "?");
      const signature = `${domain}:${id}:${error.message}`;
      if (!reported.has(signature)) {
        reported.add(signature);
        console.warn(`[content] skipped invalid ${domain} row ${id} (${error.message})`);
      }
    }
  }
  return result;
}
