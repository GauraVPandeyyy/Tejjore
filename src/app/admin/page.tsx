import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdminPage } from "@/lib/admin/authz";

export const metadata: Metadata = { title: "Hotel Operations", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminPage();
  // Permissions only decide which controls are shown; every API re-checks them server-side.
  return (
    <AdminDashboard staff={{ name: admin.name, role: admin.role }} permissions={admin.permissions} />
  );
}
