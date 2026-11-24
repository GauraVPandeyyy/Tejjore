import "server-only";
import { postgresConfigured, queryPostgres } from "@/lib/database/postgres";

/**
 * Gemini free-tier budget. Every request to the model is counted per day (India date) in
 * `ai_usage` when a database is configured, otherwise in memory. Over budget, or for a minute
 * after a quota/outage error, the concierge answers from its deterministic grounded router
 * instead of calling the model.
 */
const PROVIDER = "gemini";
const DEFAULT_DAILY_LIMIT = 200;

const memory = { day: "", requests: 0 };
let breakerUntil = 0;
let lastLogged = 0;

export function geminiDailyLimit() {
  const configured = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DAILY_LIMIT;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function memoryReserve(limit: number) {
  const day = today();
  if (memory.day !== day) {
    memory.day = day;
    memory.requests = 0;
  }
  if (memory.requests >= limit) return false;
  memory.requests += 1;
  return true;
}

export function geminiBreakerOpen() {
  return breakerUntil > Date.now();
}

export function tripGeminiBreaker(ms = 60_000) {
  breakerUntil = Date.now() + ms;
}

/** True when this request may be sent to the model (and counts it). */
export async function reserveGeminiRequest(): Promise<boolean> {
  if (geminiBreakerOpen()) return false;
  const limit = geminiDailyLimit();
  if (!postgresConfigured()) return memoryReserve(limit);
  try {
    const result = await queryPostgres(
      `INSERT INTO ai_usage (day, provider, requests) VALUES ($1, $2, 1)
       ON CONFLICT (day, provider) DO UPDATE SET requests = ai_usage.requests + 1 WHERE ai_usage.requests < $3
       RETURNING requests`,
      [today(), PROVIDER, limit],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (Date.now() - lastLogged > 5 * 60_000) {
      lastLogged = Date.now();
      console.warn(`[concierge] ai_usage unavailable, counting in memory (${error instanceof Error ? error.message.split("\n")[0] : "unknown"})`);
    }
    return memoryReserve(limit);
  }
}

export async function recordGeminiTokens(input: number, output: number) {
  if (!postgresConfigured() || (!input && !output)) return;
  try {
    await queryPostgres(
      "UPDATE ai_usage SET input_tokens = input_tokens + $3, output_tokens = output_tokens + $4 WHERE day = $1 AND provider = $2",
      [today(), PROVIDER, Math.max(0, Math.round(input)), Math.max(0, Math.round(output))],
    );
  } catch {
    // Token totals are informational; the request count is what enforces the budget.
  }
}

export function resetGeminiBudgetForTests() {
  memory.day = "";
  memory.requests = 0;
  breakerUntil = 0;
}
