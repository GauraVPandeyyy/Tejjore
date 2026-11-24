const monthLookup: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function validDate(year: number, monthIndex: number, day: number) {
  const date = new Date(Date.UTC(year, monthIndex, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex && date.getUTCDate() === day
    ? date
    : null;
}

function futureYearFor(monthIndex: number, day: number, now: Date) {
  const currentYear = now.getUTCFullYear();
  const candidate = validDate(currentYear, monthIndex, day);
  if (!candidate) return currentYear;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  return candidate < today ? currentYear + 1 : currentYear;
}

function findDates(input: string, now: Date): string[] {
  const text = input.trim();
  const found: Date[] = [];

  const isoPattern = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  for (const match of text.matchAll(isoPattern)) {
    const date = validDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (date) found.push(date);
  }

  if (found.length < 2) {
    const numericPattern = /\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g;
    for (const match of text.matchAll(numericPattern)) {
      const date = validDate(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
      if (date) found.push(date);
    }
  }

  if (found.length < 2) {
    const namedPattern = /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/gi;
    for (const match of text.matchAll(namedPattern)) {
      const monthIndex = monthLookup[match[2].toLowerCase()];
      if (monthIndex == null) continue;
      const day = Number(match[1]);
      const year = match[3] ? Number(match[3]) : futureYearFor(monthIndex, day, now);
      const date = validDate(year, monthIndex, day);
      if (date) found.push(date);
    }
  }

  return [...new Map(found.map((date) => [iso(date), date])).values()]
    .sort((a, b) => a.getTime() - b.getTime())
    .map(iso);
}

export type StayDates = { checkIn: string; checkOut: string };

export function extractStayDates(input: string, now = new Date()): StayDates | null {
  const unique = findDates(input, now);
  if (unique.length < 2) return null;
  const [checkIn, checkOut] = unique;
  return checkOut > checkIn ? { checkIn, checkOut } : null;
}

/** "3 nights" / "for 2 night": a stay length the guest stated (1–30). */
export function extractNights(input: string): number | null {
  const match = /\b(\d{1,2})\s*[- ]?\s*nights?\b/i.exec(input);
  const nights = match ? Number(match[1]) : 0;
  return nights >= 1 && nights <= 30 ? nights : null;
}

/** A single stated date ("from 10 Oct"), used with a stated number of nights or an earlier check-in. */
export function extractSingleDate(input: string, now = new Date()): string | null {
  const dates = findDates(input, now);
  return dates.length === 1 ? dates[0] : null;
}

export function addNights(date: string, nights: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + nights);
  return iso(value);
}
