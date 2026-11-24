"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditEntry, AuditEntryDetail } from "@/lib/admin/persistence";
import { ROLE_LABELS, type AdminRole } from "@/lib/admin/permissions";
import { adminRequest, dateTimeLabel, jsonInit, useAdminData } from "@/components/admin/adminClient";
import { Pager } from "@/components/admin/AdminOperationsPanels";

const AUDIT_ENTITIES = [
  "reservation", "room_setting", "inventory_block", "date_override", "admin_session", "admin_user",
  "room", "offer", "property_fact", "faq", "policy", "announcement", "testimonial", "seo_page", "media_asset", "entity_media",
  "menu_category", "menu_item", "restaurant_settings", "menu_order", "tour_scene", "tour_hotspot", "ai_knowledge",
];
const roleLabel = (role: string | null) => (role && role in ROLE_LABELS ? ROLE_LABELS[role as AdminRole] : role ?? "—");

// ---------------------------------------------------------------- Audit

export function AuditPanel() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const params = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (entity) params.set("entity", entity);
  if (actor.trim()) params.set("actor", actor.trim());
  const { data, error, loading, reload } = useAdminData<{ items: AuditEntry[]; total: number; page: number; pageSize: number }>(`/api/admin/audit?${params}`);

  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Audit</span><h1>Who changed what, and when.</h1></div><span>{data ? `${data.total} entr${data.total === 1 ? "y" : "ies"}` : ""} <button type="button" onClick={reload} disabled={loading}>Refresh</button></span></div>
    <div className="admin-filterbar">
      <select aria-label="Filter by entity" value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }}><option value="">All entities</option>{AUDIT_ENTITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      <input aria-label="Filter by staff id" placeholder="Staff id (exact)" value={actor} onChange={(event) => { setActor(event.target.value); setPage(1); }} />
    </div>
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <div className="admin-reservation-layout">
      <div className="admin-card admin-audit" aria-busy={loading}>
        <div className="admin-audit__row admin-audit__row--head"><span>Time</span><span>Staff</span><span>Role</span><span>Action</span><span>Entity</span></div>
        {data && data.items.length === 0 && <p className="admin-empty">No audit entries match this view.</p>}
        {data?.items.map((item) => <button type="button" key={item.id} className="admin-audit__row" data-active={selected === item.id} onClick={() => setSelected(item.id)}>
          <span>{dateTimeLabel(item.at)}</span><span>{item.actor}</span><span>{roleLabel(item.role)}</span><span>{item.action}</span><span>{item.entity}{item.entityId ? <small>{item.entityId}</small> : null}</span>
        </button>)}
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} label="Audit log" />}
      </div>
      {selected !== null && <AuditDetail key={selected} id={selected} onClose={() => setSelected(null)} />}
    </div>
  </section>;
}

function AuditDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error } = useAdminData<AuditEntryDetail>(`/api/admin/audit/${id}`);
  return <aside className="admin-detail" aria-label={`Audit entry ${id}`}>
    <div className="admin-detail__top"><div><span className="admin-eyebrow">Audit entry #{id}</span>{data && <h2>{data.action}</h2>}</div><button type="button" onClick={onClose} aria-label="Close audit entry">×</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {data && <>
      <dl className="admin-detail__facts">
        <div><dt>Time</dt><dd>{dateTimeLabel(data.at)}</dd></div>
        <div><dt>Staff</dt><dd>{data.actor} · {roleLabel(data.role)}</dd></div>
        <div><dt>Entity</dt><dd>{data.entity}{data.entityId ? ` · ${data.entityId}` : ""}</dd></div>
        <div><dt>Network</dt><dd>{data.ipHash ? `hashed (${data.ipHash.slice(0, 8)}…)` : "not recorded"}</dd></div>
      </dl>
      {data.diff ? <div className="admin-note"><span>Change (sensitive fields redacted)</span><pre className="admin-audit__diff">{JSON.stringify(data.diff, null, 2)}</pre></div> : <p className="admin-muted">No change details recorded.</p>}
    </>}
  </aside>;
}

// ---------------------------------------------------------------- Staff & sessions

type StaffSession = { handle: string; createdAt: string; lastSeenAt: string | null; expiresAt: string; current: boolean };
type StaffRow = { id: string; name: string; role: AdminRole; activeSessions: number; lastSeenAt: string | null; sessions: StaffSession[] };

export function StaffPanel({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const { data, error, loading, reload } = useAdminData<{ users: StaffRow[] }>("/api/admin/staff");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function revoke(user: StaffRow, session?: StaffSession) {
    const question = session
      ? (session.current ? "End your own current session? You will be signed out." : `End this session of ${user.name}?`)
      : `Sign ${user.name} out on every device?`;
    if (!window.confirm(question)) return;
    setMessage(null);
    const result = await adminRequest<{ revoked: number }>("/api/admin/staff/sessions", jsonInit("POST", { userId: user.id, ...(session ? { handle: session.handle } : {}) }), "Sessions could not be revoked.");
    if (result.redirect) { router.replace(result.redirect); return; }
    if (result.error) { setMessage({ text: result.error, error: true }); return; }
    setMessage({ text: `${result.data?.revoked ?? 0} session(s) revoked for ${user.name}.`, error: false });
    reload();
  }

  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Staff & sessions</span><h1>Who can sign in.</h1></div><span>Accounts and roles are set in ADMIN_USERS_JSON on the server. <button type="button" onClick={reload} disabled={loading}>Refresh</button></span></div>
    {message && <div className={message.error ? "admin-alert" : "admin-notice"} role={message.error ? "alert" : "status"}>{message.text}</div>}
    {error && <div className="admin-alert" role="alert">{error}</div>}
    {data && <div className="admin-card admin-audit">
      <div className="admin-audit__row admin-audit__row--head admin-staff__row"><span>Name</span><span>Staff id</span><span>Role</span><span>Active sessions</span><span>Last seen</span><span /></div>
      {data.users.map((user) => <div key={user.id} className="admin-audit__row admin-staff__row">
        <span>{user.name}</span><span>{user.id}</span><span>{ROLE_LABELS[user.role]}</span><span>{user.activeSessions}</span><span>{user.lastSeenAt ? dateTimeLabel(user.lastSeenAt) : "—"}</span>
        <span>{canManage && user.activeSessions > 0 ? <button type="button" onClick={() => revoke(user)}>End all sessions</button> : null}</span>
        {user.sessions.length > 0 && <ul className="admin-sessions">{user.sessions.map((session) => <li key={session.handle}>
          <span>Session {session.handle.slice(0, 6)}{session.current ? " (this browser)" : ""}</span>
          <span>Started {dateTimeLabel(session.createdAt)}</span>
          <span>Last seen {session.lastSeenAt ? dateTimeLabel(session.lastSeenAt) : "—"}</span>
          <span>Expires {dateTimeLabel(session.expiresAt)}</span>
          {canManage && <button type="button" onClick={() => revoke(user, session)}>End session</button>}
        </li>)}</ul>}
      </div>)}
    </div>}
  </section>;
}
