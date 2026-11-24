// Types for the parts of migrations.mjs that TypeScript sources import (QA content database).
export type MigrationDb = {
  exec(sql: string): Promise<unknown>;
  query(text: string, params?: unknown[]): Promise<{ rows: object[] }>;
};
export type Migration = { id: string; number: number; checksum: string; body: string };
export function loadMigrations(dir: string): Promise<Migration[]>;
export function applyMigrations(db: MigrationDb, migrations: Migration[], options?: { log?: (line: string) => void }): Promise<unknown>;
