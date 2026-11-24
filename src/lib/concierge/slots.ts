import { addNights, extractNights, extractSingleDate, extractStayDates } from "./dateParser";
import { matchesAny, normalizeForIntent } from "./matching";
import type { ConciergeMessage } from "./provider";
import type { RoomId } from "@/types/hotel";

/**
 * What the guest has said so far, rebuilt from their own messages on every request (nothing is
 * stored). Lets follow-ups such as "and for the Premium?" or "what would 3 nights cost?" keep
 * their dates, room and party size.
 */
export type Slots = { checkIn?: string; checkOut?: string; roomId?: RoomId; adults?: number; children?: number };

export function detectRoomId(tokens: string[]): RoomId | undefined {
  if (matchesAny(tokens, ["super deluxe"])) return "super-deluxe";
  if (matchesAny(tokens, ["premium"])) return "premium";
  if (matchesAny(tokens, ["deluxe"])) return "deluxe";
  return undefined;
}

function count(text: string, pattern: RegExp, min: number, max: number) {
  const match = pattern.exec(text);
  const value = match ? Number(match[1]) : NaN;
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

export function stayFromMessage(text: string, known: Slots, now: Date) {
  const both = extractStayDates(text, now);
  if (both) return both;
  const nights = extractNights(text);
  const start = extractSingleDate(text, now) ?? (nights ? known.checkIn : undefined);
  return nights && start ? { checkIn: start, checkOut: addNights(start, nights) } : null;
}

export function extractSlots(messages: ConciergeMessage[], now = new Date()): Slots {
  const slots: Slots = {};
  for (const message of messages) {
    if (message.role !== "user") continue;
    const text = message.content;
    const stay = stayFromMessage(text, slots, now);
    if (stay) {
      slots.checkIn = stay.checkIn;
      slots.checkOut = stay.checkOut;
    } else {
      const single = extractSingleDate(text, now);
      if (single) {
        slots.checkIn = single;
        delete slots.checkOut;
      }
    }
    const room = detectRoomId(normalizeForIntent(text));
    if (room) slots.roomId = room;
    const adults = count(text, /\b(\d{1,2})\s*(?:adults?|guests?|people|persons?|pax)\b/i, 1, 8);
    if (adults) slots.adults = adults;
    const children = count(text, /\b(\d{1,2})\s*(?:children|child|kids?)\b/i, 0, 6);
    if (children !== undefined) slots.children = children;
  }
  return slots;
}
