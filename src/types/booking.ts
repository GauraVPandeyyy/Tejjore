import type { RoomId } from "./hotel";

export type BookingStep = "stay" | "room" | "checkout";
export type ReservationStatus = "initiated" | "payment_pending" | "payment_review" | "confirmed" | "payment_failed" | "cancelled" | "completed";
export type PaymentStatus = "not_started" | "pending" | "paid" | "failed" | "refunded";

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
  staffNotes?: string;
  accessTokenHash?: string;
  confirmationEmailStatus?: "not_sent" | "sent" | "failed" | "unavailable";
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
  confirmationEmailStatus?: "not_sent" | "sent" | "failed" | "unavailable" | "not_applicable";
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
  confirmationEmailStatus?: "not_sent" | "sent" | "failed" | "unavailable";
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

export type PublicAvailabilityRoom = Pick<AvailabilityRoom, "roomId" | "available" | "baseRate" | "nightlyRates">;

export type AvailabilityResponse = {
  checkIn: string;
  checkOut: string;
  mode: "development" | "production";
  rooms: PublicAvailabilityRoom[];
};
