import type { AvailabilityResponse, BookingRequestPayload, BookingRequestResponse } from "@/types/booking";

export interface InventoryProvider {
  search(checkIn: string, checkOut: string): Promise<AvailabilityResponse>;
}

export interface BookingProvider {
  createReservation(input: BookingRequestPayload): Promise<BookingRequestResponse>;
}

export const websiteInventoryProvider: InventoryProvider = {
  async search(checkIn, checkOut) {
    const response = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIn, checkOut }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Availability could not be checked.");
    return data as AvailabilityResponse;
  },
};

export const websiteBookingProvider: BookingProvider = {
  async createReservation(input) {
    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Reservation could not be created.");
    return data as BookingRequestResponse;
  },
};
