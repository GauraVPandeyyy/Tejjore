# Stage 12 — Final End-to-End Audit & Fix Pass

## Status

**Source/regression audit: PASS.**  
**Production quality gate: BLOCKED by this execution environment because project dependencies cannot be installed (`registry.npmjs.org` DNS/EAI_AGAIN), so `eslint` and `next build` cannot run here.**

Stage 13 must **not** start until dependency installation succeeds and the final runtime gate (lint + production build + rendered viewport/browser checks) passes.

---

## Architecture decisions

The public information architecture remains intentionally compact:

- `/` — high-impact discovery + conversion summary
- `/rooms` — the three room categories and comparison
- `/experience` — dining, day-at-Tejjora, hotel story, gallery and deeper experience content
- `/location` — location, directions, nearby places and Google integration
- `/plan-your-stay` — guided stay planner
- `/virtual-tour` — immersive/still tour experience
- `/book` — availability, checkout, reservation hold and payment
- `/manage-booking` — secure post-booking retrieval and payment continuation
- `/arrival` — noindex guest utility
- `/admin` + `/admin/login` — protected hotel operations

The public UI remains separated from reservation/inventory persistence and payment providers so the current internal store can later be replaced by a PMS/channel manager without rebuilding the guest journey.

---

## Final-audit issues found and fixed

### Booking, inventory and persistence

- Added a secure per-reservation access token. Only its SHA-256 hash is persisted.
- Added secure post-booking retrieval using **reference + booking email + booking phone**; reference alone never reveals guest PII.
- Added rate limiting to public availability, reservation lookup and payment endpoints.
- Hardened booking payload validation: real ISO dates, no past check-in, max 30-night online stay, max 12-month advance window, bounded guest/room counts, approved rooms/rate plans/add-ons and normalized guest input.
- Store corruption/read errors are no longer silently replaced with an empty booking store. Only a genuinely absent file creates a fresh store.
- Added atomic private-file writes, restrictive file/directory modes and a booking-store lock.
- Added a limit on duplicate active holds from the same email/phone.
- Centralized capacity accounting so confirmed reservations, active holds, maintenance blocks and `payment_review` reservations are consistently considered.
- Added a `payment_review` state for the important case where valid payment arrives but inventory/state changed before settlement. Paid money is never silently treated as an ordinary failed booking.
- Public availability now exposes only guest-relevant sellable data; internal booked/held/blocked accounting remains staff-only.
- Admin inventory reductions, overrides and room blocks now refuse changes that would invalidate already committed inventory.
- Date-specific admin overrides now validate real calendar dates.

### Payment integrity

- Payment order creation is now inside the booking-store transaction, preventing rapid duplicate clicks from creating multiple active gateway orders for one reservation on the current shared store.
- Order creation and verification require the reservation access token.
- Invalid client-side signature verification no longer mutates a reservation to failed; the signed gateway webhook can still reconcile it.
- Webhook processing is HMAC-verified and idempotent.
- A valid paid webhook tied to the booking reference but to a stale/mismatched order is recorded as **paid + payment review**, never discarded or auto-confirmed.
- A signed Tejjora-booking webhook that arrives before the reservation/order is locally reconcilable returns a retriable response rather than being permanently marked processed.
- A payment received after staff cancellation/completion goes to `payment_review` instead of silently resurrecting the stay as confirmed.
- Production Razorpay remains unavailable unless production booking mode, production-ready flag, credentials and an explicit persistent booking-store path are all configured.

### Pricing completeness

- Extra-adult and child charges now participate in price calculation **only when explicitly configured**.
- Public configuration supports enabling fixed rate-plan adjustments without source edits.
- Public configuration supports pricing/enabling add-ons without source edits.
- Promotional-code calculation is implemented with fixed/percentage discounts, optional stay-date window and minimum-night rule.
- Booking Review now provides an optional promo-code input and blocks reservation creation when a supplied code is invalid/inactive.
- Taxes/service charge remain disabled until explicitly configured with approved values.
- Unknown/unpriced extras remain request-only and are excluded from the online payable total rather than silently inventing a charge.

### Post-booking UX

- Added `/manage-booking` (`noindex`) for verified booking retrieval.
- Guests can review reservation/payment status, pricing, paid/due balance, resume payment while a hold is valid, get directions and contact the hotel.
- Expired temporary holds are now described as expired instead of incorrectly saying the room is still held.
- Cancellation/refund is deliberately not self-served until Tejjora supplies the official policy.
- Smart Arrival now directs guests without loaded stay data to secure booking retrieval.

### Concierge

- Concierge stay-date queries now use the same booking validation limits as checkout (including 30 nights / 12 months).
- Existing-booking questions now link to secure **Manage Booking** rather than relying on a booking reference in chat.
- Current room-rate lookup uses the India-local business date rather than UTC date boundaries.

### UI / asset / integration audit

- Raw `<img>` use is eliminated from source; responsive images use the existing image component path.
- Public navigation targets were statically checked against the current route surface.
- All literal referenced public assets were checked. The only intentionally absent files are the nine future real Tejjora 360 panoramas.
- Every real-property virtual-tour scene remains `panoramaReady: false` until genuine property panoramas are supplied.
- Development 2:1 panorama media remains production-gated and explicitly labelled as non-Tejjora QA media.
- Global CSS brace integrity and reduced-motion treatment are validated.

---

## Booking system — guest journey

