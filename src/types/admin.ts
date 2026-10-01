import type { ReservationRecord, ReservationStatus } from "./booking";
import type { RoomId } from "./hotel";

export type AdminRoomSetting = {
  roomId: RoomId;
  baseRate: number;
  totalInventory: number;
};

export type DateInventoryOverride = {
  id: string;
  roomId: RoomId;
  date: string;
  totalInventory?: number;
  baseRate?: number;
  note?: string;
};

export type HotelOperationsConfig = {
  roomSettings: Record<RoomId, AdminRoomSetting>;
  dateOverrides: DateInventoryOverride[];
  updatedAt: string | null;
};

export type AdminReservationPatch = {
  status?: ReservationStatus;
  staffNotes?: string;
};

export type AdminOverview = {
  generatedAt: string;
  today: string;
  metrics: {
    arrivals: number;
    departures: number;
    inHouse: number;
    pendingPayments: number;
    paymentReviews: number;
    confirmedToday: number;
    occupiedRooms: number;
    totalRooms: number;
    occupancyPercent: number;
  };
  reservations: ReservationRecord[];
  inventory: Array<{
    date: string;
    roomId: RoomId;
    total: number;
    booked: number;
    held: number;
    blocked: number;
    available: number;
    baseRate: number;
  }>;
  blocks: Array<{ id: string; roomId: RoomId; date: string; quantity: number; reason?: string }>;
  operations: HotelOperationsConfig;
};
