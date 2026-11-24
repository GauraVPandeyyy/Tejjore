"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/data/commerce";
import { bookingConfig } from "@/data/booking";
import { rooms } from "@/data/rooms";
import type { AdminInventoryView, AdminOverview, AdminPage, AdminPaymentsView, AdminReservationDetail, AdminReservationSummary } from "@/types/admin";
import type { ReservationStatus } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import { adminRequest, dateLabel, dateTimeLabel, jsonInit, roomName, todayLocal, useAdminData } from "@/components/admin/adminClient";

const filterStatuses: ReservationStatus[] = ["payment_pending", "payment_review", "confirmed", "payment_failed", "cancelled", "completed"];
const editableStatuses: ReservationStatus[] = ["confirmed", "cancelled", "completed"];
const PAGE_SIZE = 25;
const LIST_PAGE = 20;

export function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <article className="admin-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className="admin-status" data-status={status}>{status.replaceAll("_", " ")}</span>;
}

/** Previous/next pager for server- or client-paginated lists. */
export function Pager({ page, pageSize, total, onPage, label }: { page: number; pageSize: number; total: number; onPage: (page: number) => void; label: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return <div className="admin-pager" role="navigation" aria-label={`${label} pages`}>
    <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>← Previous</button>
    <span>Page {page} of {pages} · {total} total</span>
    <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages}>Next →</button>
  </div>;
}

function PanelState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (error) return <div className="admin-alert" role="alert">{error} <button type="button" onClick={onRetry}>Retry</button></div>;
  return loading ? <div className="admin-loading">Loading…</div> : null;
}

// ---------------------------------------------------------------- Today

export function TodayPanel({ canOpenReservations, onSelect }: { canOpenReservations: boolean; onSelect: (reference: string) => void }) {
  const { data, error, loading, reload } = useAdminData<AdminOverview>("/api/admin/overview");
  return <section className="admin-panel">
    <PanelState loading={loading && !data} error={error} onRetry={reload} />
    {data && <>
      <div className="admin-panel__heading"><div><span className="admin-eyebrow">Today · {dateLabel(data.today)}</span><h1>Front desk at a glance.</h1></div><span>Updated {dateTimeLabel(data.generatedAt)} <button type="button" onClick={reload} disabled={loading}>Refresh</button></span></div>
      <div className="admin-metrics-grid">
        <Metric label="Arrivals" value={data.metrics.arrivals} /><Metric label="Departures" value={data.metrics.departures} /><Metric label="In house" value={data.metrics.inHouse} /><Metric label="Pending payment" value={data.metrics.pendingPayments} /><Metric label="Payment review" value={data.metrics.paymentReviews} /><Metric label="Occupied rooms" value={`${data.metrics.occupiedRooms}/${data.metrics.totalRooms}`} note={`${data.metrics.occupancyPercent}% occupancy`} />
      </div>
      {data.arrivals && data.departures && <div className="admin-two-col">
        <DailyList title="Arrivals" items={data.arrivals} empty="No confirmed arrivals today." onSelect={canOpenReservations ? onSelect : undefined} />
        <DailyList title="Departures" items={data.departures} empty="No confirmed departures today." onSelect={canOpenReservations ? onSelect : undefined} />
      </div>}
    </>}
  </section>;
}

function DailyList({ title, items, empty, onSelect }: { title: string; items: AdminReservationSummary[]; empty: string; onSelect?: (reference: string) => void }) {
  return <div className="admin-card"><h2>{title}</h2>{items.length === 0 ? <p className="admin-muted">{empty}</p> : <div className="admin-list">{items.map((item) => <button key={item.reference} type="button" disabled={!onSelect} onClick={() => onSelect?.(item.reference)}><div><strong>{item.guestName}</strong><span>{roomName[item.roomId]} · {item.stay.rooms} room{item.stay.rooms === 1 ? "" : "s"}</span></div><span>{item.reference}</span></button>)}</div>}</div>;
}

// ---------------------------------------------------------------- Reservations

