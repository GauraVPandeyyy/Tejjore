"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CmsResourceId } from "@/lib/admin/cms/schema";
import type { AdminPermission } from "@/lib/admin/permissions";
import { adminRequest, dateTimeLabel, jsonInit, useAdminData } from "@/components/admin/adminClient";
import { Pager } from "@/components/admin/AdminOperationsPanels";
import { CmsResourcePanel } from "@/components/admin/cms/CmsResourcePanel";

type ModuleProps = { permissions: AdminPermission[] };
type Row = Record<string, unknown>;

function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="admin-panel__heading"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1></div>{children ? <span>{children}</span> : null}</div>;
}

/** Sub-navigation inside a module; tabs the role cannot view are not shown. */
function SubTabs<T extends string>({ tabs, value, onChange, label }: { tabs: Array<{ id: T; label: string; badge?: number }>; value: T; onChange: (id: T) => void; label: string }) {
  return <nav className="admin-subtabs" aria-label={label}>
    {tabs.map((tab) => <button type="button" key={tab.id} data-active={value === tab.id} aria-current={value === tab.id ? "page" : undefined} onClick={() => onChange(tab.id)}>
      {tab.label}{tab.badge ? <span className="admin-badge" data-on="alert">{tab.badge}</span> : null}
    </button>)}
  </nav>;
}

function Tabbed({ eyebrow, title, permissions, tabs }: ModuleProps & { eyebrow: string; title: string; tabs: Array<{ id: CmsResourceId; label: string }> }) {
  const [tab, setTab] = useState(tabs[0].id);
  return <section className="admin-panel">
    <Heading eyebrow={eyebrow} title={title} />
    <SubTabs tabs={tabs} value={tab} onChange={setTab} label={`${eyebrow} sections`} />
    <CmsResourcePanel key={tab} resource={tab} permissions={permissions} />
  </section>;
}

// ---------------------------------------------------------------- Rooms (+ photos)

type LinkRow = { media_id: string; role: string; sort_order: number; url: string | null; alt: string; provenance: string };

function RoomMedia({ roomId, canManage }: { roomId: string; canManage: boolean }) {
  const router = useRouter();
  const { data, error, reload } = useAdminData<{ items: LinkRow[] }>(`/api/admin/media/links?entity_type=room&entity_id=${roomId}`);
  const library = useAdminData<{ items: Row[] }>(canManage ? "/api/admin/cms/media" : null);
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const photos = (data?.items ?? []).filter((item) => item.role === "gallery");
  const candidates = (library.data?.items ?? []).filter((item) => (item.provenance === "tejjora" || item.provenance === "licensed") && !photos.some((photo) => photo.media_id === item.id));

  async function change(method: "POST" | "DELETE", mediaId: string, sortOrder?: number) {
    if (method === "DELETE" && !window.confirm("Remove this photo from the room? The image stays in the media library.")) return;
    const result = await adminRequest("/api/admin/media/links", jsonInit(method, { media_id: mediaId, entity_type: "room", entity_id: roomId, role: "gallery", sort_order: sortOrder }), "The photo could not be updated.");
    if (result.redirect) return router.replace(result.redirect);
    setMessage(result.error ? { text: result.error, error: true } : { text: method === "POST" ? "Photo added." : "Photo removed.", error: false });
    setChoice("");
    reload();
  }

  return <div className="admin-subsection">
    <h3>Room photos</h3>
    <p className="admin-muted">Tejjora or licensed photography only. Without photos here the room keeps its current images.</p>
    {message && <div className={message.error ? "admin-alert" : "admin-notice"} role={message.error ? "alert" : "status"}>{message.text}</div>}
    {error && <div className="admin-alert" role="alert">{error}</div>}
    <ul className="admin-thumbs">
      {photos.map((photo) => <li key={photo.media_id}>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
        {photo.url ? <img className="admin-thumb" src={photo.url} alt={photo.alt} /> : <span className="admin-thumb" />}
        <small>#{photo.sort_order}</small>
        {canManage && <button type="button" onClick={() => void change("DELETE", photo.media_id)} aria-label={`Remove photo ${photo.alt}`}>Remove</button>}
      </li>)}
      {data && photos.length === 0 && <li className="admin-muted">No database photos assigned.</li>}
    </ul>
    {canManage && <div className="admin-inline-form">
      <select aria-label="Add a photo from the media library" value={choice} onChange={(event) => setChoice(event.target.value)}>
        <option value="">Add a photo from the library…</option>
        {candidates.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.alt || item.id).slice(0, 80)}</option>)}
      </select>
      <button type="button" disabled={!choice} onClick={() => void change("POST", choice, photos.length)}>Add</button>
    </div>}
  </div>;
}

export function RoomsModule({ permissions }: ModuleProps) {
  const canSeeMedia = permissions.includes("media.view");
  return <section className="admin-panel">
    <Heading eyebrow="Rooms" title="Room content." />
    <CmsResourcePanel resource="rooms" permissions={permissions} renderExtra={canSeeMedia ? (row) => <RoomMedia roomId={String(row.id)} canManage={permissions.includes("media.manage")} /> : undefined} />
  </section>;
}

