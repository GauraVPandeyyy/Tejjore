import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { adminAuthConfigured } from "@/lib/admin/auth";
import { currentAdminSession } from "@/lib/admin/authz";

export const metadata: Metadata = { title: "Staff Sign In", robots: { index: false, follow: false } };
// Rendered per request: it reflects the runtime admin configuration and the visitor's session.
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  ended: "Your session has ended. Please sign in again.",
  signed_out: "You have been signed out.",
  signed_out_all: "You have been signed out on every device.",
  unavailable: "Staff access is temporarily unavailable. Please try again shortly.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  if (await currentAdminSession()) redirect("/admin");
  const { reason } = await searchParams;
  return <AdminLogin configured={adminAuthConfigured()} notice={reason ? NOTICES[reason] : undefined} />;
}
