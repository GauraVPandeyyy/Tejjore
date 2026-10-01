import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Hotel Operations", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  return <AdminDashboard staffName={session.name} />;
}
