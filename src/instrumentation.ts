import { productionConfigProblems } from "@/lib/config/productionChecks";

/**
 * Runs once when a server instance starts. Production misconfigurations are logged loudly by
 * variable NAME (never value). Each affected feature also fails closed on its own: payments are
 * disabled without the webhook secret, plain-text admin passwords are ignored, unverified
 * database TLS is refused, and builds stop without NEXT_PUBLIC_SITE_URL (next.config.ts).
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  for (const problem of productionConfigProblems()) console.error(`[config] ${problem}`);
}