export function ReservationsPanel({ canManage, selected, onSelect }: { canManage: boolean; selected: string | null; onSelect: (reference: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  // Debounced server search (reference, name, email or phone); results stay masked summaries.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  const { data, error, loading, reload } = useAdminData<AdminPage<AdminReservationSummary>>(`/api/admin/reservations?${params}`);

  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Reservations</span><h1>Every stay, one clear record.</h1></div><span>{data ? `${data.total} matching record${data.total === 1 ? "" : "s"}` : ""} <button type="button" onClick={reload} disabled={loading}>Refresh</button></span></div>
    <div className="admin-filterbar"><input aria-label="Search reservations" placeholder="Search guest, phone, email or reference" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /><select aria-label="Filter reservation status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All statuses</option>{filterStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
    <PanelState loading={loading && !data} error={error} onRetry={reload} />
    <div className="admin-reservation-layout">
      <div className="admin-reservation-table" aria-busy={loading}>
        <div className="admin-table-head"><span>Guest / reference</span><span>Stay</span><span>Total</span><span>Status</span></div>
        {data && data.items.length === 0 ? <p className="admin-empty">No reservations match this view.</p> : data?.items.map((item) => <button type="button" className="admin-reservation-row" data-active={selected === item.reference} key={item.reference} onClick={() => onSelect(item.reference)}><span><strong>{item.guestName}</strong><small>{item.reference} · ••{item.phoneLast4}</small></span><span>{dateLabel(item.stay.checkIn)} → {dateLabel(item.stay.checkOut)}<small>{roomName[item.roomId]}</small></span><span>{formatMoney(item.pricing.grandTotal)}<small>{item.paymentStatus.replaceAll("_", " ")}</small></span><StatusBadge status={item.status} /></button>)}
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} label="Reservations" />}
      </div>
      {selected && <ReservationDetailLoader key={selected} reference={selected} canManage={canManage} onClose={() => onSelect(null)} onChanged={reload} />}
    </div>
  </section>;
}

