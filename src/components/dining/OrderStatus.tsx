"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { apiErrorMessage } from "@/lib/http/clientError";
import type { GuestOrderView } from "@/lib/restaurant/orders";
import { ORDER_STATUS_LABEL } from "@/lib/restaurant/rules";
import { PillAnchor, PillButton } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { ORDER_PHONE_KEY } from "./OrderCart";

const POLL_MS = 20_000;
const FINAL = new Set(["delivered", "declined", "cancelled_by_staff"]);
const STEPS = ["requested", "accepted", "preparing", "ready", "delivered"] as const;

const COPY: Record<string, string> = {
  requested: "The restaurant has your request and will accept or decline it shortly.",
  accepted: "The restaurant has accepted your order.",
  preparing: "Your order is being prepared.",
  out_for_delivery: "Your order is on its way.",
  ready: "Your order is ready.",
  delivered: "Your order has been delivered. Enjoy your meal.",
  declined: "The restaurant could not accept this order.",
  cancelled_by_staff: "The restaurant cancelled this order.",
};

/** Status for one order. Asks for the mobile number (kept only for this tab) and refreshes every 20 s. */
export function OrderStatus({ reference }: { reference: string }) {
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<GuestOrderView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const phoneRef = useRef("");

  const load = useCallback(
    async (mobile: string, quiet = false) => {
      if (!quiet) setBusy(true);
      try {
        const response = await fetch("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, phone: mobile }) });
        const data = await response.json().catch(() => ({ error: `The order service is unavailable (${response.status}). Please try again.` }));
        if (!response.ok) {
          if (!quiet) throw new Error(apiErrorMessage(data, "We couldn't find an order with those details."));
          return;
        }
        phoneRef.current = mobile;
        setOrder(data as GuestOrderView);
        setUpdatedAt(new Date());
        setError("");
        try {
          sessionStorage.setItem(ORDER_PHONE_KEY(reference), mobile);
        } catch {
          /* kept in memory for this visit only */
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "We couldn't find an order with those details.");
      } finally {
        if (!quiet) setBusy(false);
      }
    },
    [reference],
  );

  useEffect(() => {
    let saved = "";
    try {
      saved = sessionStorage.getItem(ORDER_PHONE_KEY(reference)) ?? "";
    } catch {
      /* ask for the number */
    }
    if (saved) {
      // Same-tab hand-off from the cart: look up once on arrival, then poll below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhone(saved);
      void load(saved);
    }
  }, [reference, load]);

  const status = order?.status;
  useEffect(() => {
    if (!status || FINAL.has(status)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(phoneRef.current, true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, load]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void load(phone);
  }

  if (!order) {
    return (
      <section className="tj-manage" aria-labelledby="order-status-title" aria-busy={busy}>
        <div className="tj-manage__card">
          <p className="tj-eyebrow">Order status</p>
          <h1 id="order-status-title" className="tj-heading">
            Check your order
          </h1>
          <div className="tj-reference">
            <span className="tj-reference__label">Order reference</span>
            <strong className="tj-reference__value">{reference}</strong>
          </div>
          <p className="tj-manage__lead">Enter the mobile number you used when ordering.</p>
          <form className="tj-manage__form" onSubmit={submit}>
            <label className="tj-field">
              <span>Mobile number</span>
              <input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="98765 43210" required />
            </label>
            {error ? (
              <p className="tj-form-error" role="alert">
                {error}
              </p>
            ) : null}
            <PillButton type="submit" variant="lake" arrow className="tj-pill--block" disabled={busy}>
              {busy ? "Checking…" : "Check status"}
            </PillButton>
          </form>
          <p className="tj-manage__help">
            Need help? <a href={`tel:${hotel.phoneE164}`}>Call the hotel</a>.
          </p>
        </div>
      </section>
    );
  }

  const stepIndex = STEPS.indexOf((order.status === "out_for_delivery" ? "ready" : order.status) as (typeof STEPS)[number]);
  const ended = order.status === "declined" || order.status === "cancelled_by_staff";

  return (
    <section className="tj-manage" aria-labelledby="order-status-title">
      <div className="tj-manage__card tj-manage__card--result">
        <p className="tj-eyebrow">{ORDER_STATUS_LABEL[order.status] ?? order.status}</p>
        <h1 id="order-status-title" className="tj-heading">
          {COPY[order.status] ?? "Order status"}
        </h1>
        <p className="tj-sr-live sr-only" role="status" aria-live="polite">
          {ORDER_STATUS_LABEL[order.status]}
        </p>
        {ended && order.declineReason ? <p className="tj-manage__lead">Reason: {order.declineReason}</p> : null}
        <div className="tj-reference">
          <span className="tj-reference__label">Order reference</span>
          <strong className="tj-reference__value">{order.reference}</strong>
        </div>

        {!ended ? (
          <ol className="tj-order-steps" aria-label="Order progress">
            {STEPS.map((step, index) => (
              <li key={step} data-state={index < stepIndex ? "done" : index === stepIndex ? "current" : "todo"} aria-current={index === stepIndex ? "step" : undefined}>
                {ORDER_STATUS_LABEL[step]}
              </li>
            ))}
          </ol>
        ) : null}

        <ul className="tj-cart__lines">
          {order.lines.map((line, index) => (
            <li key={index} className="tj-cart__line">
              <div>
                <strong>
                  {line.qty} × {line.name}
                </strong>
                {line.variant ? <small>{line.variant}</small> : null}
              </div>
              <span className="tj-cart__line-total">{formatMoney(line.qty * line.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <dl className="tj-specs tj-cart__totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotal)}</dd>
          </div>
          {order.serviceCharge ? (
            <div>
              <dt>Service charge</dt>
              <dd>{formatMoney(order.serviceCharge)}</dd>
            </div>
          ) : null}
          <div data-strong="true">
            <dt>Total (taxes as applicable)</dt>
            <dd>{formatMoney(order.totalExclTax)}</dd>
          </div>
          <div>
            <dt>Ordered by</dt>
            <dd>
              {order.guestNameMasked} · •••• {order.phoneLast4}
            </dd>
          </div>
          {order.roomNumber ? (
            <div>
              <dt>Room</dt>
              <dd>{order.roomNumber}</dd>
            </div>
          ) : null}
        </dl>
        <p className="tj-book__small">
          {FINAL.has(order.status) ? "This order is complete." : `Updates automatically${updatedAt ? ` · checked ${updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}.`} Orders cannot be cancelled once placed.
        </p>
        <div className="tj-actions-row">
          <Link className="tj-pill tj-pill--outline" href="/dining/menu">
            <span>Back to the menu</span>
          </Link>
          <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false}>
            <Icon name="phone" size={18} /> Call hotel
          </PillAnchor>
        </div>
      </div>
    </section>
  );
}
