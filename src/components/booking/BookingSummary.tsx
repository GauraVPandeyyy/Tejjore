import { bookingConfig } from "@/data/booking";
import { formatMoney } from "@/data/commerce";
import { rooms } from "@/data/rooms";
import { calculateNights, formatStayDates } from "@/lib/booking/request";
import { calculateBookingPrice } from "@/lib/booking/pricing";
import type { PublicAvailabilityRoom, BookingDraft, BookingRequestPayload } from "@/types/booking";

export function BookingSummary({ draft, availability = [] }: { draft: BookingDraft; availability?: PublicAvailabilityRoom[] }) {
  const room = rooms.find((item) => item.id === draft.roomId);
  const rate = bookingConfig.ratePlans.find((item) => item.id === draft.ratePlanId);
  const addons = bookingConfig.addons.filter((item) => draft.addonIds.includes(item.id));
  const inventory = draft.roomId ? availability.find((item) => item.roomId === draft.roomId) : null;
  let pricing: ReturnType<typeof calculateBookingPrice> | null = null;
  if (draft.roomId && draft.ratePlanId && draft.stay.checkIn && draft.stay.checkOut && rate?.onlineBookable) {
    try {
      const payload: BookingRequestPayload = { stay: draft.stay, roomId: draft.roomId, ratePlanId: draft.ratePlanId, addonIds: draft.addonIds, ...(draft.promoCode?.trim() ? { promoCode: draft.promoCode.trim().toUpperCase() } : {}), guest: draft.guest, source: "website" };
      pricing = calculateBookingPrice(payload, 0, { baseRate: inventory?.baseRate, nightlyRates: inventory?.nightlyRates, deferPromo: true });
    } catch { pricing = null; }
  }

  return (
    <aside className="booking-summary" aria-label="Stay summary">
      <span className="micro">Your stay</span>
      <h2>{room?.name ?? "Choose your room"}</h2>
      <dl className="booking-summary__facts">
        <div><dt>Stay</dt><dd>{draft.stay.checkIn && draft.stay.checkOut ? formatStayDates(draft.stay.checkIn, draft.stay.checkOut) : "Choose dates"}</dd></div>
        <div><dt>Nights</dt><dd>{pricing?.nights || calculateNights(draft.stay.checkIn, draft.stay.checkOut) || "—"}</dd></div>
        <div><dt>Guests</dt><dd>{draft.stay.adults} adult{draft.stay.adults === 1 ? "" : "s"}{draft.stay.children ? ` · ${draft.stay.children} child${draft.stay.children === 1 ? "" : "ren"}` : ""}</dd></div>
        <div><dt>Rooms</dt><dd>{draft.stay.rooms}</dd></div>
        <div><dt>Rate plan</dt><dd>{rate?.label ?? "Choose a rate plan"}</dd></div>
        {draft.promoCode?.trim() ? <div><dt>Promo</dt><dd>{draft.promoCode.trim().toUpperCase()}</dd></div> : null}
      </dl>
      {addons.length > 0 && <div className="booking-summary__addons"><span className="micro">Requested extras</span><ul>{addons.map((addon) => <li key={addon.id}>{addon.label}{!addon.onlineBookable ? " · price pending" : ""}</li>)}</ul></div>}
      <div className="booking-summary__price">
        <span>Configured stay total</span>
        <strong>{pricing ? formatMoney(pricing.grandTotal) : "—"}</strong>
        {pricing && <small>{formatMoney(pricing.baseRatePerRoomNight)} / room / first night · {pricing.nights} night{pricing.nights === 1 ? "" : "s"}</small>}
        {pricing?.nightlyRates && new Set(pricing.nightlyRates.map((item)=>item.rate)).size > 1 && <small>Nightly rates vary by date; the total above includes configured date overrides.</small>}
        {pricing && draft.promoCode?.trim() ? <small>Promo code is checked and any discount applied when your room is held.</small> : null}
        {pricing?.hasUnconfiguredCharges && <small>Requested extras with unconfigured prices are not included in this total.</small>}
      </div>
    </aside>
  );
}
