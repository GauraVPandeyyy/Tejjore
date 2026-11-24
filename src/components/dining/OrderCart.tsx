"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/data/commerce";
import { apiErrorMessage } from "@/lib/http/clientError";
import { ORDER_LIMITS } from "@/lib/restaurant/rules";
import type { RestaurantSettings } from "@/lib/content/types";
import { CircleButton, PillButton } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import type { Cart } from "./useCart";

export const ORDER_PHONE_KEY = (reference: string) => `tejjora-order-phone:${reference}`;

type Placed = { reference: string; totalExclTax: number; prepMinutesMin: number | null; prepMinutesMax: number | null };
const rupees = (paise: number) => formatMoney(paise / 100);

/**
 * The cart: a bottom sheet on phones and a side panel from 1024 px. The order is a request to the
 * restaurant (no online payment); the guest confirms the no-cancellation rule and leaves a name and
 * mobile. Totals shown here are estimates: the server re-prices every line from the database.
 */
export function OrderCart({ cart, settings, orderingMessage, open, onOpenChange }: { cart: Cart; settings: RestaurantSettings; orderingMessage: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.documentElement.setAttribute("data-sheet-open", "");
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.removeAttribute("data-sheet-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const servicePaise = cart.serviceFor(settings.serviceChargePct);
  const totalPaise = cart.subtotalPaise + servicePaise;
  const prep = settings.prepMinutesMin !== null && settings.prepMinutesMax !== null ? `${settings.prepMinutesMin}–${settings.prepMinutesMax} minutes` : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (orderingMessage) return setError(orderingMessage);
    if (!name.trim()) return setError("Enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Enter the 10-digit mobile number you will use to check this order.");
    if (!acknowledged) return setError("Please confirm that an order cannot be cancelled once it is placed.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: name,
          phone,
          roomNumber: room,
          notes,
          acknowledged: true,
          expectedTotal: totalPaise / 100,
          lines: cart.lines.map((line) => ({ itemId: line.itemId, qty: line.qty, variant: line.variant, size: line.size })),
        }),
      });
      const data = await response.json().catch(() => ({ error: `The order service is unavailable (${response.status}). Please try again or call the hotel.` }));
      if (!response.ok) throw new Error(apiErrorMessage(data, "Your order could not be placed."));
      try {
        sessionStorage.setItem(ORDER_PHONE_KEY(data.reference), phone);
      } catch {
        /* the status page will simply ask for the mobile number */
      }
      setPlaced(data as Placed);
      cart.clear();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your order could not be placed.");
    } finally {
      setBusy(false);
    }
  }

  const bar =
    cart.count > 0 && !open ? (
      <div className="tj-cart-bar">
        <button type="button" className="tj-pill tj-pill--lake tj-cart-bar__button" onClick={() => onOpenChange(true)} aria-haspopup="dialog">
          <span className="tj-cart-bar__count" aria-hidden="true">
            {cart.count}
          </span>
          <span className="tj-cart-bar__copy">
            <span className="sr-only">Your order · {cart.count} item{cart.count === 1 ? "" : "s"} · </span>
            <span aria-hidden="true">Your order</span>
            <strong>{rupees(cart.subtotalPaise)}</strong>
          </span>
          <span className="tj-cart-bar__view" aria-hidden="true">
            View <Icon name="arrow-right" size={16} />
          </span>
        </button>
      </div>
    ) : null;

  if (!open) return bar;

  return (
    <div className="tj-sheet tj-cart" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" className="tj-sheet__backdrop" aria-label="Close your order" onClick={() => onOpenChange(false)} />
      <div className="tj-sheet__panel tj-cart__panel">
        <div className="tj-sheet__head">
          <div>
            <p className="tj-eyebrow">Request to order</p>
            <h2 id="cart-title" className="tj-sheet__title">
              {placed ? "Request sent" : "Your order"}
            </h2>
          </div>
          <button ref={closeRef} type="button" className="tj-circle tj-circle--outline" aria-label="Close your order" onClick={() => onOpenChange(false)}>
            <Icon name="close" />
          </button>
        </div>

        {placed ? (
          <div className="tj-cart__done">
            <p>The restaurant has your request. It is not confirmed until the team accepts it.</p>
            <div className="tj-reference">
              <span className="tj-reference__label">Order reference</span>
              <strong className="tj-reference__value">{placed.reference}</strong>
            </div>
            <p className="tj-book__small">Keep this reference. You will need it and your mobile number to check the status.</p>
            <Link className="tj-pill tj-pill--lake tj-pill--block" href={`/dining/order/${placed.reference}`}>
              <span>Check order status</span>
            </Link>
            <PillButton className="tj-pill--block" onClick={() => { setPlaced(null); onOpenChange(false); }}>
              Back to the menu
            </PillButton>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            {cart.lines.length === 0 ? <p className="tj-cart__empty">Your order is empty. Add dishes from the menu.</p> : null}
            <ul className="tj-cart__lines">
              {cart.lines.map((line) => (
                <li key={line.key} className="tj-cart__line">
                  <div>
                    <strong>{line.item.name}</strong>
                    {line.label ? <small>{line.label}</small> : null}
                    <small>{rupees(line.unitPaise)} each</small>
                  </div>
                  <div className="tj-stepper__controls">
                    <CircleButton icon="minus" label={`Fewer ${line.item.name}`} onClick={() => cart.setQty(line.key, line.qty - 1)} />
                    <output aria-label={`${line.item.name} quantity`}>{line.qty}</output>
                    <CircleButton icon="plus" label={`More ${line.item.name}`} disabled={line.qty >= ORDER_LIMITS.maxQty} onClick={() => cart.setQty(line.key, line.qty + 1)} />
                  </div>
                  <span className="tj-cart__line-total">{rupees(line.totalPaise)}</span>
                </li>
              ))}
            </ul>

            <dl className="tj-specs tj-cart__totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{rupees(cart.subtotalPaise)}</dd>
              </div>
              {settings.serviceChargePct !== null ? (
                <div>
                  <dt>Service charge ({settings.serviceChargePct}%)</dt>
                  <dd>{rupees(servicePaise)}</dd>
                </div>
              ) : null}
              <div data-strong="true">
                <dt>Total</dt>
                <dd>{rupees(totalPaise)}</dd>
              </div>
            </dl>
            <ul className="tj-notes tj-notes--compact">
              {settings.taxesNote ? <li>{settings.taxesNote}. Not included in the total above.</li> : null}
              {prep ? <li>Preparation takes about {prep}.</li> : null}
              <li>Payment is not taken online. The hotel will tell you how to settle the bill.</li>
            </ul>

            <div className="tj-cart__fields">
              <label className="tj-field">
                <span>Your name *</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} required />
              </label>
              <label className="tj-field">
                <span>Mobile number *</span>
                <input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="98765 43210" required />
              </label>
              {settings.roomDeliveryEnabled !== false ? (
                <label className="tj-field">
                  <span>Room number · optional</span>
                  <input value={room} onChange={(event) => setRoom(event.target.value)} maxLength={10} autoComplete="off" />
                </label>
              ) : null}
              <label className="tj-field">
                <span>Note for the kitchen · optional</span>
                <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={ORDER_LIMITS.notes} />
              </label>
            </div>
            <label className="tj-check">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
              <span>{settings.noCancelNote ?? "Once the order is placed it cannot be cancelled."} I understand.</span>
            </label>

            {orderingMessage ? <p className="tj-book__notice" role="status">{orderingMessage}</p> : null}
            {error ? (
              <p className="tj-form-error" role="alert">
                {error}
              </p>
            ) : null}
            <PillButton type="submit" variant="lake" dot className="tj-pill--block" disabled={busy || cart.lines.length === 0 || Boolean(orderingMessage)}>
              {busy ? "Sending request…" : "Send order request"}
            </PillButton>
          </form>
        )}
      </div>
    </div>
  );
}
