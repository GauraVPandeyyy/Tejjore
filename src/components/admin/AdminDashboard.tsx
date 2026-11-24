"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_MODULES, ROLE_LABELS, type AdminModuleId, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";
import { adminRequest, jsonInit } from "@/components/admin/adminClient";
import { InventoryPanel, PaymentsPanel, ReservationsPanel, TodayPanel } from "@/components/admin/AdminOperationsPanels";
import { AuditPanel, StaffPanel } from "@/components/admin/AdminSecurityPanels";
import { AiKnowledgeModule, ContentModule, MediaModule, OffersModule, RestaurantModule, RoomsModule, SeoModule, TourModule } from "@/components/admin/AdminContentModules";

type Props = {
  staff: { name: string; role: AdminRole };
  permissions: AdminPermission[];
};

const GROUP_LABELS = { operations: "Operations", content: "Content", system: "System" } as const;

export function AdminDashboard({ staff, permissions }: Props) {
  const router = useRouter();
  const can = (permission: AdminPermission) => permissions.includes(permission);
  const modules = ADMIN_MODULES.filter((module) => can(module.permission));
  const [tab, setTab] = useState<AdminModuleId | null>(modules[0]?.id ?? null);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState("");

  function openReservation(reference: string) {
    if (!can("reservations.view")) return;
    setSelectedReference(reference);
    setTab("reservations");
  }

  async function signOut(everywhere: boolean) {
    if (everywhere && !window.confirm("Sign out on every device where this account is signed in?")) return;
    setSignOutError("");
    const result = await adminRequest(everywhere ? "/api/admin/auth/logout-all" : "/api/admin/auth/logout", jsonInit("POST"), "Sign-out failed.");
    if (result.error) {
      setSignOutError(result.error);
      return;
    }
    router.replace(`/admin/login?reason=${everywhere ? "signed_out_all" : "signed_out"}`);
    router.refresh();
  }

  return <main className="admin-root admin-shell">
    <header className="admin-topbar">
      <div className="admin-brand"><Image src="/brand/tejjora-mark.png" alt="" width={46} height={46} /><div><strong>Tejjora Operations</strong><span>{staff.name} · {ROLE_LABELS[staff.role]}</span></div></div>
      <div className="admin-topbar__actions">
        <button type="button" onClick={() => signOut(false)}>Sign out</button>
        <button type="button" onClick={() => signOut(true)}>Sign out everywhere</button>
      </div>
    </header>

    <nav className="admin-tabs" aria-label="Admin sections">
      {modules.map((module, index) => <span key={module.id} className="admin-tabs__item">
        {module.group !== modules[index - 1]?.group && <small className="admin-tabs__group">{GROUP_LABELS[module.group]}</small>}
        <button type="button" data-active={tab === module.id} aria-current={tab === module.id ? "page" : undefined} onClick={() => setTab(module.id)}>{module.label}</button>
      </span>)}
    </nav>

    {signOutError && <div className="admin-alert" role="alert">{signOutError}</div>}
    {!tab && <section className="admin-panel"><div className="admin-card"><h2>No modules yet</h2><p className="admin-muted">Your role ({ROLE_LABELS[staff.role]}) has no admin modules. Ask the owner to check your role.</p></div></section>}
    {tab === "today" && <TodayPanel canOpenReservations={can("reservations.view")} onSelect={openReservation} />}
    {tab === "reservations" && <ReservationsPanel canManage={can("reservations.manage")} selected={selectedReference} onSelect={setSelectedReference} />}
    {tab === "availability" && <InventoryPanel canManage={can("availability.manage")} />}
    {tab === "payments" && <PaymentsPanel canOpenReservations={can("reservations.view")} onSelect={openReservation} />}
    {tab === "restaurant" && <RestaurantModule permissions={permissions} />}
    {tab === "rooms" && <RoomsModule permissions={permissions} />}
    {tab === "offers" && <OffersModule permissions={permissions} />}
    {tab === "content" && <ContentModule permissions={permissions} />}
    {tab === "media" && <MediaModule permissions={permissions} />}
    {tab === "tour" && <TourModule permissions={permissions} />}
    {tab === "ai_knowledge" && <AiKnowledgeModule permissions={permissions} />}
    {tab === "seo" && <SeoModule permissions={permissions} />}
    {tab === "audit" && <AuditPanel />}
    {tab === "staff" && <StaffPanel canManage={can("staff.manage")} />}
  </main>;
}
