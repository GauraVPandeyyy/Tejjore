import type { ArrivalStay } from "@/types/arrival";

export interface ArrivalStayProvider {
  getStay(reference: string): Promise<ArrivalStay | null>;
}

export interface TransferProvider {
  getTransferStatus(reference: string): Promise<{ status: string; note?: string } | null>;
}

/**
 * Smart Arrival is intentionally not allowed to resolve a stay from a bare reference.
 * Direct website reservations are retrieved through /manage-booking using reference +
 * booking email + phone. A future PMS/secure arrival-link provider can replace this adapter.
 */
export const unlinkedArrivalStayProvider: ArrivalStayProvider = {
  async getStay() {
    return null;
  },
};