export function OffersModule({ permissions }: ModuleProps) {
  return <section className="admin-panel"><Heading eyebrow="Offers" title="Offers and promotions." /><CmsResourcePanel resource="offers" permissions={permissions} /></section>;
}

export function SeoModule({ permissions }: ModuleProps) {
  return <section className="admin-panel"><Heading eyebrow="SEO" title="Search and sharing metadata." /><CmsResourcePanel resource="seo" permissions={permissions} /></section>;
}

export function ContentModule({ permissions }: ModuleProps) {
  return <Tabbed eyebrow="Content" title="Facts, FAQs, policies and guest words." permissions={permissions} tabs={[
    { id: "facts", label: "Property facts" },
    { id: "faqs", label: "FAQs" },
    { id: "policies", label: "Policies" },
    { id: "announcements", label: "Announcements" },
    { id: "testimonials", label: "Testimonials" },
  ]} />;
}

export function TourModule({ permissions }: ModuleProps) {
  return <Tabbed eyebrow="Virtual tour" title="Scenes and hotspots." permissions={permissions} tabs={[{ id: "tour-scenes", label: "Scenes" }, { id: "tour-hotspots", label: "Hotspots" }]} />;
}

// ---------------------------------------------------------------- AI knowledge (+ preview)

type Preview = { source: string; total: number; matches: Array<{ id: string; topic: string; question: string; answer: string; score: number }> };

function KnowledgePreview() {
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ data?: Preview; error?: string } | null>(null);
  async function run() {
    const params = new URLSearchParams();
    if (question.trim()) params.set("q", question.trim());
    if (topic.trim()) params.set("topic", topic.trim());
    setResult(await adminRequest<Preview>(`/api/admin/ai-knowledge/preview?${params}`, {}, "The preview could not be loaded."));
  }
  return <div className="admin-card admin-subsection">
    <h3>Test what the concierge may use</h3>
    <p className="admin-muted">Runs the public knowledge getter: only entries that are public AND approved come back.</p>
    <form className="admin-inline-form" onSubmit={(event) => { event.preventDefault(); void run(); }}>
      <input aria-label="Test question" placeholder="e.g. What time is check-in?" value={question} onChange={(event) => setQuestion(event.target.value)} />
      <input aria-label="Topic (optional)" placeholder="Topic (optional)" value={topic} onChange={(event) => setTopic(event.target.value)} />
      <button type="submit" className="admin-primary">Test</button>
    </form>
    {result?.error && <div className="admin-alert" role="alert">{result.error}</div>}
    {result?.data && <div role="status">
      <p className="admin-muted">{result.data.total} approved public entr{result.data.total === 1 ? "y" : "ies"} available{question.trim() ? `; ${result.data.matches.length} match this question` : ""}.</p>
      {result.data.matches.length === 0 ? <p className="admin-empty">Nothing approved matches. The concierge would fall back to verified facts or say it does not know.</p>
        : <ol className="admin-preview-list">{result.data.matches.map((entry) => <li key={entry.id}><strong>{entry.question}</strong><span className="admin-muted"> · {entry.topic}</span><p>{entry.answer}</p></li>)}</ol>}
    </div>}
  </div>;
}

export function AiKnowledgeModule({ permissions }: ModuleProps) {
  return <section className="admin-panel">
    <Heading eyebrow="AI knowledge" title="Approved answers for the concierge." />
    <KnowledgePreview />
    <CmsResourcePanel resource="ai-knowledge" permissions={permissions} />
  </section>;
}

// ---------------------------------------------------------------- Media library

export function MediaModule({ permissions }: ModuleProps) {
  return <section className="admin-panel">
    <Heading eyebrow="Media" title="Images and their provenance." />
    <CmsResourcePanel resource="media" permissions={permissions} />
  </section>;
}

// ---------------------------------------------------------------- Restaurant (orders queue + menu)

type OrderLine = { name_snapshot: string; variant: string | null; qty: number; unit_price_snapshot: number };
type Order = {
  reference: string; room_number: string | null; guest_name: string; phoneLast4: string; status: string; decline_reason: string | null;
  subtotal: number; service_charge: number; total_excl_tax: number; notes: string | null; created_at: string; lines: OrderLine[]; nextStatuses: string[];
};
type OrdersPage = { items: Order[]; total: number; waiting: number; page: number; pageSize: number };
const POLL_MS = 15_000;
const statusLabel = (status: string) => status.replaceAll("_", " ");
const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function beep() {
  try {
    const audio = new AudioContext();
    [660, 880].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.08;
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(audio.currentTime + index * 0.18);
      oscillator.stop(audio.currentTime + index * 0.18 + 0.15);
    });
    window.setTimeout(() => void audio.close(), 800);
  } catch {
    /* browsers block audio until the page has been used; the badge still updates */
  }
}

