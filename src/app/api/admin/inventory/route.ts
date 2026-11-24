import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { getAdminInventory } from "@/lib/admin/operations";

/** GET /api/admin/inventory → 14-day grid, room settings, all blocks and date overrides. */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "availability.view");
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getAdminInventory(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse("inventory", error, "Availability could not be loaded.");
  }
}
