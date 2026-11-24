"use client";

import Image from "next/image";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { averageNightlyRate, stayRoomSubtotal } from "@/lib/booking/rateCard";
import { occupancyError } from "@/lib/booking/validation";
import type { PriceBreakdown, PublicAvailabilityRoom } from "@/types/booking";
import type { Room } from "@/types/hotel";
import { PillAnchor, PillButton } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";

/**
 * A booking error. Ordinary problems (a date in the past, a missing field) show the message. A
 * service problem — the booking service is down or unreachable — also offers the hotel's phone and
 * WhatsApp, because the hotel can take the booking directly while the website cannot.
 */
export function BookingErrorNotice({ message, help, onRetry }: { message: string; help: boolean; onRetry?: () => void }) {
  return (
    <div className="bk-error" role="alert" data-help={help ? "true" : undefined}>
      <p>
        {help ? <strong>The booking service is not responding right now. </strong> : null}
        {message}
      </p>
      {help ? (
        <div className="bk-error__actions">
          {onRetry ? (
            <PillButton onClick={onRetry} arrow={false}>
              Try again
            </PillButton>
          ) : null}
          <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false}>
            <Icon name="phone" size={16} /> Call the hotel
          </PillAnchor>
          <PillAnchor href={`https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I could not complete my booking on the website and would like to book directly.")}`} target="_blank" rel="noreferrer" arrow={false}>
            <Icon name="whatsapp" size={16} /> WhatsApp
          </PillAnchor>
        </div>
      ) : null}
    </div>
  );
}

/** One selectable room with its live rate for the dates, availability and occupancy state. */
export function RoomChoice({
  room,
  inventory,
  rooms,
  adults,
  childGuests,
  selected,
  onSelect,
}: {
  room: Room;
  inventory: PublicAvailabilityRoom | undefined;
  rooms: number;
  adults: number;
  childGuests: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const soldOut = Boolean(inventory && inventory.available < rooms);
  const occupancy = inventory ? occupancyError({ maxAdults: inventory.maxAdults ?? null, maxChildren: inventory.maxChildren ?? null }, adults, childGuests, rooms) : null;
  const limited = Boolean(inventory && !soldOut && inventory.available <= 2);
  const nights = inventory?.nightlyRates?.length ?? 0;
  const total = nights ? stayRoomSubtotal(inventory!.nightlyRates) : null;
  const disabled = soldOut || Boolean(occupancy);
  return (
    <button type="button" className="tj-book-room bk-room" aria-pressed={selected} disabled={disabled} onClick={onSelect}>
      <span className="bk-room__photo">
        <Image src={room.imageSet[0]} alt={`${room.name} at Tejjora Lake View`} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 40vw, 100vw" />
        {limited ? <span className="bk-room__flag">Only {inventory!.available} left</span> : null}
      </span>
      <span className="bk-room__body">
        <span className="bk-room__title">{room.name}</span>
        <span className="bk-room__chips">
          {room.amenities.slice(0, 4).map((amenity) => (
            <span key={amenity.id}>{amenity.label}</span>
          ))}
        </span>
        {total !== null ? (
          <span className="bk-room__price" data-quote-total={total}>
            <strong>{formatMoney(total)}</strong>
            <small>
              {nights} night{nights === 1 ? "" : "s"}
              {nights > 1 ? ` · ${formatMoney(averageNightlyRate(inventory!.nightlyRates))} / night on average` : ""} · per room · room only
            </small>
          </span>
        ) : (
          <span className="bk-room__price bk-room__price--pending">
            <span className="bk-skeleton" aria-hidden="true" />
            <small role="status">Checking the rate for your dates…</small>
          </span>
        )}
        <span className="bk-room__state" data-tone={disabled ? "off" : selected ? "on" : undefined}>
          {soldOut ? "Not available for these dates" : occupancy ? occupancy : selected ? (<><span className="tj-pill__dot" aria-hidden="true" /> Selected</>) : "Select this room"}
        </span>
      </span>
    </button>
  );
}

const money = (value: number) => formatMoney(value);

/**
 * The server's quote, line by line. Every figure is from the quote (the single pricing authority);
 * lines that are zero are left out so the breakdown only shows what the stay actually includes.
 */
export function PriceBreakdownRows({ pricing, rooms, quoting }: { pricing: PriceBreakdown | null; rooms: number; quoting: boolean }) {
  const dash = "—";
  return (
    <div className="bk-quote" aria-busy={quoting}>
      <dl>
        <div>
          <dt>
            Room · {pricing ? `${pricing.nights} night${pricing.nights === 1 ? "" : "s"}` : "…"}
            {rooms > 1 ? ` × ${rooms} rooms` : ""}
          </dt>
          <dd>{pricing ? money(pricing.roomSubtotal) : dash}</dd>
        </div>
        {pricing && pricing.rateAdjustment !== 0 ? (
          <div>
            <dt>Rate plan</dt>
            <dd>{pricing.rateAdjustment > 0 ? "+" : "−"}{money(Math.abs(pricing.rateAdjustment))}</dd>
          </div>
        ) : null}
        {pricing && pricing.extraGuestCharge > 0 ? (
          <div>
            <dt>Extra adults</dt>
            <dd>{money(pricing.extraGuestCharge)}</dd>
          </div>
        ) : null}
        {pricing && pricing.childrenCharge > 0 ? (
          <div>
            <dt>Children</dt>
            <dd>{money(pricing.childrenCharge)}</dd>
          </div>
        ) : null}
        {pricing && pricing.extrasTotal > 0 ? (
          <div>
            <dt>Extras</dt>
            <dd>{money(pricing.extrasTotal)}</dd>
          </div>
        ) : null}
        {pricing && pricing.discount > 0 ? (
          <div className="bk-quote__discount">
            <dt>Promo discount</dt>
            <dd>−{money(pricing.discount)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Tax</dt>
          <dd>{pricing ? money(pricing.tax) : dash}</dd>
        </div>
        <div>
          <dt>Service charge</dt>
          <dd>{pricing ? money(pricing.serviceCharge) : dash}</dd>
        </div>
        <div className="bk-quote__total">
          <dt>{quoting ? "Total (checking…)" : "Total"}</dt>
          <dd>{pricing ? money(pricing.grandTotal) : dash}</dd>
        </div>
      </dl>
      {pricing?.nightlyRates && pricing.nightlyRates.length > 1 ? (
        <details className="bk-quote__nights">
          <summary>Rate for each night</summary>
          <ul>
            {pricing.nightlyRates.map((night) => (
              <li key={night.date}>
                <span>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${night.date}T12:00:00Z`))}</span>
                <span>{money(night.rate)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {pricing?.hasUnconfiguredCharges ? <p className="bk-quote__note">Some request-only extras are not included in the payable total; the hotel will confirm them.</p> : null}
    </div>
  );
}

/** What happens after "Hold room": three plain steps, so the payment is never a surprise. */
export function NextSteps() {
  const steps = [
    { icon: "key" as const, title: "We hold your room", copy: "The room is held for you while you pay." },
    { icon: "shield" as const, title: "You pay securely", copy: "Online payment, when it is available; otherwise the hotel will help you." },
    { icon: "calendar" as const, title: "You get your confirmation", copy: "A reference you can use any time under Manage booking." },
  ];
  return (
    <ol className="bk-next" aria-label="What happens next">
      {steps.map((step, index) => (
        <li key={step.title}>
          <span className="bk-next__icon" aria-hidden="true">
            <Icon name={step.icon} size={18} />
          </span>
          <span>
            <strong>
              {index + 1}. {step.title}
            </strong>
            <small>{step.copy}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
