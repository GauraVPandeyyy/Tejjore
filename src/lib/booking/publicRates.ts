import "server-only";
import { cachedContent } from "@/lib/content/cache";
import { CONTENT_TAGS } from "@/lib/content/tags";
import type { RoomId } from "@/types/hotel";
import { operationalRoomIds } from "./operations";
import { buildPublicRoomRates, type PublicRoomRates, type RoomRateCard } from "./rateCard";
import { readOperationsConfig } from "./store";
import { todayInIndia } from "./validation";

let lastLogged = 0;

async function loadRates(today: string) {
  return buildPublicRoomRates(await readOperationsConfig(), operationalRoomIds, today);
}

/**
 * Public room prices from the admin booking configuration (single source of truth). Cached per
 * India date under the `rates` tag; admin rate saves expire it immediately (see revalidate.ts).
 *
 * Returns null when the booking configuration cannot be read: the site then shows no price
 * ("see rates for your dates") instead of a number the booking engine might not honour.
 */
export async function getPublicRoomRates(): Promise<PublicRoomRates | null> {
  const today = todayInIndia();
  try {
    return await cachedContent(() => loadRates(today), `rates:${today}`, [CONTENT_TAGS.rates])();
  } catch (error) {
    const now = Date.now();
    if (now - lastLogged > 5 * 60_000) {
      lastLogged = now;
      console.warn(`[rates] booking configuration unavailable, hiding public prices (${error instanceof Error ? error.message.split("\n")[0] : "unknown error"})`);
    }
    return null;
  }
}

export async function getPublicRoomRate(roomId: RoomId): Promise<RoomRateCard | null> {
  return (await getPublicRoomRates())?.[roomId] ?? null;
}
