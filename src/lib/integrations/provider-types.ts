export interface MapsProvider {
  directionsUrl(destination: string, origin?: { lat: number; lng: number }): string;
}

export interface PaymentProvider {
  createPayment(input: Record<string, unknown>): Promise<{ paymentId: string; redirectUrl?: string }>;
}

export interface FlightProvider {
  getStatus(flightNumber: string): Promise<Record<string, unknown>>;
}

export interface AnalyticsProvider {
  track(event: string, payload?: Record<string, unknown>): void;
}

export interface TransferStatusProvider {
  getStatus(reference: string): Promise<{ status: string; note?: string } | null>;
}

export interface ArrivalLookupProvider {
  getStay(reference: string): Promise<Record<string, unknown> | null>;
}
