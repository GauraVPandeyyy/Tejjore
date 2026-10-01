import { NextResponse } from "next/server";
import { destroyAdminSession, requireAdminApi } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const session = await requireAdminApi(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
