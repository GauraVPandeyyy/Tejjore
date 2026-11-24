import { handleCreateReservation } from "@/lib/booking/createReservationResponse";

export async function POST(request: Request) {
  return handleCreateReservation(request);
}
