"use client";

import { useState } from "react";
import { formatMoney } from "@/data/commerce";
import { DateFields, useStayPlanner } from "@/components/layout/StayPlanner";
import { PillButton } from "@/components/ui/Buttons";
import { AskTrigger } from "@/components/ui/AskTrigger";
import { averageNightlyRate, stayRoomSubtotal, type RoomRateCard } from "@/lib/booking/rateCard";
import { FromPrice } from "./RoomPrice";

type Availability = { mode: "development" | "production"; rooms: Array<{ roomId: string; available: number; nightlyRates: Array<{ rate: number }> }> };
type Status = { kind: "idle" | "loading" } | { kind: "error"; message: string } | { kind: "result"; available: number; total: number; average: number; nights: number; preview: boolean };

/**
 * Booking rail for one room (sticky on desktop, inline on mobile where the dock also books): the
 * live "from" price (rate card), dates shared with the rest of the site, a real availability check
 * through /api/availability — whose nightly rates are the ones the quote and hold charge — then
 * Book with this room preselected. The "from" price and the selected-dates quote are labelled apart.
 */
export function RoomBookingRail({ roomId, roomName, rate }: { roomId: string; roomName: string; rate: RoomRateCard | null }) {
  const { checkIn, checkOut, book } = useStayPlanner();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function check() {
    if (!checkIn || !checkOut) {
      setStatus({ kind: "error", message: "Choose your check-in and check-out dates first." });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const response = await fetch("/api/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkIn, checkOut }) });
      const payload = (await response.json().catch(() => null)) as (Availability & { error?: { message?: string } }) | null;
      if (!response.ok || !payload) throw new Error(payload?.error?.message ?? "Availability could not be checked right now.");
      const room = payload.rooms.find((item) => item.roomId === roomId);
      if (!room) throw new Error("Availability could not be checked right now.");
      setStatus({ kind: "result", available: room.available, total: stayRoomSubtotal(room.nightlyRates), average: averageNightlyRate(room.nightlyRates), nights: room.nightlyRates.length, preview: payload.mode !== "production" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Availability could not be checked right now." });
    }
  }

  return (
    <aside className="tj-rail" aria-labelledby="rail-title">
      <h2 id="rail-title" className="tj-rail__title">
        {roomName}
      </h2>
      <p className="tj-eyebrow tj-rail__eyebrow">Direct rate</p>
      <FromPrice rate={rate} />
      <DateFields idPrefix="rail" />
      <div className="tj-rail__actions">
        <PillButton variant="outline" onClick={() => void check()} disabled={status.kind === "loading"}>
          {status.kind === "loading" ? "Checking…" : "Check availability"}
        </PillButton>
        <PillButton variant="lake" dot onClick={() => book({ roomId })}>
          Book this room
        </PillButton>
      </div>
      <div aria-live="polite" className="tj-rail__status">
        {status.kind === "error" ? <p className="tj-form-error">{status.message}</p> : null}
        {status.kind === "result" ? (
          status.available > 0 ? (
            <div className="tj-rail__quote" data-quote-total={status.total}>
              <span className="tj-eyebrow">Your dates · available</span>
              <p>
                <strong>{formatMoney(status.total)}</strong> for {status.nights} night{status.nights === 1 ? "" : "s"}
                {status.nights > 1 ? <span> · {formatMoney(status.average)} / night on average</span> : null}
              </p>
              <small>Exact price for these dates, room only, before any taxes or extras. The full total is shown before you pay.</small>
              {status.preview ? <small>Preview inventory: your booking confirms the final availability.</small> : null}
            </div>
          ) : (
            <p>
              Not available for these dates. Try other dates or <AskTrigger topic={roomName} className="tj-text-link">ask the hotel</AskTrigger>.
            </p>
          )
        ) : null}
      </div>
      <AskTrigger topic={roomName} className="tj-text-link tj-rail__ask">
        Questions about this room? Ask us →
      </AskTrigger>
    </aside>
  );
}
