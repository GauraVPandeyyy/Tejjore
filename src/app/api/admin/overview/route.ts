import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/operations";

export async function GET(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await getAdminOverview(), { headers: { "Cache-Control": "no-store" } });
}