1. Guest chooses check-in/check-out, adults, children and room count.
2. Website checks date-based sellable inventory.
3. Guest selects a room category and an enabled rate plan.
4. Guest may request add-ons; only configured online-bookable add-ons affect payable total.
5. Guest supplies minimum reservation contact details plus optional company/GST, arrival note and special request.
6. Optional configured promo code is validated and applied.
7. Server re-validates the payload, re-checks inventory under the booking-store lock and creates a temporary room hold + booking reference.
8. Guest pays through configured Razorpay checkout (or explicit non-production test mode).
9. Signed payment verification/webhook settles the reservation to `confirmed`, or to `payment_review` when money was received but automatic confirmation is unsafe.
10. Guest can later retrieve the reservation through `/manage-booking` using reference + original booking email + phone.

---

## Payment production requirements

Razorpay secrets stay server-side. Production payment requires:

- `BOOKING_MODE=production`
- `BOOKING_PRODUCTION_READY=true`
- private persistent `BOOKING_STORE_PATH`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- correct Razorpay webhook endpoint configuration
- approved production inventory/business/pricing configuration

`PAYMENT_TEST_MODE` never enables successful test payment in production.

---

## Admin operations

The protected staff interface remains intentionally small for 1–2 staff members:

- Today: arrivals, departures, in-house, pending payments, payment review, occupancy
- Reservations: full guest/stay/payment/pricing detail + legitimate status changes + internal notes
- Availability & Rates: base room rates, category inventory, date inventory/rate overrides, maintenance/out-of-order blocks
- Payments: paid/pending/failed/review visibility and outstanding amounts

All admin data APIs require the signed HttpOnly staff session. Routine room rates and sellable inventory can be changed without editing source code.

---

## Mobile / responsive status

The source still contains the Stage 12.3 mobile-specific hero and single-stage terrace time progression, mobile booking treatment, touch virtual-tour controls, compact navigation and reduced-motion fallbacks. No new final-audit change intentionally reintroduced desktop-only hover dependencies.

**Fresh rendered final-build viewport validation is still required at 1366×768, 1280×800, 390×844 and 360×800 once dependencies are available.** Earlier screenshots cannot substitute for the final build after booking/admin fixes.

---

## External integrations + fallback

- Google Maps Embed API → premium real map when browser key/Place ID exists; directions fallback remains usable without credentials.
- Google Places API (New) → live review provider when server key/Place ID exists; dated verified snapshot remains fallback.
- Razorpay → live provider only when full production gate is configured; explicit development test mode otherwise.
- Marzipano → dynamically loaded only for approved panorama media; still-image property fallbacks remain truthful until real 360 photography exists.
- PMS/channel manager → provider boundary is preserved; current internal repository can be replaced later.
- Optional AI language layer → structured concierge remains useful without an external LLM.

---

## Environment variables

See `.env.example`. The final audit adds/uses these commercial configuration paths in addition to previously documented Maps/Places/Razorpay/admin variables:

- `NEXT_PUBLIC_INCLUDED_ADULTS_PER_ROOM`
- `NEXT_PUBLIC_EXTRA_ADULT_CHARGE`
- `NEXT_PUBLIC_CHILD_CHARGE`
- `NEXT_PUBLIC_RATE_PLAN_CONFIG_JSON`
- `NEXT_PUBLIC_ADDON_CONFIG_JSON`
- `NEXT_PUBLIC_PROMO_CODES_JSON`
- `NEXT_PUBLIC_TAX_CONFIGURED`
- `NEXT_PUBLIC_TAX_RATE_BPS`
- `NEXT_PUBLIC_SERVICE_CHARGE_CONFIGURED`
- `NEXT_PUBLIC_SERVICE_CHARGE_BPS`

These are public commercial values, not credentials. Secrets remain server-only.

---

## Testing completed in this environment

PASS:

- all Stage 1 / 9 / 10 / 11 / 12 / 12.1–12.10 regression validators
- final Stage 12 static/integration validator
- focused foundation, concierge, booking, admin, final core, final booking UI and final public-API TypeScript checks
- 127 TS/TSX source-file final static scan
- 11 page-route audit
- 50 literal public-asset reference audit
- CSS structural integrity
- no raw `<img>` scan
- secure retrieval/payment/access-token marker audit
- production panorama truth-state audit

Blocked by environment:

- `npm install` — npm registry DNS/network timeout (`registry.npmjs.org`, EAI_AGAIN)
- `npm run lint` — `eslint` binary unavailable because dependencies are not installed
- `npm run build` — `next` binary unavailable because dependencies are not installed
- final runtime console inspection
- fresh browser-rendered desktop/mobile viewport validation
- live Razorpay sandbox test (also requires provider credentials/connectivity)
- live Google Maps/Places test (requires credentials/connectivity)

Therefore **Stage 12 is source-complete at this checkpoint but is not yet declared production-gate PASS. Stage 13 is intentionally not started.**

---

## Remaining real-world inputs only

These are genuine hotel/provider inputs rather than unfinished development work:

1. Actual Deluxe / Super Deluxe / Premium category inventory counts.
2. Official tax/service-charge policy and values, if applicable.
3. Official included-adult / extra-adult / child pricing rules, if applicable.
4. Official prices/availability conditions for optional add-ons.
5. Official Breakfast/Flexible/Non-refundable rate-plan adjustments and terms if those plans will be sold online.
6. Any live promotional codes the hotel chooses to run.
7. Official cancellation/amendment/refund policy.
8. Razorpay production credentials and webhook secret.
9. Google Maps Embed / Places API credentials and exact Tejjora Place ID.
10. One or two real staff identities/password hashes + strong admin session secret.
11. Genuine Tejjora spherical 360 property photography.
12. Final real terrace Morning / Day / Evening / Night photography from one consistent viewpoint.
13. A production persistent storage/PMS/channel-manager target if deployment is not a single persistent Node host/volume.
