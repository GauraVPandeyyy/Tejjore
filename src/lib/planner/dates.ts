/** Date helpers for the planner. All values are ISO `YYYY-MM-DD` strings in the hotel's (India) calendar. */

const noon = (value: string) => new Date(`${value}T12:00:00Z`);

export function addDays(value: string, days: number) {
  if (!value) return "";
  const date = noon(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(from: string, to: string) {
  if (!from || !to) return 0;
  return Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(value: string) {
  return noon(value).getUTCDay();
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(noon(value));
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "UTC" }).format(noon(value));
}

export function formatWeekdayMonth(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", month: "short", timeZone: "UTC" }).format(noon(value));
}

export type StayPreset = { id: string; label: string; checkIn: string; checkOut: string };

/**
 * Quick date choices relative to `today`: this weekend (Friday to Sunday; on a Friday, what is left of
 * it; omitted on a Saturday or Sunday), the next weekend, and short stays starting tomorrow. Every
 * preset starts after today and spans at least one night.
 */
export function stayPresets(today: string): StayPreset[] {
  const tomorrow = addDays(today, 1);
  const weekday = weekdayOf(today);
  // The first Friday strictly after today.
  const friday = addDays(today, (5 - weekday + 7) % 7 || 7);
  const presets: StayPreset[] = [];
  if (weekday >= 1 && weekday <= 4) {
    presets.push({ id: "this-weekend", label: "This weekend", checkIn: friday, checkOut: addDays(friday, 2) });
    presets.push({ id: "next-weekend", label: "Next weekend", checkIn: addDays(friday, 7), checkOut: addDays(friday, 9) });
  } else {
    if (weekday === 5) presets.push({ id: "this-weekend", label: "This weekend", checkIn: tomorrow, checkOut: addDays(tomorrow, 1) });
    presets.push({ id: "next-weekend", label: "Next weekend", checkIn: friday, checkOut: addDays(friday, 2) });
  }
  for (const nights of [1, 3, 7]) {
    presets.push({ id: `nights-${nights}`, label: nights === 7 ? "A week from tomorrow" : `${nights} night${nights === 1 ? "" : "s"} from tomorrow`, checkIn: tomorrow, checkOut: addDays(tomorrow, nights) });
  }
  return presets;
}
