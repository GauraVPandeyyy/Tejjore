"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { bookingConfig } from "@/data/booking";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { rooms } from "@/data/rooms";
import type { PublicReservationView } from "@/types/booking";

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

export function ManageBooking({ initialReference = "" }: { initialReference?: string }) {
  const [reference, setReference] = useState(initialReference.toUpperCase());
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reservation, setReservation] = useState<PublicReservationView | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [error, setError] = useState("");

  const room = useMemo(() => rooms.find((item) => item.id === reservation?.roomId), [reservation?.roomId]);
  const rate = useMemo(() => bookingConfig.ratePlans.find((item) => item.id === reservation?.ratePlanId), [reservation?.ratePlanId]);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setReservation(null);
    try {
      const response = await fetch("/api/reservations/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email, phone }),
      });
      const data = await response.json().catch(() => ({ error: `The booking service is unavailable (${response.status}). Please try again.` }));
      if (!response.ok) throw new Error(data?.error || "Reservation could not be retrieved.");
      setReservation(data as PublicReservationView);
      setReference(data.reference);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reservation could not be retrieved.");
    } finally { setBusy(false); }
  }

  async function verifyPayment(data: RazorpayResult | { testSuccess: true }) {
    if (!reservation) return;
    const response = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: reservation.reference, accessToken: reservation.accessToken, ...data }),
    });
    const verified = await response.json().catch(() => ({ error: `Payment verification is unavailable (${response.status}). Please try again.` }));
    if (!response.ok) throw new Error(verified?.error || "Payment verification failed.");
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
      if (!response.ok) throw new Error(order?.error || "Payment could not be started.");
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

  if (!reservation) {
    return (
      <section className="manage-booking" aria-labelledby="manage-booking-title">
        <div className="manage-booking__intro">
          <span className="micro">MY STAY</span>
          <h1 id="manage-booking-title">Find your reservation.</h1>
          <p>Use the booking reference together with the same email and phone used when the reservation was created. A booking reference by itself is never enough to reveal guest details.</p>
        </div>
        <form className="manage-booking__form" onSubmit={lookup}>
          <label><span>Booking reference</span><input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" placeholder="TLV-YYMMDD-XXXXXX" required /></label>
          <label><span>Booking email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label><span>Booking phone</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></label>
          {error ? <p className="booking-experience__error" role="alert">{error}</p> : null}
          <button className="booking-request-submit" type="submit" disabled={busy}><span>{busy ? "Verifying…" : "Find booking"}</span><span aria-hidden="true">↗</span></button>
        </form>
        <p className="manage-booking__help">Can’t verify the details? <a href={`tel:${hotel.phoneE164}`}>Call Tejjora</a> or <a href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer">WhatsApp the hotel</a>.</p>
      </section>
    );
  }

  const status = statusCopy(reservation);
  const holdActive = reservation.expiresAt ? Date.parse(reservation.expiresAt) > Date.now() : false;
  const canPay = reservation.paymentAvailable && reservation.paymentStatus !== "paid" && holdActive && !["cancelled", "completed"].includes(reservation.status);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`)}`;
  const assistanceText = encodeURIComponent(`Hello Tejjora Lake View, I need help with booking ${reservation.reference}.`);

  return (
    <section className="manage-booking manage-booking--result" aria-labelledby="manage-booking-result-title">
      <div className="manage-booking__status">
        <span className="micro">{status.label}</span>
        <h1 id="manage-booking-result-title">{status.title}</h1>
        <p>{status.copy}</p>
        <div className="booking-success__reference"><span>Booking reference</span><strong>{reservation.reference}</strong></div>
      </div>

      <div className="manage-booking__grid">
        <div className="booking-review">
          <ReviewRow label="Guest" value={`${reservation.guest.firstName} ${reservation.guest.lastName}`.trim()} />
          <ReviewRow label="Room" value={room?.name ?? reservation.roomId} />
          <ReviewRow label="Stay" value={`${reservation.stay.checkIn} → ${reservation.stay.checkOut} · ${reservation.pricing.nights} night${reservation.pricing.nights === 1 ? "" : "s"}`} />
          <ReviewRow label="Rate" value={rate?.label ?? reservation.ratePlanId} />
          <ReviewRow label="Room subtotal" value={formatMoney(reservation.pricing.roomSubtotal)} />
          {reservation.pricing.extraGuestCharge ? <ReviewRow label="Additional adult charge" value={formatMoney(reservation.pricing.extraGuestCharge)} /> : null}
          {reservation.pricing.childrenCharge ? <ReviewRow label="Children charge" value={formatMoney(reservation.pricing.childrenCharge)} /> : null}
          {reservation.pricing.extrasTotal ? <ReviewRow label="Priced extras" value={formatMoney(reservation.pricing.extrasTotal)} /> : null}
          {reservation.pricing.discount ? <ReviewRow label="Discount" value={`−${formatMoney(reservation.pricing.discount)}`} /> : null}
          {reservation.pricing.tax ? <ReviewRow label="Tax" value={formatMoney(reservation.pricing.tax)} /> : null}
          {reservation.pricing.serviceCharge ? <ReviewRow label="Service charge" value={formatMoney(reservation.pricing.serviceCharge)} /> : null}
          <ReviewRow label="Total" value={formatMoney(reservation.pricing.grandTotal)} />
          <ReviewRow label="Paid" value={formatMoney(reservation.pricing.amountPaid)} />
          <ReviewRow label="Balance" value={formatMoney(reservation.pricing.amountDue)} />
          <ReviewRow label="Payment" value={reservation.paymentStatus.replaceAll("_", " ").toUpperCase()} />
          {reservation.confirmationEmailStatus ? <ReviewRow label="Confirmation email" value={reservation.confirmationEmailStatus === "sent" ? "Sent" : reservation.confirmationEmailStatus === "unavailable" ? "Not configured" : reservation.confirmationEmailStatus === "failed" ? "Delivery issue" : "Not sent yet"} /> : null}
        </div>
        <div className="manage-booking__actions-card">
          {canPay ? <button className="booking-request-submit" type="button" disabled={paymentBusy} onClick={startPayment}><span>{paymentBusy ? "Starting payment…" : reservation.paymentMode === "test" ? "Complete test payment" : `Pay ${formatMoney(reservation.pricing.amountDue)} securely`}</span><span aria-hidden="true">↗</span></button> : null}
          {!holdActive && reservation.paymentStatus !== "paid" ? <p className="manage-booking__notice">The temporary room hold has expired. Start a fresh availability search before making payment.</p> : null}
          {error ? <p className="booking-experience__error" role="alert">{error}</p> : null}
          <div className="booking-success__actions">
            <Link href="/book">Check fresh availability ↗</Link>
            <a href={directions} target="_blank" rel="noreferrer">Directions ↗</a>
            <a href={`https://wa.me/${hotel.whatsappE164}?text=${assistanceText}`} target="_blank" rel="noreferrer">Booking assistance ↗</a>
            <a href={`tel:${hotel.phoneE164}`}>Call hotel ↗</a>
          </div>
          <p className="manage-booking__policy">Cancellation and refund rules are not self-served until Tejjora’s official policy is configured. Contact the hotel for a cancellation or amendment request.</p>
        </div>
      </div>
      <button className="manage-booking__another" type="button" onClick={() => { setReservation(null); setError(""); }}>Find another booking</button>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
