"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/data/commerce";
import { bookingConfig } from "@/data/booking";
import { rooms } from "@/data/rooms";
import type { AdminOverview } from "@/types/admin";
import type { ReservationRecord, ReservationStatus } from "@/types/booking";
import type { RoomId } from "@/types/hotel";

type Tab = "today" | "reservations" | "inventory" | "payments";
const roomName = Object.fromEntries(rooms.map((room) => [room.id, room.name])) as Record<RoomId, string>;
const filterStatuses: ReservationStatus[] = ["payment_pending", "payment_review", "confirmed", "payment_failed", "cancelled", "completed"];
const editableStatuses: ReservationStatus[] = ["confirmed", "cancelled", "completed"];

function dateLabel(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}
function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function AdminDashboard({ staffName }: { staffName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (response.status === 401) { router.replace("/admin/login"); return; }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Operations data could not be loaded.");
      setData(payload as AdminOverview);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Operations data could not be loaded."); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = data?.reservations.find((item) => item.reference === selectedReference) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.reservations ?? []).filter((item) => {
      const haystack = `${item.reference} ${item.guest.firstName} ${item.guest.lastName} ${item.guest.phone} ${item.guest.email}`.toLowerCase();
      return (!needle || haystack.includes(needle)) && (statusFilter === "all" || item.status === statusFilter);
    });
  }, [data, query, statusFilter]);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login"); router.refresh();
  }

  return <main className="admin-root admin-shell">
    <header className="admin-topbar">
      <div className="admin-brand"><Image src="/brand/tejjora-mark.png" alt="" width={46} height={46} /><div><strong>Tejjora Operations</strong><span>{staffName}</span></div></div>
      <div className="admin-topbar__actions"><button type="button" onClick={load} disabled={busy}>Refresh</button><button type="button" onClick={logout}>Sign out</button></div>
    </header>

    <nav className="admin-tabs" aria-label="Operations sections">
      {(["today","reservations","inventory","payments"] as Tab[]).map((item)=><button type="button" key={item} data-active={tab===item} onClick={()=>setTab(item)}>{item === "inventory" ? "Availability & Rates" : item[0].toUpperCase()+item.slice(1)}</button>)}
    </nav>

    {error && <div className="admin-alert" role="alert">{error}</div>}
    {busy && !data ? <div className="admin-loading">Loading hotel operations…</div> : data && <>
      {tab === "today" && <TodayPanel data={data} onSelect={(reference)=>{setSelectedReference(reference);setTab("reservations");}} />}
      {tab === "reservations" && <ReservationsPanel data={data} reservations={filtered} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} selected={selected} onSelect={setSelectedReference} onChanged={load} />}
      {tab === "inventory" && <InventoryPanel data={data} onChanged={load} />}
      {tab === "payments" && <PaymentsPanel data={data} onSelect={(reference)=>{setSelectedReference(reference);setTab("reservations");}} />}
    </>}
  </main>;
}

