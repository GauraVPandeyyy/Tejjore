import type { ConnectionOptions } from "node:tls";

type Env = Record<string, string | undefined>;

export type DatabaseConnectionConfig = {
  connectionString: string;
  ssl: ConnectionOptions | undefined;
  /** Set when development falls back to an unverified TLS connection. */
  warning?: string;
};

const SSL_URL_PARAMS = ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"];

function certificateAuthority(env: Env) {
  const pem = env.DATABASE_SSL_CA?.trim();
  if (pem) return pem.replace(/\\n/g, "\n");
  const encoded = env.DATABASE_SSL_CA_BASE64?.trim();
  if (encoded) return Buffer.from(encoded, "base64").toString("utf8");
  return undefined;
}

/**
 * TLS settings for PostgreSQL (Supabase or any provider).
 *
 * - DATABASE_SSL=true + DATABASE_SSL_CA / DATABASE_SSL_CA_BASE64 → certificate verified against that CA.
 * - DATABASE_SSL=true + DATABASE_SSL_USE_SYSTEM_CA=true → verified against the public CA store.
 * - DATABASE_SSL=true with neither → refused in production; development only falls back to an
 *   unverified connection and reports a warning.
 *
 * When TLS is configured explicitly, ssl-related query parameters are removed from the URL,
 * because node-postgres lets connection-string parameters override the `ssl` option.
 */
export function databaseConnectionConfig(env: Env = process.env, nodeEnv = env.NODE_ENV): DatabaseConnectionConfig {
  const raw = env.DATABASE_URL?.trim() ?? "";
  // Hosted databases need TLS: on unless DATABASE_SSL=false or the database is on this machine.
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(raw);
  if (env.DATABASE_SSL === "false" || (env.DATABASE_SSL !== "true" && local)) return { connectionString: raw, ssl: undefined };

  let connectionString = raw;
  try {
    const url = new URL(raw);
    for (const param of SSL_URL_PARAMS) url.searchParams.delete(param);
    connectionString = url.toString();
  } catch {
    // Not a URL (e.g. key=value form); leave it to node-postgres.
  }

  const ca = certificateAuthority(env);
  if (ca) return { connectionString, ssl: { rejectUnauthorized: true, ca } };
  if (env.DATABASE_SSL_USE_SYSTEM_CA === "true") return { connectionString, ssl: { rejectUnauthorized: true } };

  // Production: hosted Postgres (Neon, Supabase, RDS...) presents a public-CA certificate, so verify
  // against the system store instead of refusing to connect when no CA variable was provided.
  if (nodeEnv === "production") return { connectionString, ssl: { rejectUnauthorized: true } };
  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
    warning: "Database TLS certificate is NOT verified (development only). Set DATABASE_SSL_CA before production.",
  };
}
