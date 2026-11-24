"use client";

import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { bookingConfig } from "@/data/booking";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import type { MaskedReservationView, PublicReservationView } from "@/types/booking";
import { apiErrorMessage } from "@/lib/http/clientError";
import { formatStayDates } from "@/lib/booking/request";
import { PillAnchor, PillButton, PillLink } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { Ornament } from "@/components/ui/Waterline";

type RazorpayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };
declare global { interface Window { Razorpay?: RazorpayConstructor } }

async function loadRazorpay() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-tejjora-razorpay="true"]');
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve(true);
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.tejjoraRazorpay = "true";
    script.onload = () => { script.dataset.loaded = "true"; resolve(true); };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function statusCopy(reservation: PublicReservationView) {
  const holdExpired = reservation.paymentStatus !== "paid" && reservation.expiresAt != null && Date.parse(reservation.expiresAt) <= Date.now();
  if (holdExpired) return { label: "Hold expired", title: "This temporary room hold has expired.", copy: "Run a fresh availability search before attempting a new payment. Your previous reference remains available for support and audit history." };
  if (reservation.status === "confirmed" && reservation.paymentStatus === "paid") {
    return { label: "Confirmed", title: "Your stay is confirmed.", copy: "Payment is verified and the reservation is confirmed in Tejjora's booking system." };
  }
  if (reservation.status === "payment_review" && reservation.paymentStatus === "paid") {
    return { label: "Payment received · review", title: "Payment received. Hotel review is required.", copy: "Inventory changed while payment was completing. Tejjora must review the reservation before it is treated as confirmed." };
  }
  if (reservation.status === "cancelled") return { label: "Cancelled", title: "This reservation is cancelled.", copy: "Contact the hotel if you need help with the cancellation or payment record." };
  if (reservation.status === "completed") return { label: "Completed", title: "This stay is completed.", copy: "The reservation remains available here for reference." };
  if (reservation.status === "payment_failed") return { label: "Payment failed", title: "Payment was not completed.", copy: "If the temporary room hold is still active, you can try payment again. Otherwise, start a fresh availability search." };
  return { label: "Payment pending", title: "Your room is held temporarily.", copy: "Complete payment before the hold expires to confirm the reservation." };
}

function maskedCopy(view: MaskedReservationView) {
  if (view.status === "expired") return { label: "Hold expired", title: "This temporary room hold has expired.", copy: "Run a fresh availability search to book again. Your reference stays valid for support." };
  if (view.status === "confirmed" && view.paymentStatus === "paid") return { label: "Confirmed", title: "Your stay is confirmed.", copy: "Payment is verified and the reservation is confirmed." };
  if (view.status === "payment_review") return { label: "Payment received · review", title: "Payment received. Hotel review is required.", copy: "The hotel will review the reservation before it is treated as confirmed." };
  if (view.status === "cancelled") return { label: "Cancelled", title: "This reservation is cancelled.", copy: "Contact the hotel if you need help with the cancellation or payment record." };
  if (view.status === "completed") return { label: "Completed", title: "This stay is completed.", copy: "The reservation remains available here for reference." };
  if (view.status === "payment_failed") return { label: "Payment failed", title: "Payment was not completed.", copy: view.holdActive ? "Your room hold is still active; you can try payment again." : "Start a fresh availability search." };
  return { label: "Payment pending", title: "Your room is held temporarily.", copy: "Complete payment before the hold expires to confirm the reservation." };
}

const CLOCK_TICK_MS = 15_000;
function subscribeToClock(onTick: () => void) {
  const timer = window.setInterval(onTick, CLOCK_TICK_MS);
  return () => window.clearInterval(timer);
}
const readClock = () => Math.floor(Date.now() / CLOCK_TICK_MS) * CLOCK_TICK_MS;

