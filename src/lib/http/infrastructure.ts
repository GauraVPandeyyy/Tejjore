/**
 * Separates "the service's backing infrastructure is unreachable or misconfigured" from "a bug".
 * Both end as a 503, but an operator needs to know which: the first is fixed in environment
 * variables or at the database host, the second in code. The classification is used for the
 * server log (variable NAMES and a hint only, never values) and for the public error code, so the
 * site can tell guests to contact the hotel instead of pretending a retry will help.
 */
export type InfrastructureFailure = {
  kind: "database-unreachable" | "database-auth" | "database-schema" | "storage-not-configured" | "storage-busy";
  /** What to check. Names variables, never their values. */
  hint: string;
};

function text(error: unknown) {
  if (error instanceof Error) {
    const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    return `${code} ${error.name} ${error.message}`.toLowerCase();
  }
  return String(error).toLowerCase();
}

export function classifyInfrastructureError(error: unknown): InfrastructureFailure | null {
  const message = text(error);
  if (/requires database_url|database_url is not configured/.test(message)) {
    return { kind: "storage-not-configured", hint: "DATABASE_URL is not set but production booking persistence needs it (JSON file storage is development-only)." };
  }
  if (/booking store is busy/.test(message)) {
    return { kind: "storage-busy", hint: "The development JSON store lock was held for 5 s; retry, or remove a stale .data/*.lock folder." };
  }
  if (/tenant\/user .* not found|tenant or user not found|password authentication failed|28p01|sasl|no pg_hba|authentication failed/.test(message)) {
    return { kind: "database-auth", hint: "DATABASE_URL: the database host rejected the user or project (for a Supabase pooler check the project ref in the user name, the region host, and the password); the project may also be paused." };
  }
  if (/42p01|relation .* does not exist/.test(message)) {
    return { kind: "database-schema", hint: "The database is reachable but a table is missing: apply db/migrations (npm run db:migrate) to this database." };
  }
  if (/enotfound|econnrefused|etimedout|ehostunreach|enetunreach|connection terminated|timeout expired|connect timeout|getaddrinfo/.test(message)) {
    return { kind: "database-unreachable", hint: "DATABASE_URL: the database host could not be reached (DNS, firewall/IP allow-list, IPv6-only host, or the instance is down)." };
  }
  return null;
}
