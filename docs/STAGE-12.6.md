# Stage 12.6 — Complete Booking System

## Objective
Replace the request-only flow with a real reservation foundation while keeping future PMS/channel-manager replacement possible.

## Implemented
- Central room base rates: Deluxe ₹2,000, Super Deluxe ₹2,500, Premium ₹3,500.
- Date-based category availability API.
- Temporary inventory holds and per-date oversell re-check inside serialized persistence writes.
- Development category inventory split (10/10/9) isolated from production; production returns zero inventory until actual category counts are configured.
- Persistent reservation store at `.data/tejjora-booking-store.json` (override with `BOOKING_STORE_PATH`).
- Reservation states: initiated / payment_pending / confirmed / payment_failed / cancelled / completed.
- Payment states: not_started / pending / paid / failed / refunded.
- Pricing engine: nights, room subtotal, rate-plan adjustment, extra-guest/child hooks, extras hooks, discounts hook, taxes, service charge, grand total, paid, due.
- Online-bookable rate plan gating; unconfigured plans cannot silently enter checkout.
- Request-only extras remain visibly excluded from the payable amount until official pricing is configured.
- Guest details expanded with optional company/GST and arrival notes.
- Backward-compatible `/api/booking-request` alias retained while new code uses `/api/reservations`.

## Production safeguards
- `BOOKING_MODE=production` does not fall back to development inventory counts.
- Production online payment is gated separately by `BOOKING_PRODUCTION_READY=true`.
- Tax/service charge defaults are not presented as hotel policy; values are environment-configurable and disabled by default.
- Unknown occupancy limits, child policy and extra-person charges are not fabricated.

## Provider boundary
Public booking UI talks to inventory/reservation APIs. Inventory and persistence can later be replaced by a PMS/channel manager without rebuilding the guest-facing flow.