function OrdersQueue({ canManage, onWaiting }: { canManage: boolean; onWaiting: (count: number) => void }) {
  const router = useRouter();
  const [scope, setScope] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<OrdersPage>(`/api/admin/restaurant/orders?scope=${scope}&page=${page}`);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Polling, not a paid realtime service (masterplan §8): refresh every 15 s while visible.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);
  const lastWaiting = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    onWaiting(data.waiting);
    // A short two-tone beep when a new request arrives (not on the first load).
    if (lastWaiting.current !== null && data.waiting > lastWaiting.current) beep();
    lastWaiting.current = data.waiting;
  }, [data, onWaiting]);

  async function advance(order: Order, status: string) {
    const needsReason = status === "declined" || status === "cancelled_by_staff";
    if (needsReason && !reason[order.reference]?.trim()) return setMessage({ text: "Give the guest a short reason first.", error: true });
    if (needsReason && !window.confirm(`${status === "declined" ? "Decline" : "Cancel"} order ${order.reference}?`)) return;
    const result = await adminRequest(`/api/admin/restaurant/orders/${order.reference}`, jsonInit("PATCH", { status, reason: needsReason ? reason[order.reference] : undefined }), "The order could not be updated.");
    if (result.redirect) return router.replace(result.redirect);
    setMessage(result.error ? { text: result.error, error: true } : { text: `${order.reference} → ${statusLabel(status)}.`, error: false });
    reload();
  }

  return <div>
    <div className="admin-cms__toolbar">
      <select aria-label="Which orders" value={scope} onChange={(event) => { setScope(event.target.value as "active" | "all"); setPage(1); }}>
        <option value="active">Open orders (oldest first)</option>
        <option value="all">All orders (newest first)</option>
      </select>
      <span className="admin-muted">Refreshes every 15 seconds.</span>
      <button type="button" onClick={reload} disabled={loading}>Refresh</button>
    </div>
    {message && <div className={message.error ? "admin-alert" : "admin-notice"} role={message.error ? "alert" : "status"}>{message.text}</div>}
    {error && <div className="admin-alert" role="alert">{error}</div>}
    {data && data.items.length === 0 && <div className="admin-card"><p className="admin-empty">No {scope === "active" ? "open " : ""}orders. Orders appear here as guests send them from the menu (turn ordering on in Restaurant → Settings).</p></div>}
    <div className="admin-orders">
      {data?.items.map((order) => <article key={order.reference} className="admin-card admin-order" data-status={order.status}>
        <header><strong>{order.reference}</strong><span className="admin-status" data-status={order.status}>{statusLabel(order.status)}</span></header>
        <p className="admin-muted">{dateTimeLabel(order.created_at)} · {order.room_number ? `Room ${order.room_number}` : "No room"} · {order.guest_name} · phone ••{order.phoneLast4}</p>
        <ul>{order.lines.map((line, index) => <li key={index}>{line.qty} × {line.name_snapshot}{line.variant ? ` (${line.variant})` : ""} <span>{money(line.qty * line.unit_price_snapshot)}</span></li>)}</ul>
        {order.notes && <p className="admin-note-text">Note: {order.notes}</p>}
        {order.decline_reason && <p className="admin-note-text">Reason: {order.decline_reason}</p>}
        <p>Subtotal {money(order.subtotal)} · Service {money(order.service_charge)} · <strong>{money(order.total_excl_tax)}</strong> + taxes as applicable</p>
        {canManage && order.nextStatuses.length > 0 && <div className="admin-inline-form">
          {order.nextStatuses.some((status) => status === "declined" || status === "cancelled_by_staff") && <input aria-label={`Reason for ${order.reference}`} placeholder="Reason (for decline/cancel)" value={reason[order.reference] ?? ""} onChange={(event) => setReason((current) => ({ ...current, [order.reference]: event.target.value }))} />}
          {order.nextStatuses.map((status) => <button type="button" key={status} className={status === "declined" || status === "cancelled_by_staff" ? "admin-danger" : "admin-primary"} onClick={() => void advance(order, status)}>{statusLabel(status)}</button>)}
        </div>}
      </article>)}
    </div>
    {data && data.total > data.pageSize && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} label="Orders" />}
  </div>;
}

export function RestaurantModule({ permissions }: ModuleProps) {
  const can = (permission: AdminPermission) => permissions.includes(permission);
  const tabs = [
    ...(can("restaurant.orders.view") ? [{ id: "orders" as const, label: "Orders" }] : []),
    ...(can("restaurant.menu.view") ? [{ id: "menu-items" as const, label: "Menu items" }, { id: "menu-categories" as const, label: "Categories" }, { id: "restaurant-settings" as const, label: "Settings" }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.id ?? "orders");
  const [waiting, setWaiting] = useState(0);
  return <section className="admin-panel">
    <Heading eyebrow="Restaurant" title="Orders and the menu." />
    <SubTabs tabs={tabs.map((item) => (item.id === "orders" ? { ...item, badge: waiting } : item))} value={tab} onChange={setTab} label="Restaurant sections" />
    {tab === "orders" ? <OrdersQueue canManage={can("restaurant.orders.manage")} onWaiting={setWaiting} />
      : <CmsResourcePanel key={tab} resource={tab} permissions={permissions} quickToggle={tab === "menu-items" ? "available" : undefined} />}
  </section>;
}
