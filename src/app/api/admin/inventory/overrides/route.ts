import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { removeDateOverride, upsertDateOverride } from "@/lib/admin/operations";
import { revalidateContent } from "@/lib/content/revalidate";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";
import type { RoomId } from "@/types/hotel";

export async function PUT(request: Request) {
  const auth = await authorizeAdmin(request, "availability.manage");
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const body = await readJsonBody<{ id?: string; roomId?: RoomId; date?: string; totalInventory?: number | null; baseRate?: number | null; note?: string }>(request);
  if (!body?.roomId || !body.date) return apiError("INVALID_REQUEST", "Room and date are required.", 400);
  try {
    const { record, previous } = await upsertDateOverride({
      id: body.id,
      roomId: body.roomId,
      date: body.date,
      ...(body.totalInventory != null ? { totalInventory: Number(body.totalInventory) } : {}),
      ...(body.baseRate != null ? { baseRate: Number(body.baseRate) } : {}),
      note: body.note,
    });
    if (record.baseRate != null || previous?.baseRate != null) revalidateContent("rates");
    await recordAudit(auth.admin, { action: "date_override.saved", entity: "date_override", entityId: record.id, diff: { before: previous, after: record }, request });
    return NextResponse.json(record);
  } catch (error) {
    return adminErrorResponse("inventory/overrides", error, "Date override could not be saved.");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeAdmin(request, "availability.manage");
  if (!auth.ok) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return apiError("INVALID_REQUEST", "Override ID is required.", 400);
  try {
    const removed = await removeDateOverride(id);
    if (removed?.baseRate != null) revalidateContent("rates");
    await recordAudit(auth.admin, { action: "date_override.removed", entity: "date_override", entityId: id, diff: { before: removed }, request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse("inventory/overrides", error, "Date override could not be removed.");
  }
}