/** Contact details and payment ids are fetched per reservation (and audited), never in the list. */
function ReservationDetailLoader({ reference, canManage, onClose, onChanged }: { reference: string; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const [version, setVersion] = useState(0);
  const { data: detail, error } = useAdminData<AdminReservationDetail>(`/api/admin/reservations/${encodeURIComponent(reference)}?v=${version}`);
  if (error) return <aside className="admin-detail" aria-label={`Reservation ${reference}`}><div className="admin-detail__top"><div><span className="admin-eyebrow">{reference}</span></div><button type="button" onClick={onClose} aria-label="Close reservation detail">×</button></div><p className="admin-error" role="alert">{error}</p></aside>;
  if (!detail) return <aside className="admin-detail" aria-label={`Reservation ${reference}`} aria-busy="true"><p className="admin-muted">Loading reservation…</p></aside>;
  return <ReservationDetail key={detail.updatedAt} reservation={detail} canManage={canManage} onClose={onClose} onChanged={() => { setVersion((value) => value + 1); onChanged(); }} />;
}

function ReservationDetail({ reservation, canManage, onClose, onChanged }: { reservation: AdminReservationDetail; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);
  const [notes, setNotes] = useState(reservation.staffNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setSaving(true); setError("");
    const result = await adminRequest(`/api/admin/reservations/${encodeURIComponent(reservation.reference)}`, jsonInit("PATCH", { status, staffNotes: notes }), "Reservation could not be updated.");
    setSaving(false);
    if (result.redirect) { router.replace(result.redirect); return; }
    if (result.error) { setError(result.error); return; }
    onChanged();
  }
  return <aside className="admin-detail" aria-label={`Reservation ${reservation.reference}`}><div className="admin-detail__top"><div><span className="admin-eyebrow">{reservation.reference}</span><h2>{reservation.guest.firstName} {reservation.guest.lastName}</h2></div><button type="button" onClick={onClose} aria-label="Close reservation detail">×</button></div><dl className="admin-detail__facts"><div><dt>Phone</dt><dd><a href={`tel:${reservation.guest.phone}`}>{reservation.guest.phone}</a></dd></div><div><dt>Email</dt><dd><a href={`mailto:${reservation.guest.email}`}>{reservation.guest.email}</a></dd></div><div><dt>Stay</dt><dd>{dateLabel(reservation.stay.checkIn)} → {dateLabel(reservation.stay.checkOut)}</dd></div><div><dt>Room</dt><dd>{roomName[reservation.roomId]} · {reservation.stay.rooms} room(s)</dd></div><div><dt>Guests</dt><dd>{reservation.stay.adults} adult(s) · {reservation.stay.children} child(ren)</dd></div><div><dt>Rate plan</dt><dd>{bookingConfig.ratePlans.find((item) => item.id === reservation.ratePlanId)?.label ?? reservation.ratePlanId}</dd></div><div><dt>Extras</dt><dd>{reservation.addonIds.length ? reservation.addonIds.map((id) => bookingConfig.addons.find((item) => item.id === id)?.label ?? id).join(", ") : "None"}</dd></div><div><dt>Room subtotal</dt><dd>{formatMoney(reservation.pricing.roomSubtotal)}</dd></div><div><dt>Extras charged</dt><dd>{formatMoney(reservation.pricing.extrasTotal)}</dd></div><div><dt>Discount</dt><dd>{formatMoney(reservation.pricing.discount)}</dd></div><div><dt>Tax / service</dt><dd>{formatMoney(reservation.pricing.tax)} / {formatMoney(reservation.pricing.serviceCharge)}</dd></div><div><dt>Total</dt><dd>{formatMoney(reservation.pricing.grandTotal)} · paid {formatMoney(reservation.pricing.amountPaid)} · due {formatMoney(reservation.pricing.amountDue)}</dd></div><div><dt>Payment</dt><dd>{reservation.paymentStatus.replaceAll("_", " ")}{reservation.paymentId ? ` · ${reservation.paymentId}` : ""}{reservation.paymentOrderId ? ` · order ${reservation.paymentOrderId}` : ""}</dd></div><div><dt>Source</dt><dd>{reservation.source}</dd></div><div><dt>Created</dt><dd>{dateTimeLabel(reservation.createdAt)}</dd></div>{reservation.guest.companyName && <div><dt>Company</dt><dd>{reservation.guest.companyName}{reservation.guest.gstNumber ? ` · GST ${reservation.guest.gstNumber}` : ""}</dd></div>}</dl>{reservation.guest.specialRequests && <div className="admin-note"><span>Guest request</span><p>{reservation.guest.specialRequests}</p></div>}{reservation.guest.arrivalNotes && <div className="admin-note"><span>Arrival notes</span><p>{reservation.guest.arrivalNotes}</p></div>}
    {canManage ? <>
      <label className="admin-field"><span>Reservation status</span><select value={status} onChange={(event) => setStatus(event.target.value as ReservationStatus)}>{!editableStatuses.includes(reservation.status) && <option value={reservation.status}>{reservation.status.replaceAll("_", " ")} (current)</option>}{editableStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <label className="admin-field"><span>Staff notes</span><textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal only" /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="admin-primary" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save reservation"}</button>
    </> : <p className="admin-muted">Status: {reservation.status.replaceAll("_", " ")}. Your role can view but not change reservations.</p>}
  </aside>;
}

// ---------------------------------------------------------------- Availability & Rates

export function InventoryPanel({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const { data, error, loading, reload } = useAdminData<AdminInventoryView>("/api/admin/inventory");
  const [roomId, setRoomId] = useState<RoomId>("deluxe"); const [date, setDate] = useState(todayLocal()); const [quantity, setQuantity] = useState(1); const [reason, setReason] = useState("");
  const [overrideRoom, setOverrideRoom] = useState<RoomId>("deluxe"); const [overrideDate, setOverrideDate] = useState(todayLocal()); const [overrideInventory, setOverrideInventory] = useState(""); const [overrideRate, setOverrideRate] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  /** Every change reports success or the server's reason; failures are never silent. */
  async function change(url: string, init: RequestInit, success: string) {
    setMessage(null);
    const result = await adminRequest(url, init, "Update failed.");
    if (result.redirect) { router.replace(result.redirect); return false; }
    if (result.error) { setMessage({ text: result.error, error: true }); return false; }
    setMessage({ text: success, error: false });
    reload();
    return true;
  }
  async function saveRoom(event: FormEvent<HTMLFormElement>, id: RoomId) { event.preventDefault(); const form = new FormData(event.currentTarget); await change(`/api/admin/rooms/${id}`, jsonInit("PUT", { baseRate: Number(form.get("baseRate")), totalInventory: Number(form.get("totalInventory")) }), "Room settings saved."); }
  async function addBlock(event: FormEvent) { event.preventDefault(); if (await change("/api/admin/inventory/blocks", jsonInit("POST", { roomId, date, quantity, reason }), "Inventory block added.")) setReason(""); }
  async function saveOverride(event: FormEvent) { event.preventDefault(); if (await change("/api/admin/inventory/overrides", jsonInit("PUT", { roomId: overrideRoom, date: overrideDate, totalInventory: overrideInventory === "" ? null : Number(overrideInventory), baseRate: overrideRate === "" ? null : Number(overrideRate) }), "Date override saved.")) { setOverrideInventory(""); setOverrideRate(""); } }
  const removeBlock = (id: string) => change(`/api/admin/inventory/blocks?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "Inventory block removed.");
  const removeOverride = (id: string) => change(`/api/admin/inventory/overrides?id=${encodeURIComponent(id)}`, { method: "DELETE" }, "Date override removed.");

  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Availability & rates</span><h1>Control what the website can sell.</h1></div><span>{canManage ? "Changes affect public availability and new reservation pricing." : "View only for your role."} <button type="button" onClick={reload} disabled={loading}>Refresh</button></span></div>
    {message && <div className={message.error ? "admin-alert" : "admin-notice"} role={message.error ? "alert" : "status"}>{message.text}</div>}
    <PanelState loading={loading && !data} error={error} onRetry={reload} />
    {data && <>
      {canManage && <>
        <div className="admin-room-settings">{rooms.map((room) => { const setting = data.operations.roomSettings[room.id]; return <form key={`${room.id}-${setting.baseRate}-${setting.totalInventory}`} className="admin-card admin-room-setting" onSubmit={(event) => saveRoom(event, room.id)}><span className="admin-eyebrow">{room.name}</span><label><span>Base rate / night</span><input name="baseRate" type="number" min="0" step="1" defaultValue={setting.baseRate} /></label><label><span>Category inventory</span><input name="totalInventory" type="number" min="0" max="100" step="1" defaultValue={setting.totalInventory} /></label><button type="submit">Save</button></form>; })}</div>
        <div className="admin-two-col admin-inventory-tools"><form className="admin-card" onSubmit={addBlock}><h2>Block rooms</h2><p className="admin-muted">Maintenance, owner use or temporary out-of-order stock.</p><AdminRoomSelect value={roomId} onChange={setRoomId} /><label className="admin-field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="admin-field"><span>Rooms to block</span><input type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><label className="admin-field"><span>Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional internal note" /></label><button className="admin-primary" type="submit">Add block</button></form><form className="admin-card" onSubmit={saveOverride}><h2>Date override</h2><p className="admin-muted">Override category inventory and/or nightly base rate for one date.</p><AdminRoomSelect value={overrideRoom} onChange={setOverrideRoom} /><label className="admin-field"><span>Date</span><input type="date" value={overrideDate} onChange={(event) => setOverrideDate(event.target.value)} /></label><label className="admin-field"><span>Inventory override</span><input type="number" min="0" max="100" value={overrideInventory} onChange={(event) => setOverrideInventory(event.target.value)} placeholder="Leave blank to keep base" /></label><label className="admin-field"><span>Rate override</span><input type="number" min="0" value={overrideRate} onChange={(event) => setOverrideRate(event.target.value)} placeholder="Leave blank to keep base" /></label><button className="admin-primary" type="submit">Save override</button></form></div>
      </>}
      <InventoryGrid data={data} />
      <div className="admin-two-col"><ActiveBlocks data={data} onRemove={canManage ? removeBlock : undefined} /><ActiveOverrides data={data} onRemove={canManage ? removeOverride : undefined} /></div>
    </>}
  </section>;
}

function AdminRoomSelect({ value, onChange }: { value: RoomId; onChange: (value: RoomId) => void }) {
  return <label className="admin-field"><span>Room category</span><select value={value} onChange={(event) => onChange(event.target.value as RoomId)}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>;
}

function InventoryGrid({ data }: { data: AdminInventoryView }) {
  const dates = Array.from(new Set(data.inventory.map((item) => item.date)));
  return <div className="admin-card admin-inventory-grid"><div className="admin-card__heading"><h2>Next {dates.length} days</h2><span>Available / total · nightly rate</span></div><div className="admin-inventory-table"><div className="admin-inventory-table__head"><span>Date</span>{rooms.map((room) => <span key={room.id}>{room.name.replace(" Room", "")}</span>)}</div>{dates.map((date) => <div className="admin-inventory-table__row" key={date}><strong>{dateLabel(date)}</strong>{rooms.map((room) => { const cell = data.inventory.find((item) => item.date === date && item.roomId === room.id); if (!cell) return <span key={room.id}>—</span>; return <span key={room.id} data-low={cell.available <= 2 ? "true" : "false"}><b>{cell.available}/{cell.total}</b><small>{formatMoney(cell.baseRate)}</small>{cell.blocked > 0 && <em>{cell.blocked} blocked</em>}</span>; })}</div>)}</div></div>;
}

function ActiveBlocks({ data, onRemove }: { data: AdminInventoryView; onRemove?: (id: string) => Promise<boolean> }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(data.blocks.length / LIST_PAGE));
  const current = Math.min(page, pages);
  const visible = data.blocks.slice((current - 1) * LIST_PAGE, current * LIST_PAGE);
  return <div className="admin-card"><h2>Room blocks <small className="admin-muted">({data.blocks.length})</small></h2>{data.blocks.length === 0 ? <p className="admin-muted">No room blocks configured.</p> : <><div className="admin-compact-list">{visible.map((block) => <div key={block.id}><span><strong>{dateLabel(block.date)} · {roomName[block.roomId]}</strong><small>{block.quantity} room(s){block.reason ? ` · ${block.reason}` : ""}</small></span>{onRemove && <button type="button" onClick={() => onRemove(block.id)}>Remove</button>}</div>)}</div><Pager page={current} pageSize={LIST_PAGE} total={data.blocks.length} onPage={setPage} label="Room blocks" /></>}</div>;
}

function ActiveOverrides({ data, onRemove }: { data: AdminInventoryView; onRemove?: (id: string) => Promise<boolean> }) {
  const [page, setPage] = useState(1);
  const list = [...data.operations.dateOverrides].sort((a, b) => a.date.localeCompare(b.date));
  const pages = Math.max(1, Math.ceil(list.length / LIST_PAGE));
  const current = Math.min(page, pages);
  return <div className="admin-card"><h2>Date overrides <small className="admin-muted">({list.length})</small></h2>{list.length === 0 ? <p className="admin-muted">No date-specific overrides.</p> : <><div className="admin-compact-list">{list.slice((current - 1) * LIST_PAGE, current * LIST_PAGE).map((item) => <div key={item.id}><span><strong>{dateLabel(item.date)} · {roomName[item.roomId]}</strong><small>{item.totalInventory != null ? `${item.totalInventory} rooms` : "base inventory"} · {item.baseRate != null ? formatMoney(item.baseRate) : "base rate"}</small></span>{onRemove && <button type="button" onClick={() => onRemove(item.id)}>Remove</button>}</div>)}</div><Pager page={current} pageSize={LIST_PAGE} total={list.length} onPage={setPage} label="Date overrides" /></>}</div>;
}

// ---------------------------------------------------------------- Payments

export function PaymentsPanel({ canOpenReservations, onSelect }: { canOpenReservations: boolean; onSelect: (reference: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<AdminPaymentsView>(`/api/admin/payments?page=${page}&pageSize=30`);
  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Payments</span><h1>Payment status without reconciliation guesswork.</h1></div><span><button type="button" onClick={reload} disabled={loading}>Refresh</button></span></div>
    <PanelState loading={loading && !data} error={error} onRetry={reload} />
    {data && <>
      <div className="admin-metrics-grid"><Metric label="Paid reservations" value={data.metrics.paid} /><Metric label="Pending" value={data.metrics.pending} /><Metric label="Failed" value={data.metrics.failed} /><Metric label="Amount paid" value={formatMoney(data.metrics.amountPaid)} /><Metric label="Outstanding" value={formatMoney(data.metrics.outstanding)} /></div>
      <div className="admin-card"><div className="admin-card__heading"><h2>Recent payment records</h2><span>Most recently updated first.</span></div><div className="admin-list">{data.records.items.map((item) => <button type="button" key={item.reference} disabled={!canOpenReservations} onClick={() => onSelect(item.reference)}><div><strong>{item.reference} · {item.guestName}</strong><span>{formatMoney(item.pricing.grandTotal)} · paid {formatMoney(item.pricing.amountPaid)} · due {formatMoney(item.pricing.amountDue)}</span></div><StatusBadge status={item.paymentStatus} /></button>)}</div><Pager page={data.records.page} pageSize={data.records.pageSize} total={data.records.total} onPage={setPage} label="Payment records" /></div>
    </>}
  </section>;
}
