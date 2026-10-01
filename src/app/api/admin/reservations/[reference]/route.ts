import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { patchAdminReservation } from "@/lib/admin/operations";
import type { AdminReservationPatch } from "@/types/admin";

export async function PATCH(request: Request, context: { params: Promise<{ reference: string }> }) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { reference } = await context.params;
  const body = await request.json().catch(() => null) as AdminReservationPatch | null;
  if (!body) return NextResponse.json({ error: "Update details are required." }, { status: 400 });
  try {
    return NextResponse.json(await patchAdminReservation(reference, body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reservation could not be updated." }, { status: 400 });
  }
}
