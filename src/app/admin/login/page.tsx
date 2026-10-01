import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { adminAuthConfigured, getAdminSession } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Staff Sign In", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <AdminLogin configured={adminAuthConfigured()} />;
}
