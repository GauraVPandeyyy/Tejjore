/**
 * Grounding validator. A model answer is shown only if every figure in it can be traced to this
 * turn's tool results (or, for dates, times and guest counts, to the guest's own message):
 * rupee amounts, distances and durations, dates, times, room counts, phone numbers, and links.
 * Anything else makes the caller discard the text and render the deterministic answer built from
 * the tool results, so a crafted message or a model slip can never alter a price or invent a fact.
 */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export type Allowed = {
  numbers: Set<number>;
  dates: Set<string>;
  times: Set<string>;
  digitRuns: string[];
  corpus: string;
};

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const TIME = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/gi;
const ISO_DATE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
const NAMED_DATE = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi;
const MONTH_FIRST = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi;

const pad = (value: number | string) => String(value).padStart(2, "0");
const monthDay = (month: number, day: number) => `${pad(month)}-${pad(day)}`;
const monthIndex = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;

function toNumber(raw: string) {
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function timeKeys(text: string) {
  const keys: string[] = [];
  for (const match of text.matchAll(TIME)) {
    if (match[4] !== undefined) keys.push(`${pad(Number(match[4]))}:${match[5]}`);
    else {
      let hours = Number(match[1]) % 12;
      if (match[3].toLowerCase() === "pm") hours += 12;
      keys.push(`${pad(hours)}:${match[2] ?? "00"}`);
    }
  }
  return keys;
}

function dateKeys(text: string) {
  const keys: string[] = [];
  for (const match of text.matchAll(ISO_DATE)) keys.push(monthDay(Number(match[2]), Number(match[3])));
  for (const match of text.matchAll(NAMED_DATE)) keys.push(monthDay(monthIndex(match[2]), Number(match[1])));
  for (const match of text.matchAll(MONTH_FIRST)) keys.push(monthDay(monthIndex(match[1]), Number(match[2])));
  return keys;
}

function digitRuns(text: string) {
  return [...text.matchAll(/\+?\d[\d\s-]{8,}\d/g)].map((match) => match[0].replace(/\D/g, "")).filter((run) => run.length >= 9);
}

/** Collects everything a value in the model's text may legitimately be. */
export function collectAllowed(sources: unknown[]): Allowed {
  const corpus = sources.map((source) => (typeof source === "string" ? source : JSON.stringify(source))).join("\n");
  const numbers = new Set<number>();
  for (const match of corpus.matchAll(NUMBER)) {
    const value = toNumber(match[0]);
    if (value !== null) numbers.add(value);
  }
  return { numbers, dates: new Set(dateKeys(corpus)), times: new Set(timeKeys(corpus)), digitRuns: digitRuns(corpus), corpus: corpus.toLowerCase() };
}

/** Words that name facts the hotel has not confirmed; the model may only mention them if a tool did. */
const SENSITIVE = ["pet", "pets", "smoking", "refund", "refundable", "cancellation", "cancel", "check-in time", "check-out time", "early check-in", "late check-out", "swimming pool", "gym", "spa", "elevator", "lift", "bathtub", "balcony", "view of the lake", "lake-facing", "sea view", "free breakfast", "complimentary breakfast", "airport pickup is free", "shuttle", "wheelchair", "accessible", "id proof", "deposit", "gst"];

export type GroundingResult = { ok: true } | { ok: false; reasons: string[] };

export function verifyGrounding(text: string, tools: Allowed, guest: Allowed): GroundingResult {
  const reasons: string[] = [];

  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|in|co|net|org|io)\b/i.test(text)) reasons.push("link in text");

  for (const match of text.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:rupees|rs\b)/gi)) {
    const value = toNumber(match[1] ?? match[2]);
    if (value === null || !tools.numbers.has(value)) reasons.push(`amount ${match[0].trim()}`);
  }

  for (const match of text.matchAll(/(\d+(?:\.\d+)?)[\s-]*(km|kms|kilomet\w*|miles?|minutes?|mins?|hours?|hrs?)\b/gi)) {
    const value = toNumber(match[1]);
    if (value === null || !tools.numbers.has(value)) reasons.push(`distance or duration ${match[0].trim()}`);
  }

  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|per ?cent)/gi)) {
    const value = toNumber(match[1]);
    if (value === null || !tools.numbers.has(value)) reasons.push(`percentage ${match[0].trim()}`);
  }

  for (const key of dateKeys(text)) if (!tools.dates.has(key) && !guest.dates.has(key)) reasons.push(`date ${key}`);
  for (const key of timeKeys(text)) if (!tools.times.has(key) && !guest.times.has(key)) reasons.push(`time ${key}`);

  for (const match of text.matchAll(/(\d+)\s+(?:rooms?|suites?|categories|room categories)\b/gi)) {
    const value = Number(match[1]);
    if (!tools.numbers.has(value) && !guest.numbers.has(value)) reasons.push(`count ${match[0]}`);
  }

  for (const run of digitRuns(text)) {
    if (!tools.digitRuns.some((known) => known.endsWith(run) || run.endsWith(known))) reasons.push("phone number");
  }

  const lower = text.toLowerCase();
  for (const term of SENSITIVE) {
    const pattern = new RegExp(`(?<![a-z])${term.replace(/-/g, "[- ]")}(?![a-z])`, "i");
    if (pattern.test(lower) && !pattern.test(tools.corpus)) reasons.push(`unverified topic ${term}`);
  }

  return reasons.length ? { ok: false, reasons: [...new Set(reasons)] } : { ok: true };
}
