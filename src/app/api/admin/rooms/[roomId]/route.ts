import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { updateRoomSetting } from "@/lib/admin/operations";
import { revalidateContent } from "@/lib/content/revalidate";
import { apiError, readJsonBody, rejectNonJson } from "@/lib/http/api";
import type { RoomId } from "@/types/hotel";

/** Category base rate and inventory (booking operations, not room content): availability.manage. */
export async function PUT(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const auth = await authorizeAdmin(request, "availability.manage");
  if (!auth.ok) return auth.response;
  const nonJson = rejectNonJson(request);
  if (nonJson) return nonJson;
  const { roomId } = await context.params;
  const body = await readJsonBody<{ baseRate?: number; totalInventory?: number }>(request);
  if (!body || body.baseRate == null || body.totalInventory == null) return apiError("INVALID_REQUEST", "Base rate and inventory are required.", 400);
  try {
    const { setting, previous } = await updateRoomSetting(roomId as RoomId, { baseRate: Number(body.baseRate), totalInventory: Number(body.totalInventory) });
    // Public "from" prices (rooms, room pages, concierge) must match the new booking rate at once.
    revalidateContent("rates");
    await recordAudit(auth.admin, {
      action: "room_setting.updated",
      entity: "room_setting",
      entityId: roomId,
      diff: { baseRate: { from: previous.baseRate, to: setting.baseRate }, totalInventory: { from: previous.totalInventory, to: setting.totalInventory } },
      request,
    });
    return NextResponse.json(setting);
  } catch (error) {
    return adminErrorResponse("rooms", error, "Room settings could not be updated.");
  }
}
