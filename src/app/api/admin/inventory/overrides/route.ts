import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { removeDateOverride, upsertDateOverride } from "@/lib/admin/operations";
import type { RoomId } from "@/types/hotel";

export async function PUT(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; roomId?: RoomId; date?: string; totalInventory?: number | null; baseRate?: number | null; note?: string } | null;
  if (!body?.roomId || !body.date) return NextResponse.json({ error: "Room and date are required." }, { status: 400 });
  try {
    const record = await upsertDateOverride({
      id: body.id,
      roomId: body.roomId,
      date: body.date,
      ...(body.totalInventory != null ? { totalInventory: Number(body.totalInventory) } : {}),
      ...(body.baseRate != null ? { baseRate: Number(body.baseRate) } : {}),
      note: body.note,
    });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Date override could not be saved." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Override ID is required." }, { status: 400 });
  try {
    await removeDateOverride(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Date override could not be removed." }, { status: 400 });
  }
}
