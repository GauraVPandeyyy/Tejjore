import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createInventoryBlock, removeInventoryBlock } from "@/lib/admin/operations";
import type { RoomId } from "@/types/hotel";

export async function POST(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null) as { roomId?: RoomId; date?: string; quantity?: number; reason?: string } | null;
  if (!body?.roomId || !body.date || body.quantity == null) return NextResponse.json({ error: "Room, date and quantity are required." }, { status: 400 });
  try {
    return NextResponse.json(await createInventoryBlock({ roomId: body.roomId, date: body.date, quantity: Number(body.quantity), reason: body.reason }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory block could not be created." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Block ID is required." }, { status: 400 });
  try {
    await removeInventoryBlock(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory block could not be removed." }, { status: 400 });
  }
}
