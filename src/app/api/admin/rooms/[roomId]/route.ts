import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { updateRoomSetting } from "@/lib/admin/operations";
import type { RoomId } from "@/types/hotel";

export async function PUT(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { roomId } = await context.params;
  const body = await request.json().catch(() => null) as { baseRate?: number; totalInventory?: number } | null;
  if (!body || body.baseRate == null || body.totalInventory == null) return NextResponse.json({ error: "Base rate and inventory are required." }, { status: 400 });
  try {
    return NextResponse.json(await updateRoomSetting(roomId as RoomId, { baseRate: Number(body.baseRate), totalInventory: Number(body.totalInventory) }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Room settings could not be updated." }, { status: 400 });
  }
}
