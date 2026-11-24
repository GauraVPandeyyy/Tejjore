import type { BookingStay, PaymentStatus, PriceBreakdown, ReservationRecord, ReservationStatus } from "./booking";
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

/** Reservation fields returned in admin list views (overview). No contact details or tokens. */
export type AdminReservationSummary = {
  reference: string;
  guestName: string;
  phoneLast4: string;
  roomId: RoomId;
  stay: BookingStay;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  pricing: Pick<PriceBreakdown, "grandTotal" | "amountPaid" | "amountDue">;
  createdAt: string;
  updatedAt: string;
};

/** Full staff view of one reservation, served only by GET /api/admin/reservations/[reference]. */
export type AdminReservationDetail = Omit<ReservationRecord, "accessTokenHash">;

/** One page of a server-paginated admin list. */
export type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

/** Today view. Arrival/departure lists are included only for roles that may view reservations. */
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
  arrivals?: AdminReservationSummary[];
  departures?: AdminReservationSummary[];
};

export type AdminPaymentsView = {
  metrics: { paid: number; pending: number; failed: number; amountPaid: number; outstanding: number };
  records: AdminPage<AdminReservationSummary>;
};

/** Availability & Rates view: 14-day grid, room settings, every block and date override. */
export type AdminInventoryView = {
  generatedAt: string;
  today: string;
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
