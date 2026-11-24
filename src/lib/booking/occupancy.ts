import "server-only";
import { getRooms } from "@/lib/content/rooms";
import type { OccupancyLimits } from "./validation";

/** Live per-room occupancy from the admin-managed room records (Phase 2 content layer). */
export async function roomOccupancy(): Promise<Record<string, OccupancyLimits>> {
  const { data } = await getRooms();
  return Object.fromEntries(data.map((room) => [room.id, { maxAdults: room.maxAdults, maxChildren: room.maxChildren }]));
}
