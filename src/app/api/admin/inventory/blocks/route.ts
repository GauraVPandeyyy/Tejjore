import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { createInventoryBlock, removeInventoryBlock } from "@/lib/admin/operations";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";
import type { RoomId } from "@/types/hotel";

export async function POST(request: Request) {
  const auth = await authorizeAdmin(request, "availability.manage");
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const body = await readJsonBody<{ roomId?: RoomId; date?: string; quantity?: number; reason?: string }>(request);
  if (!body?.roomId || !body.date || body.quantity == null) return apiError("INVALID_REQUEST", "Room, date and quantity are required.", 400);
  try {
    const block = await createInventoryBlock({ roomId: body.roomId, date: body.date, quantity: Number(body.quantity), reason: body.reason });
    await recordAudit(auth.admin, { action: "inventory_block.created", entity: "inventory_block", entityId: block.id, diff: { after: block }, request });
    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    return adminErrorResponse("inventory/blocks", error, "Inventory block could not be created.");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeAdmin(request, "availability.manage");
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("INVALID_REQUEST", "Block ID is required.", 400);
  try {
    const removed = await removeInventoryBlock(id);
    await recordAudit(auth.admin, { action: "inventory_block.removed", entity: "inventory_block", entityId: id, diff: { before: removed }, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse("inventory/blocks", error, "Inventory block could not be removed.");
  }
}