function Metric({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <article className="admin-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function TodayPanel({ data, onSelect }: { data: AdminOverview; onSelect: (reference: string)=>void }) {
  const arrivals = data.reservations.filter((item)=>item.status==="confirmed" && item.stay.checkIn===data.today);
  const departures = data.reservations.filter((item)=>item.status==="confirmed" && item.stay.checkOut===data.today);
  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Today · {dateLabel(data.today)}</span><h1>Front desk at a glance.</h1></div><span>Updated {dateTimeLabel(data.generatedAt)}</span></div>
    <div className="admin-metrics-grid">
      <Metric label="Arrivals" value={data.metrics.arrivals}/><Metric label="Departures" value={data.metrics.departures}/><Metric label="In house" value={data.metrics.inHouse}/><Metric label="Pending payment" value={data.metrics.pendingPayments}/><Metric label="Payment review" value={data.metrics.paymentReviews}/><Metric label="Occupied rooms" value={`${data.metrics.occupiedRooms}/${data.metrics.totalRooms}`} note={`${data.metrics.occupancyPercent}% occupancy`} />
    </div>
    <div className="admin-two-col">
      <DailyList title="Arrivals" items={arrivals} empty="No confirmed arrivals today." onSelect={onSelect}/>
      <DailyList title="Departures" items={departures} empty="No confirmed departures today." onSelect={onSelect}/>
    </div>
  </section>;
}
function DailyList({title,items,empty,onSelect}:{title:string;items:ReservationRecord[];empty:string;onSelect:(r:string)=>void}) { return <div className="admin-card"><h2>{title}</h2>{items.length===0?<p className="admin-muted">{empty}</p>:<div className="admin-list">{items.map(item=><button key={item.reference} type="button" onClick={()=>onSelect(item.reference)}><div><strong>{item.guest.firstName} {item.guest.lastName}</strong><span>{roomName[item.roomId]} · {item.stay.rooms} room{item.stay.rooms===1?"":"s"}</span></div><span>{item.reference}</span></button>)}</div>}</div> }

function ReservationsPanel({data,reservations,query,setQuery,statusFilter,setStatusFilter,selected,onSelect,onChanged}:{data:AdminOverview;reservations:ReservationRecord[];query:string;setQuery:(v:string)=>void;statusFilter:string;setStatusFilter:(v:string)=>void;selected:ReservationRecord|null;onSelect:(v:string|null)=>void;onChanged:()=>Promise<void>}) {
  return <section className="admin-panel">
    <div className="admin-panel__heading"><div><span className="admin-eyebrow">Reservations</span><h1>Every stay, one clear record.</h1></div><span>{data.reservations.length} total records</span></div>
    <div className="admin-filterbar"><input aria-label="Search reservations" placeholder="Search guest, phone or reference" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter reservation status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{filterStatuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></div>
    <div className="admin-reservation-layout"><div className="admin-reservation-table"><div className="admin-table-head"><span>Guest / reference</span><span>Stay</span><span>Total</span><span>Status</span></div>{reservations.length===0?<p className="admin-empty">No reservations match this view.</p>:reservations.map(item=><button type="button" className="admin-reservation-row" data-active={selected?.reference===item.reference} key={item.reference} onClick={()=>onSelect(item.reference)}><span><strong>{item.guest.firstName} {item.guest.lastName}</strong><small>{item.reference}</small></span><span>{dateLabel(item.stay.checkIn)} → {dateLabel(item.stay.checkOut)}<small>{roomName[item.roomId]}</small></span><span>{formatMoney(item.pricing.grandTotal)}<small>{item.paymentStatus.replaceAll("_"," ")}</small></span><StatusBadge status={item.status}/></button>)}</div>{selected&&<ReservationDetail reservation={selected} onClose={()=>onSelect(null)} onChanged={onChanged}/>}</div>
  </section>;
}

function StatusBadge({status}:{status:string}) { return <span className="admin-status" data-status={status}>{status.replaceAll("_"," ")}</span> }

function ReservationDetail({reservation,onClose,onChanged}:{reservation:ReservationRecord;onClose:()=>void;onChanged:()=>Promise<void>}) {
  const [status,setStatus]=useState<ReservationStatus>(reservation.status); const [notes,setNotes]=useState(reservation.staffNotes??""); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{setStatus(reservation.status);setNotes(reservation.staffNotes??"");setError("");},[reservation.reference,reservation.status,reservation.staffNotes]);
  async function save(){setSaving(true);setError("");try{const r=await fetch(`/api/admin/reservations/${encodeURIComponent(reservation.reference)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,staffNotes:notes})});const d=await r.json();if(!r.ok)throw new Error(d?.error||"Reservation could not be updated.");await onChanged();}catch(e){setError(e instanceof Error?e.message:"Reservation could not be updated.");}finally{setSaving(false)}}
  return <aside className="admin-detail" aria-label={`Reservation ${reservation.reference}`}><div className="admin-detail__top"><div><span className="admin-eyebrow">{reservation.reference}</span><h2>{reservation.guest.firstName} {reservation.guest.lastName}</h2></div><button type="button" onClick={onClose} aria-label="Close reservation detail">×</button></div><dl className="admin-detail__facts"><div><dt>Phone</dt><dd><a href={`tel:${reservation.guest.phone}`}>{reservation.guest.phone}</a></dd></div><div><dt>Email</dt><dd><a href={`mailto:${reservation.guest.email}`}>{reservation.guest.email}</a></dd></div><div><dt>Stay</dt><dd>{dateLabel(reservation.stay.checkIn)} → {dateLabel(reservation.stay.checkOut)}</dd></div><div><dt>Room</dt><dd>{roomName[reservation.roomId]} · {reservation.stay.rooms} room(s)</dd></div><div><dt>Guests</dt><dd>{reservation.stay.adults} adult(s) · {reservation.stay.children} child(ren)</dd></div><div><dt>Rate plan</dt><dd>{bookingConfig.ratePlans.find((item)=>item.id===reservation.ratePlanId)?.label ?? reservation.ratePlanId}</dd></div><div><dt>Extras</dt><dd>{reservation.addonIds.length ? reservation.addonIds.map((id)=>bookingConfig.addons.find((item)=>item.id===id)?.label ?? id).join(", ") : "None"}</dd></div><div><dt>Room subtotal</dt><dd>{formatMoney(reservation.pricing.roomSubtotal)}</dd></div><div><dt>Extras charged</dt><dd>{formatMoney(reservation.pricing.extrasTotal)}</dd></div><div><dt>Discount</dt><dd>{formatMoney(reservation.pricing.discount)}</dd></div><div><dt>Tax / service</dt><dd>{formatMoney(reservation.pricing.tax)} / {formatMoney(reservation.pricing.serviceCharge)}</dd></div><div><dt>Total</dt><dd>{formatMoney(reservation.pricing.grandTotal)} · paid {formatMoney(reservation.pricing.amountPaid)} · due {formatMoney(reservation.pricing.amountDue)}</dd></div><div><dt>Payment</dt><dd>{reservation.paymentStatus.replaceAll("_"," ")}{reservation.paymentId?` · ${reservation.paymentId}`:""}{reservation.paymentOrderId?` · order ${reservation.paymentOrderId}`:""}</dd></div><div><dt>Source</dt><dd>{reservation.source}</dd></div><div><dt>Created</dt><dd>{dateTimeLabel(reservation.createdAt)}</dd></div>{reservation.guest.companyName&&<div><dt>Company</dt><dd>{reservation.guest.companyName}{reservation.guest.gstNumber?` · GST ${reservation.guest.gstNumber}`:""}</dd></div>}</dl>{reservation.guest.specialRequests&&<div className="admin-note"><span>Guest request</span><p>{reservation.guest.specialRequests}</p></div>}{reservation.guest.arrivalNotes&&<div className="admin-note"><span>Arrival notes</span><p>{reservation.guest.arrivalNotes}</p></div>}<label className="admin-field"><span>Reservation status</span><select value={status} onChange={e=>setStatus(e.target.value as ReservationStatus)}>{!editableStatuses.includes(reservation.status)&&<option value={reservation.status}>{reservation.status.replaceAll("_"," ")} (current)</option>}{editableStatuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label><label className="admin-field"><span>Staff notes</span><textarea rows={5} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Internal only"/></label>{error&&<p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" type="button" onClick={save} disabled={saving}>{saving?"Saving…":"Save reservation"}</button></aside>
}

function InventoryPanel({data,onChanged}:{data:AdminOverview;onChanged:()=>Promise<void>}) {
  const [roomId,setRoomId]=useState<RoomId>("deluxe"); const [date,setDate]=useState(todayLocal()); const [quantity,setQuantity]=useState(1); const [reason,setReason]=useState("");
  const [overrideRoom,setOverrideRoom]=useState<RoomId>("deluxe"); const [overrideDate,setOverrideDate]=useState(todayLocal()); const [overrideInventory,setOverrideInventory]=useState(""); const [overrideRate,setOverrideRate]=useState(""); const [message,setMessage]=useState("");
  async function request(url:string,init:RequestInit){setMessage("");const r=await fetch(url,init);const d=await r.json();if(!r.ok)throw new Error(d?.error||"Update failed.");await onChanged();return d;}
  async function saveRoom(e:FormEvent<HTMLFormElement>, id:RoomId){e.preventDefault();const form=new FormData(e.currentTarget);try{await request(`/api/admin/rooms/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({baseRate:Number(form.get("baseRate")),totalInventory:Number(form.get("totalInventory"))})});setMessage("Room settings saved.");}catch(err){setMessage(err instanceof Error?err.message:"Update failed.")}}
  async function addBlock(e:FormEvent){e.preventDefault();try{await request("/api/admin/inventory/blocks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId,date,quantity,reason})});setReason("");setMessage("Inventory block added.");}catch(err){setMessage(err instanceof Error?err.message:"Update failed.")}}
  async function saveOverride(e:FormEvent){e.preventDefault();try{await request("/api/admin/inventory/overrides",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({roomId:overrideRoom,date:overrideDate,totalInventory:overrideInventory===""?null:Number(overrideInventory),baseRate:overrideRate===""?null:Number(overrideRate)})});setOverrideInventory("");setOverrideRate("");setMessage("Date override saved.");}catch(err){setMessage(err instanceof Error?err.message:"Update failed.")}}
  return <section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Availability & rates</span><h1>Control what the website can sell.</h1></div><span>Changes affect public availability and new reservation pricing.</span></div>{message&&<div className="admin-notice">{message}</div>}<div className="admin-room-settings">{rooms.map(room=>{const setting=data.operations.roomSettings[room.id];return <form key={room.id} className="admin-card admin-room-setting" onSubmit={e=>saveRoom(e,room.id)}><span className="admin-eyebrow">{room.name}</span><label><span>Base rate / night</span><input name="baseRate" type="number" min="0" step="1" defaultValue={setting.baseRate}/></label><label><span>Category inventory</span><input name="totalInventory" type="number" min="0" max="100" step="1" defaultValue={setting.totalInventory}/></label><button type="submit">Save</button></form>})}</div><div className="admin-two-col admin-inventory-tools"><form className="admin-card" onSubmit={addBlock}><h2>Block rooms</h2><p className="admin-muted">Maintenance, owner use or temporary out-of-order stock.</p><AdminRoomSelect value={roomId} onChange={setRoomId}/><label className="admin-field"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="admin-field"><span>Rooms to block</span><input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><label className="admin-field"><span>Reason</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Optional internal note"/></label><button className="admin-primary" type="submit">Add block</button></form><form className="admin-card" onSubmit={saveOverride}><h2>Date override</h2><p className="admin-muted">Override category inventory and/or nightly base rate for one date.</p><AdminRoomSelect value={overrideRoom} onChange={setOverrideRoom}/><label className="admin-field"><span>Date</span><input type="date" value={overrideDate} onChange={e=>setOverrideDate(e.target.value)}/></label><label className="admin-field"><span>Inventory override</span><input type="number" min="0" max="100" value={overrideInventory} onChange={e=>setOverrideInventory(e.target.value)} placeholder="Leave blank to keep base"/></label><label className="admin-field"><span>Rate override</span><input type="number" min="0" value={overrideRate} onChange={e=>setOverrideRate(e.target.value)} placeholder="Leave blank to keep base"/></label><button className="admin-primary" type="submit">Save override</button></form></div><InventoryGrid data={data}/><div className="admin-two-col"><ActiveBlocks data={data} onChanged={onChanged}/><ActiveOverrides data={data} onChanged={onChanged}/></div></section>
}
function AdminRoomSelect({value,onChange}:{value:RoomId;onChange:(v:RoomId)=>void}){return <label className="admin-field"><span>Room category</span><select value={value} onChange={e=>onChange(e.target.value as RoomId)}>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}
function InventoryGrid({data}:{data:AdminOverview}){const dates=Array.from(new Set(data.inventory.map(i=>i.date))).slice(0,7);return <div className="admin-card admin-inventory-grid"><div className="admin-card__heading"><h2>Next 7 days</h2><span>Available / total · nightly rate</span></div><div className="admin-inventory-table"><div className="admin-inventory-table__head"><span>Date</span>{rooms.map(r=><span key={r.id}>{r.name.replace(" Room","")}</span>)}</div>{dates.map(date=><div className="admin-inventory-table__row" key={date}><strong>{dateLabel(date)}</strong>{rooms.map(room=>{const cell=data.inventory.find(i=>i.date===date&&i.roomId===room.id)!;return <span key={room.id} data-low={cell.available<=2?"true":"false"}><b>{cell.available}/{cell.total}</b><small>{formatMoney(cell.baseRate)}</small>{cell.blocked>0&&<em>{cell.blocked} blocked</em>}</span>})}</div>)}</div></div>}
function ActiveBlocks({data,onChanged}:{data:AdminOverview;onChanged:()=>Promise<void>}){async function remove(id:string){const r=await fetch(`/api/admin/inventory/blocks?id=${encodeURIComponent(id)}`,{method:"DELETE"});if(r.ok)await onChanged();}return <div className="admin-card"><h2>Active blocks</h2>{data.blocks.length===0?<p className="admin-muted">No room blocks configured.</p>:<div className="admin-compact-list">{data.blocks.slice(0,20).map(b=><div key={b.id}><span><strong>{dateLabel(b.date)} · {roomName[b.roomId]}</strong><small>{b.quantity} room(s){b.reason?` · ${b.reason}`:""}</small></span><button type="button" onClick={()=>remove(b.id)}>Remove</button></div>)}</div>}</div>}
function ActiveOverrides({data,onChanged}:{data:AdminOverview;onChanged:()=>Promise<void>}){async function remove(id:string){const r=await fetch(`/api/admin/inventory/overrides?id=${encodeURIComponent(id)}`,{method:"DELETE"});if(r.ok)await onChanged();}const list=[...data.operations.dateOverrides].sort((a,b)=>a.date.localeCompare(b.date));return <div className="admin-card"><h2>Date overrides</h2>{list.length===0?<p className="admin-muted">No date-specific overrides.</p>:<div className="admin-compact-list">{list.slice(0,20).map(o=><div key={o.id}><span><strong>{dateLabel(o.date)} · {roomName[o.roomId]}</strong><small>{o.totalInventory!=null?`${o.totalInventory} rooms`:"base inventory"} · {o.baseRate!=null?formatMoney(o.baseRate):"base rate"}</small></span><button type="button" onClick={()=>remove(o.id)}>Remove</button></div>)}</div>}</div>}

function PaymentsPanel({data,onSelect}:{data:AdminOverview;onSelect:(reference:string)=>void}) {
  const paid=data.reservations.filter(r=>r.paymentStatus==="paid"); const pending=data.reservations.filter(r=>r.paymentStatus==="pending"||r.paymentStatus==="not_started"); const failed=data.reservations.filter(r=>r.paymentStatus==="failed"); const paidTotal=paid.reduce((s,r)=>s+r.pricing.amountPaid,0); const due=data.reservations.filter(r=>r.status!=="cancelled").reduce((s,r)=>s+r.pricing.amountDue,0);
  return <section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Payments</span><h1>Payment status without reconciliation guesswork.</h1></div></div><div className="admin-metrics-grid"><Metric label="Paid reservations" value={paid.length}/><Metric label="Pending" value={pending.length}/><Metric label="Failed" value={failed.length}/><Metric label="Amount paid" value={formatMoney(paidTotal)}/><Metric label="Outstanding" value={formatMoney(due)}/></div><div className="admin-card"><div className="admin-card__heading"><h2>Recent payment records</h2><span>Payment state comes from reservation/payment records.</span></div><div className="admin-list">{data.reservations.slice(0,30).map(item=><button type="button" key={item.reference} onClick={()=>onSelect(item.reference)}><div><strong>{item.reference} · {item.guest.firstName} {item.guest.lastName}</strong><span>{formatMoney(item.pricing.grandTotal)} · paid {formatMoney(item.pricing.amountPaid)} · due {formatMoney(item.pricing.amountDue)}</span></div><StatusBadge status={item.paymentStatus}/></button>)}</div></div></section>
}
