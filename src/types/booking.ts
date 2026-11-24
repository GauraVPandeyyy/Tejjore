import type { RoomId } from "./hotel";

export type BookingStep = "stay" | "room" | "checkout";
export type ReservationStatus = "initiated" | "payment_pending" | "payment_review" | "confirmed" | "payment_failed" | "cancelled" | "completed";
export type PaymentStatus = "not_started" | "pending" | "paid" | "failed" | "refunded";
export type ConfirmationEmailStatus = "not_sent" | "sending" | "sent" | "failed" | "unavailable";

export type BookingStay = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
};

export type BookingGuest = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContact: "whatsapp" | "phone" | "email";
  companyName?: string;
  gstNumber?: string;
  arrivalNotes?: string;
  specialRequests: string;
};

export type BookingDraft = {
  stay: BookingStay;
  roomId: RoomId | null;
  ratePlanId: string | null;
  addonIds: string[];
  promoCode?: string;
  guest: BookingGuest;
  acknowledgement: boolean;
};

export type PriceBreakdown = {
  currency: "INR";
  nights: number;
  baseRatePerRoomNight: number;
  nightlyRates?: Array<{ date: string; rate: number }>;
  roomSubtotal: number;
  rateAdjustment: number;
  extraGuestCharge: number;
  childrenCharge: number;
  extrasTotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  hasUnconfiguredCharges: boolean;
};

export type BookingRequestPayload = {
  stay: BookingStay;
  roomId: RoomId;
  ratePlanId: string;
  addonIds: string[];
  promoCode?: string;
  guest: BookingGuest;
  source: "website";
};

/**
 * One gateway payment applied to a reservation. The ledger is append-only and keyed by
 * paymentId, so duplicate events are idempotent and a second payment never overwrites the first.
 * - amountSource "gateway": amount reported by Razorpay (webhook).
 * - amountSource "order": inferred from the reservation's own order (browser verify / test mode).
 * - amountSource "unverified": a signed payment whose amount could not be established; needs review.
 */
export type PaymentLedgerEntry = {
  paymentId: string;
  amountPaise: number;
  amountSource: "gateway" | "order" | "unverified";
  orderId?: string;
  orderMatched: boolean;
  source: "browser-verify" | "webhook" | "test" | "legacy";
  recordedAt: string;
};

export type ReservationRecord = BookingRequestPayload & {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  pricing: PriceBreakdown;
  paymentOrderId?: string;
  paymentId?: string;
  payments?: PaymentLedgerEntry[];
  staffNotes?: string;
  accessTokenHash?: string;
  confirmationEmailStatus?: ConfirmationEmailStatus;
  confirmationEmailSentAt?: string;
  confirmationEmailError?: string;
};

export type BookingRequestResponse = {
  reference: string;
  createdAt: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  pricing: PriceBreakdown;
  paymentAvailable: boolean;
  paymentMode: "razorpay" | "test" | "unavailable";
  accessToken: string;
  bookingReceivedEmailStatus?: "sent" | "failed" | "unavailable";
  confirmationEmailStatus?: ConfirmationEmailStatus | "not_applicable";
};

export type PublicReservationView = {
  reference: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  stay: BookingStay;
  roomId: RoomId;
  ratePlanId: string;
  addonIds: string[];
  guest: Pick<BookingGuest, "firstName" | "lastName" | "email" | "phone" | "companyName" | "gstNumber" | "arrivalNotes" | "specialRequests">;
  pricing: PriceBreakdown;
  paymentAvailable: boolean;
  paymentMode: "razorpay" | "test" | "unavailable";
  accessToken: string;
  confirmationEmailStatus?: ConfirmationEmailStatus;
  confirmationEmailSentAt?: string;
};

export type AvailabilityRoom = {
  roomId: RoomId;
  total: number;
  booked: number;
  held: number;
  blocked: number;
  available: number;
  baseRate: number;
  nightlyRates?: Array<{ date: string; rate: number }>;
};

export type PublicAvailabilityRoom = Pick<AvailabilityRoom, "roomId" | "available" | "baseRate" | "nightlyRates"> & {
  /** Per-room occupancy from the admin-managed room record; null when not yet confirmed. */
  maxAdults?: number | null;
  maxChildren?: number | null;
};

export type AvailabilityResponse = {
  checkIn: string;
  checkOut: string;
  mode: "development" | "production";
  rooms: PublicAvailabilityRoom[];
};

/** What the mobile lookup returns: enough to answer "what is the state of my booking", no contact details. */
export type MaskedReservationView = {
  reference: string;
  /** Includes `expired` (a payment-pending hold whose time ran out). */
  status: ReservationStatus | "expired";
  paymentStatus: PaymentStatus;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: { adults: number; children: number; rooms: number };
  amountDue: number;
  guestNameMasked: string;
  phoneLast4: string;
  holdActive: boolean;
};
