import "server-only";
import dns from "node:dns";

const globalForDns = globalThis as typeof globalThis & { __tejjoraDnsRetry?: boolean };

/**
 * Some home/office resolvers intermittently answer ENOTFOUND/EAI_AGAIN for a host that exists, and a
 * single such failure used to take the whole booking flow down. This retries only the database host's
 * lookup a few times; every other hostname is untouched.
 */
export function installDatabaseDnsRetry(databaseUrl: string | undefined) {
  if (globalForDns.__tejjoraDnsRetry || !databaseUrl) return;
  let databaseHost: string;
  try {
    databaseHost = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return;
  }
  globalForDns.__tejjoraDnsRetry = true;

  const original = dns.lookup;
  const retrying = ((hostname: string, ...rest: unknown[]) => {
    const callback = rest.pop() as (...args: unknown[]) => void;
    if (typeof hostname !== "string" || hostname.toLowerCase() !== databaseHost) {
      return (original as (...args: unknown[]) => unknown)(hostname, ...rest, callback);
    }
    const attempt = (n: number): void => {
      (original as (...args: unknown[]) => unknown)(hostname, ...rest, (error: NodeJS.ErrnoException | null, ...result: unknown[]) => {
        if (error && (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") && n < 5) {
          setTimeout(() => attempt(n + 1), 150 * n);
          return;
        }
        callback(error, ...result);
      });
    };
    attempt(1);
  }) as unknown as typeof dns.lookup;
  Object.assign(retrying, original);
  dns.lookup = retrying;
}
