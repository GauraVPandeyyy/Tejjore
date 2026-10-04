"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { arrivalOptions, preferenceOptions, tripPurposeOptions } from "@/data/planner";
import { nearbyPlaces } from "@/data/nearby";
import { rooms } from "@/data/rooms";
import { createStayPlan } from "@/lib/planner/rules";
import type { ArrivalSource, PlanMyStayInput, PlanMyStayResult, StayPreferences, TripPurpose } from "@/types/planner";
import { SectionLabel } from "@/components/shared/SectionLabel";

function todayValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(value: string, days: number) {
  if (!value) return "";
  const d = new Date(`${value}T12:00:00`); d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function mapsSearchUrl(query: string) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }

export function PlanMyStay({ index = "01" }: { index?: string }) {
  const today = useMemo(() => todayValue(), []);
  const [purpose, setPurpose] = useState<TripPurpose>("weekend");
  const [arrival, setArrival] = useState<ArrivalSource>("local");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [destination, setDestination] = useState("");
  const [preferences, setPreferences] = useState<StayPreferences>({ breakfast:false, airportPickup:false, earlyCheckIn:false, lateCheckout:false });
  const [result, setResult] = useState<PlanMyStayResult | null>(null);

  function togglePreference(key: keyof StayPreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function buildPlan() {
    const input: PlanMyStayInput = { purpose, arrival, checkIn, checkOut, adults, children, destination, preferences };
    setResult(createStayPlan(input));
  }

  const bookingHref = result ? (() => {
    const params = new URLSearchParams({ adults:String(adults), children:String(children), room:result.recommendedRoomId });
    if (checkIn && checkOut) { params.set("checkIn",checkIn); params.set("checkOut",checkOut); }
    if (result.ratePlanId) params.set("rate", result.ratePlanId);
    if (result.addonIds.length) params.set("addons", result.addonIds.join(","));
    return `/book?${params.toString()}`;
  })() : "/book";

  return (
    <section className="plan-v2" aria-labelledby="plan-v2-title">
      <div className="site-container">
        <div className="plan-v2__intro">
          <SectionLabel index={index}>PLAN YOUR STAY</SectionLabel>
          <h1 id="plan-v2-title">Tell us the kind of stay.<br/><em>We’ll narrow the rest.</em></h1>
          <p>No long wizard. Pick the trip style, add only the details that matter, and get a room starting point plus useful next steps.</p>
        </div>

        <div className="plan-v2__panel">
          <div className="plan-v2__group">
            <span className="micro">WHAT ARE YOU PLANNING?</span>
            <div className="plan-v2__choices plan-v2__choices--purpose">
              {tripPurposeOptions.map((item)=><button key={item.id} type="button" data-selected={purpose===item.id} onClick={()=>setPurpose(item.id)}><strong>{item.label}</strong><small>{item.copy}</small></button>)}
            </div>
          </div>

          <div className="plan-v2__compact-grid">
            <div className="plan-v2__group">
              <span className="micro">ARRIVAL</span>
              <select value={arrival} onChange={(e)=>{const next=e.target.value as ArrivalSource; setArrival(next); if(next!=="airport") setPreferences((p)=>({...p,airportPickup:false}));}}>
                {arrivalOptions.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
            <label><span>Check-in <small>optional</small></span><input type="date" min={today} value={checkIn} onChange={(e)=>{setCheckIn(e.target.value); if(checkOut && e.target.value>=checkOut) setCheckOut(addDays(e.target.value,1));}} /></label>
            <label><span>Check-out <small>optional</small></span><input type="date" min={checkIn ? addDays(checkIn,1) : today} value={checkOut} onChange={(e)=>setCheckOut(e.target.value)} /></label>
            <label><span>Adults</span><input type="number" min="1" max="12" value={adults} onChange={(e)=>setAdults(Math.max(1,Math.min(12,Number(e.target.value)||1)))} /></label>
            <label><span>Children</span><input type="number" min="0" max="8" value={children} onChange={(e)=>setChildren(Math.max(0,Math.min(8,Number(e.target.value)||0)))} /></label>
            <label className="plan-v2__destination"><span>Main place / meeting <small>optional</small></span><input value={destination} onChange={(e)=>setDestination(e.target.value)} placeholder="e.g. IGP, Hazratganj" /></label>
          </div>

          <div className="plan-v2__group">
            <span className="micro">USEFUL EXTRAS</span>
            <div className="plan-v2__toggles">
              {preferenceOptions.map((item)=>{const key=item.id as keyof StayPreferences; const disabled=key==="airportPickup"&&arrival!=="airport"; return <button key={item.id} type="button" disabled={disabled} data-selected={preferences[key]} onClick={()=>togglePreference(key)}><span>{preferences[key]?"✓":"+"}</span><strong>{item.label}</strong></button>})}
            </div>
          </div>

          <button className="plan-v2__build" type="button" onClick={buildPlan}>Build my stay idea <span aria-hidden="true">↗</span></button>
        </div>

        {result ? <PlanResult result={result} bookingHref={bookingHref} /> : null}
      </div>
    </section>
  );
}

function PlanResult({ result, bookingHref }: { result: PlanMyStayResult; bookingHref: string }) {
  const room = rooms.find((item)=>item.id===result.recommendedRoomId) ?? rooms[0];
  const nearby = nearbyPlaces.filter((place)=>result.nearbyPlaceIds.includes(place.id));
  return <div className="plan-v2-result">
    <figure><Image src={room.imageSet[0]} alt={`${room.name} at Tejjora Lake View`} fill sizes="(max-width:820px) 100vw, 46vw" /></figure>
    <div className="plan-v2-result__copy"><span className="micro">YOUR STARTING POINT</span><h2>{room.name}</h2><p>{result.roomReason}</p><p className="plan-v2-result__note">{result.fitNote}</p><div className="v2-page-actions"><Link href={bookingHref}>Check this stay ↗</Link><Link href="/rooms">Compare rooms ↗</Link></div></div>
    <div className="plan-v2-result__steps">{result.suggestions.map((item,index)=><article key={item.id}><span>{String(index+1).padStart(2,"0")}</span><small>{item.label}</small><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div>
    {nearby.length ? <div className="plan-v2-result__nearby"><span className="micro">RELEVANT PLACES</span>{nearby.map((place)=><a key={place.id} href={mapsSearchUrl(place.mapsQuery)} target="_blank" rel="noreferrer">{place.name} ↗</a>)}</div>:null}
  </div>;
}
