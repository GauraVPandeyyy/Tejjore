// Shared pg client settings for the migration/seed scripts. Mirrors src/lib/database/tls.ts:
// DATABASE_SSL=true verifies the server certificate against DATABASE_SSL_CA (PEM),
// DATABASE_SSL_CA_BASE64 or the public CA store (DATABASE_SSL_USE_SYSTEM_CA=true).
// An unverified connection is only allowed outside production, with a warning.
const SSL_URL_PARAMS = ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"];

export function pgClientConfig(env = process.env) {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  if (env.DATABASE_SSL !== "true") return { connectionString: raw };

  let connectionString = raw;
  try {
    const url = new URL(raw);
    for (const param of SSL_URL_PARAMS) url.searchParams.delete(param);
    connectionString = url.toString();
  } catch {
    // keep as-is
  }

  const pem = env.DATABASE_SSL_CA?.trim()?.replace(/\\n/g, "\n")
    || (env.DATABASE_SSL_CA_BASE64?.trim() ? Buffer.from(env.DATABASE_SSL_CA_BASE64.trim(), "base64").toString("utf8") : "");
  if (pem) return { connectionString, ssl: { rejectUnauthorized: true, ca: pem } };
  if (env.DATABASE_SSL_USE_SYSTEM_CA === "true") return { connectionString, ssl: { rejectUnauthorized: true } };
  if (env.NODE_ENV === "production") {
    console.error("DATABASE_SSL=true in production requires DATABASE_SSL_CA, DATABASE_SSL_CA_BASE64 or DATABASE_SSL_USE_SYSTEM_CA=true.");
    process.exit(1);
  }
  console.warn("WARNING: database TLS certificate is NOT verified. Set DATABASE_SSL_CA to verify the server.");
  return { connectionString, ssl: { rejectUnauthorized: false } };
}