export function ManageBooking({ initialReference = "" }: { initialReference?: string }) {
  // Re-evaluates the hold every 15 s, so the pay button disappears once the hold expires.
  const now = useSyncExternalStore(subscribeToClock, readClock, () => 0);
  const [reference, setReference] = useState(initialReference.toUpperCase());
  const [phone, setPhone] = useState("");
  const [masked, setMasked] = useState<MaskedReservationView | null>(null);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [reservation, setReservation] = useState<PublicReservationView | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [error, setError] = useState("");

  const room = useMemo(() => rooms.find((item) => item.id === reservation?.roomId), [reservation?.roomId]);
  const rate = useMemo(() => bookingConfig.ratePlans.find((item) => item.id === reservation?.ratePlanId), [reservation?.ratePlanId]);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setReservation(null); setMasked(null);
    try {
      const response = await fetch("/api/reservations/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, phone }),
      });
      const data = await response.json().catch(() => ({ error: `The booking service is unavailable (${response.status}). Please try again.` }));
      if (!response.ok) throw new Error(apiErrorMessage(data, "We could not find a booking with those details."));
      setMasked(data as MaskedReservationView);
      setReference((data as MaskedReservationView).reference);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not find a booking with those details.");
    } finally { setBusy(false); }
  }

  /** Paying (and the full breakdown) needs a second factor: the booking email, checked against the same booking. */
  async function unlock(event: FormEvent) {
    event.preventDefault();
    setUnlocking(true); setError("");
    try {
      const response = await fetch("/api/reservations/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email: unlockEmail, phone }),
      });
      const data = await response.json().catch(() => ({ error: `The booking service is unavailable (${response.status}). Please try again.` }));
      if (!response.ok) throw new Error(apiErrorMessage(data, "We could not verify those details."));
      setReservation(data as PublicReservationView);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not verify those details.");
    } finally { setUnlocking(false); }
  }

  async function verifyPayment(data: RazorpayResult | { testSuccess: true }) {
    if (!reservation) return;
    const response = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: reservation.reference, accessToken: reservation.accessToken, ...data }),
    });
    const verified = await response.json().catch(() => ({ error: `Payment verification is unavailable (${response.status}). Please try again.` }));
    if (!response.ok) throw new Error(apiErrorMessage(verified, "Payment verification failed."));
    setReservation((current) => current ? { ...current, status: verified.status, paymentStatus: verified.paymentStatus, pricing: verified.pricing, confirmationEmailStatus: verified.confirmationEmailStatus ?? current.confirmationEmailStatus } : current);
  }

  async function startPayment() {
    if (!reservation) return;
    setPaymentBusy(true); setError("");
    try {
      const response = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reservation.reference, accessToken: reservation.accessToken }),
      });
      const order = await response.json().catch(() => ({ error: `Payment could not be started (${response.status}). Please try again.` }));
      if (!response.ok) throw new Error(apiErrorMessage(order, "Payment could not be started."));
      if (order.mode === "test") {
        await verifyPayment({ testSuccess: true });
        setPaymentBusy(false);
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error("Secure payment checkout could not be loaded.");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "Tejjora Lake View",
        description: `Reservation ${reservation.reference}`,
        prefill: {
          name: `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
          email: reservation.guest.email,
          contact: reservation.guest.phone,
        },
        theme: { color: "#002E36" },
        handler: async (payment: RazorpayResult) => {
          try { await verifyPayment(payment); }
          catch (caught) { setError(caught instanceof Error ? caught.message : "Payment verification failed."); }
          finally { setPaymentBusy(false); }
        },
        modal: { ondismiss: () => setPaymentBusy(false) },
      });
      checkout.open();
      return;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be started.");
      setPaymentBusy(false);
    }
  }

  if (!reservation && !masked) {
    return (
      <section className="tj-manage" aria-labelledby="manage-booking-title">
        <div className="tj-manage__card">
          <Ornament />
          <h1 id="manage-booking-title" className="tj-heading">
            Find your booking
          </h1>
          <p className="tj-manage__lead">Enter your booking reference and the mobile number you booked with. A reference on its own never reveals guest details.</p>
          <form className="tj-manage__form" onSubmit={lookup}>
            <label className="tj-field">
              <span>Booking reference</span>
              <input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" placeholder="TLV-XXXX-XXXX-XX" required />
            </label>
            <label className="tj-field">
              <span>Registered mobile</span>
              <input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="98765 43210" required />
            </label>
            {error ? (
              <p className="tj-form-error" role="alert">
                {error}
              </p>
            ) : null}
            <PillButton type="submit" variant="lake" arrow className="tj-pill--block" disabled={busy}>
              {busy ? "Verifying…" : "Find booking"}
            </PillButton>
          </form>
          <p className="tj-manage__help">
            Can&rsquo;t verify the details? <a href={`tel:${hotel.phoneE164}`}>Call the hotel</a> or{" "}
            <a href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer">
              WhatsApp us
            </a>
            .
          </p>
        </div>
      </section>
    );
  }

  if (!reservation && masked) {
    const maskedStatus = maskedCopy(masked);
    const payable = masked.holdActive && masked.paymentStatus !== "paid" && masked.status !== "cancelled" && masked.status !== "completed";
    return (
      <section className="tj-manage" aria-labelledby="manage-booking-result-title">
        <div className="tj-manage__card tj-manage__card--result">
          <p className="tj-eyebrow">{maskedStatus.label}</p>
          <h1 id="manage-booking-result-title" className="tj-heading">
            {maskedStatus.title}
          </h1>
          <p className="tj-manage__lead">{maskedStatus.copy}</p>
          <div className="tj-reference">
            <span className="tj-reference__label">Booking reference</span>
            <strong className="tj-reference__value">{masked.reference}</strong>
          </div>
          <dl className="tj-specs tj-manage__specs">
            <ReviewRow label="Guest" value={masked.guestNameMasked} />
            <ReviewRow label="Mobile" value={`•••• ${masked.phoneLast4}`} />
            <ReviewRow label="Room" value={masked.roomName} />
            <ReviewRow label="Stay" value={`${formatStayDates(masked.checkIn, masked.checkOut)} · ${masked.nights} night${masked.nights === 1 ? "" : "s"}`} />
            <ReviewRow label="Guests" value={`${masked.guests.adults} adult${masked.guests.adults === 1 ? "" : "s"}${masked.guests.children ? `, ${masked.guests.children} child${masked.guests.children === 1 ? "" : "ren"}` : ""} · ${masked.guests.rooms} room${masked.guests.rooms === 1 ? "" : "s"}`} />
            <ReviewRow label="Payment" value={sentence(masked.paymentStatus)} />
            <ReviewRow label="Balance" value={formatMoney(masked.amountDue)} strong />
          </dl>
          {payable ? (
            <form className="tj-manage__form" onSubmit={unlock}>
              <p className="tj-manage__help">To pay, confirm the email address on the booking.</p>
              <label className="tj-field">
                <span>Booking email</span>
                <input type="email" value={unlockEmail} onChange={(event) => setUnlockEmail(event.target.value)} autoComplete="email" required />
              </label>
              {error ? (
                <p className="tj-form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <PillButton type="submit" variant="lake" dot className="tj-pill--block" disabled={unlocking}>
                {unlocking ? "Verifying…" : "Continue to payment"}
              </PillButton>
            </form>
          ) : null}
          <div className="tj-actions-row">
            <PillLink href="/book">Check fresh availability</PillLink>
            <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false}>
              <Icon name="phone" size={18} /> Call hotel
            </PillAnchor>
          </div>
          <p className="tj-center">
            <button className="tj-text-link" type="button" onClick={() => { setMasked(null); setError(""); setUnlockEmail(""); }}>
              Find another booking
            </button>
          </p>
        </div>
      </section>
    );
  }
  if (!reservation) return null;

  const status = statusCopy(reservation);
  const holdActive = reservation.expiresAt ? Date.parse(reservation.expiresAt) > now : false;
  const canPay = reservation.paymentAvailable && reservation.paymentStatus !== "paid" && holdActive && !["cancelled", "completed"].includes(reservation.status);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`)}`;
  const assistanceText = encodeURIComponent(`Hello Tejjora Lake View, I need help with booking ${reservation.reference}.`);

  return (
    <section className="tj-manage" aria-labelledby="manage-booking-result-title">
      <div className="tj-manage__card tj-manage__card--result">
        <p className="tj-eyebrow">{status.label}</p>
        <h1 id="manage-booking-result-title" className="tj-heading">
          {status.title}
        </h1>
        <p className="tj-manage__lead">{status.copy}</p>
        <div className="tj-reference">
          <span className="tj-reference__label">Booking reference</span>
          <strong className="tj-reference__value">{reservation.reference}</strong>
        </div>

        {canPay ? (
          <PillButton variant="lake" dot className="tj-pill--block" disabled={paymentBusy} onClick={startPayment}>
            {paymentBusy ? "Starting payment…" : reservation.paymentMode === "test" ? "Complete test payment" : `Pay ${formatMoney(reservation.pricing.amountDue)} securely`}
          </PillButton>
        ) : null}
        {!holdActive && reservation.paymentStatus !== "paid" ? <p className="tj-book__notice">The temporary room hold has expired. Start a fresh availability search before making payment.</p> : null}
        {error ? (
          <p className="tj-form-error" role="alert">
            {error}
          </p>
        ) : null}

        <dl className="tj-specs tj-manage__specs">
          <ReviewRow label="Guest" value={`${reservation.guest.firstName} ${reservation.guest.lastName}`.trim()} />
          <ReviewRow label="Room" value={room?.name ?? reservation.roomId} />
          <ReviewRow label="Stay" value={`${formatStayDates(reservation.stay.checkIn, reservation.stay.checkOut)} · ${reservation.pricing.nights} night${reservation.pricing.nights === 1 ? "" : "s"}`} />
          <ReviewRow label="Rate" value={rate?.label ?? reservation.ratePlanId} />
          <ReviewRow label="Room subtotal" value={formatMoney(reservation.pricing.roomSubtotal)} />
          {reservation.pricing.extraGuestCharge ? <ReviewRow label="Additional adult charge" value={formatMoney(reservation.pricing.extraGuestCharge)} /> : null}
          {reservation.pricing.childrenCharge ? <ReviewRow label="Children charge" value={formatMoney(reservation.pricing.childrenCharge)} /> : null}
          {reservation.pricing.extrasTotal ? <ReviewRow label="Priced extras" value={formatMoney(reservation.pricing.extrasTotal)} /> : null}
          {reservation.pricing.discount ? <ReviewRow label="Discount" value={`−${formatMoney(reservation.pricing.discount)}`} /> : null}
          {reservation.pricing.tax ? <ReviewRow label="Tax" value={formatMoney(reservation.pricing.tax)} /> : null}
          {reservation.pricing.serviceCharge ? <ReviewRow label="Service charge" value={formatMoney(reservation.pricing.serviceCharge)} /> : null}
          <ReviewRow label="Total" value={formatMoney(reservation.pricing.grandTotal)} strong />
          <ReviewRow label="Paid" value={formatMoney(reservation.pricing.amountPaid)} />
          <ReviewRow label="Balance" value={formatMoney(reservation.pricing.amountDue)} />
          <ReviewRow label="Payment" value={sentence(reservation.paymentStatus)} />
          {reservation.confirmationEmailStatus ? <ReviewRow label="Confirmation email" value={reservation.confirmationEmailStatus === "sent" ? "Sent" : reservation.confirmationEmailStatus === "unavailable" ? "Not configured" : reservation.confirmationEmailStatus === "failed" ? "Delivery issue" : "Not sent yet"} /> : null}
        </dl>

        <div className="tj-actions-row">
          <PillLink href="/book">Check fresh availability</PillLink>
          <PillAnchor href={directions} target="_blank" rel="noreferrer">
            Directions
          </PillAnchor>
          <PillAnchor href={`https://wa.me/${hotel.whatsappE164}?text=${assistanceText}`} target="_blank" rel="noreferrer" arrow={false}>
            <Icon name="whatsapp" size={18} /> Booking help
          </PillAnchor>
          <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false}>
            <Icon name="phone" size={18} /> Call hotel
          </PillAnchor>
        </div>
        <p className="tj-manage__help">Cancellation and refund rules are not self-served until the hotel&rsquo;s official policy is configured. Contact the hotel for a cancellation or amendment request.</p>
        <p className="tj-center">
          <button
            className="tj-text-link"
            type="button"
            onClick={() => {
              setReservation(null);
              setError("");
            }}
          >
            Find another booking
          </button>
        </p>
      </div>
    </section>
  );
}

function sentence(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ReviewRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div data-strong={strong || undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
