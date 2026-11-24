import { bookingConfig } from "@/data/booking";
import { formatMoney } from "@/data/commerce";
import { rooms } from "@/data/rooms";
import { calculateNights, formatStayDates } from "@/lib/booking/request";
import { calculateBookingPrice } from "@/lib/booking/pricing";
import type { PublicAvailabilityRoom, BookingDraft, BookingRequestPayload } from "@/types/booking";

/**
 * The stay total shown beside and above the booking steps: only ever computed from the live nightly
 * rates for these dates (the availability service's own rates); never from a default rate. The final
 * figure is the server's quote at checkout.
 */
function summaryPricing(draft: BookingDraft, availability: PublicAvailabilityRoom[]) {
  const rate = bookingConfig.ratePlans.find((item) => item.id === draft.ratePlanId);
  const inventory = draft.roomId ? availability.find((item) => item.roomId === draft.roomId) : null;
  if (!(draft.roomId && draft.ratePlanId && draft.stay.checkIn && draft.stay.checkOut && rate?.onlineBookable && inventory?.nightlyRates?.length)) return null;
  try {
    const payload: BookingRequestPayload = { stay: draft.stay, roomId: draft.roomId, ratePlanId: draft.ratePlanId, addonIds: draft.addonIds, ...(draft.promoCode?.trim() ? { promoCode: draft.promoCode.trim().toUpperCase() } : {}), guest: draft.guest, source: "website" };
    return calculateBookingPrice(payload, 0, { nightlyRates: inventory.nightlyRates, deferPromo: true });
  } catch {
    return null;
  }
}

/** Phones: a slim bar under the header keeps the room, dates and total in view while the steps scroll. */
export function BookingBar({ draft, availability = [] }: { draft: BookingDraft; availability?: PublicAvailabilityRoom[] }) {
  const room = rooms.find((item) => item.id === draft.roomId);
  const pricing = summaryPricing(draft, availability);
  if (!room || !pricing) return null;
  return (
    <a className="bk-bar" href="#booking-summary" aria-label={`${room.name}, ${formatStayDates(draft.stay.checkIn, draft.stay.checkOut)}, total ${formatMoney(pricing.grandTotal)}. Jump to the stay summary.`}>
      <span className="bk-bar__what">
        <strong>{room.name}</strong>
        <small>{formatStayDates(draft.stay.checkIn, draft.stay.checkOut)}</small>
      </span>
      <span className="bk-bar__total">{formatMoney(pricing.grandTotal)}</span>
    </a>
  );
}

export function BookingSummary({ draft, availability = [] }: { draft: BookingDraft; availability?: PublicAvailabilityRoom[] }) {
  const room = rooms.find((item) => item.id === draft.roomId);
  const rate = bookingConfig.ratePlans.find((item) => item.id === draft.ratePlanId);
  const addons = bookingConfig.addons.filter((item) => draft.addonIds.includes(item.id));
  const pricing = summaryPricing(draft, availability);

  return (
    <aside id="booking-summary" className="tj-book-summary" aria-label="Stay summary">
      <p className="tj-eyebrow">Your stay</p>
      <h2 className="tj-rail__title">{room?.name ?? "Choose your room"}</h2>
      <dl className="tj-specs">
        <div><dt>Stay</dt><dd>{draft.stay.checkIn && draft.stay.checkOut ? formatStayDates(draft.stay.checkIn, draft.stay.checkOut) : "Choose dates"}</dd></div>
        <div><dt>Nights</dt><dd>{pricing?.nights || calculateNights(draft.stay.checkIn, draft.stay.checkOut) || "—"}</dd></div>
        <div><dt>Guests</dt><dd>{draft.stay.adults} adult{draft.stay.adults === 1 ? "" : "s"}{draft.stay.children ? ` · ${draft.stay.children} child${draft.stay.children === 1 ? "" : "ren"}` : ""}</dd></div>
        <div><dt>Rooms</dt><dd>{draft.stay.rooms}</dd></div>
        <div><dt>Rate plan</dt><dd>{rate?.label ?? "Choose a rate plan"}</dd></div>
        {draft.promoCode?.trim() ? <div><dt>Promo</dt><dd>{draft.promoCode.trim().toUpperCase()}</dd></div> : null}
      </dl>
      {addons.length > 0 && <div className="tj-book-summary__addons"><p className="tj-eyebrow">Requested extras</p><ul className="tj-notes tj-notes--compact">{addons.map((addon) => <li key={addon.id}>{addon.label}{!addon.onlineBookable ? " · price pending" : ""}</li>)}</ul></div>}
      <div className="tj-book-summary__price">
        <span>Configured stay total</span>
        <strong>{pricing ? formatMoney(pricing.grandTotal) : "—"}</strong>
        {pricing && <small>{pricing.nights} night{pricing.nights === 1 ? "" : "s"} · {formatMoney(Math.round(pricing.roomSubtotal / Math.max(1, pricing.nights * draft.stay.rooms)))} / room / night on average</small>}
        {pricing?.nightlyRates && new Set(pricing.nightlyRates.map((item)=>item.rate)).size > 1 && <small>Nightly rates vary by date; the total above includes configured date overrides.</small>}
        {pricing && draft.promoCode?.trim() ? <small>Promo code is checked and any discount applied when your room is held.</small> : null}
        {pricing?.hasUnconfiguredCharges && <small>Requested extras with unconfigured prices are not included in this total.</small>}
      </div>
    </aside>
  );
}
