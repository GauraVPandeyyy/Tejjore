# Tejjora Lake View

Premium public hotel website foundation for **TEJJORA LAKE VIEW**, Gomti Nagar, Lucknow.

## Current status

**Stage 12 Remediation — Sub-stages 12.6 + 12.7 implemented in source**

The existing application is being evolved in-place rather than rebuilt. Stage 12.1 tightened the global spacing/density system and integrated the official Tejjora identity. Stage 12.2 restructures the site into a concise homepage plus purpose-built routes. Stage 12.3 now gives mobile its own cinematic hero expansion and one-stage Morning → Day → Evening → Night terrace progression. Stage 12.4 replaces the artificial location graphic with an official Google Maps Embed integration path and adds a server-side Google Places review provider with a transparent snapshot fallback. Panorama productization, real booking/inventory and Razorpay payment architecture are now implemented in source. Remaining Stage 12 work focuses on hotel admin, concierge productization, premium visual audit and final end-to-end production validation.

## Stack

- Next.js 16.3.5
- React 19.3
- TypeScript
- Tailwind CSS 4.3
- Motion for React
- GSAP / ScrollTrigger for signature sequences only
- Marzipano 0.10.2, dynamically loaded only for verified 360 scenes

## Install

```bash
npm install
npm run dev
```

## Design concept

**THE WATERLINE** — city on one side, calm on the other.

Key motifs:

- Waterline: horizon, dividers, progress, booking flow
- Window: visual aperture / room-to-view transitions
- Warm → cool: indoor hospitality to lake calm

## Terrace / Lake View Signature Sequence

The homepage will contain a scroll-linked **terrace view progression**:

1. Morning
2. Day
3. Evening / golden hour
4. Night

On desktop this is implemented as a pinned scroll story. Stage 12.3 now gives mobile its own sticky single-viewpoint time progression so Morning → Day → Evening → Night unfolds cinematically without four long stacked panels or scroll-jacking. The current files are placeholders only. Real terrace/lake photography can replace the four asset paths in `src/data/assets.ts` without changing component logic.

## Important constraints

- Only three room categories: Deluxe, Super Deluxe, Premium.
- Current room-set mapping is provisional and centralized.
- Booking now uses date-based website inventory, configured room rates, persistent reservation state and a payment-provider flow. Production sales remain gated until real inventory/tax/policy data is approved.
- PMS / channel-manager compatibility must stay behind provider boundaries rather than becoming a public-UI dependency.
- No fake live availability or hotel-specific values that have not been confirmed.
- Missing media uses neutral placeholders rather than fake hotel photography.

See `docs/` for architecture and asset notes.


## Stage 2

See `docs/STAGE-2.md` for the global shell, navigation and mobile conversion framework.


## Stage 3

Cinematic homepage hero and the direct booking-search entry experience are now implemented. Desktop uses the Waterline `Window → Experience` aperture transition, while mobile uses a dedicated booking bottom sheet. The search forwards dates and guest counts to `/book`; live inventory remains intentionally deferred. See `docs/STAGE-3.md`.


## Stage 4

Editorial hotel story and the signature terrace/lake-view scroll sequence were introduced here. Stage 12.3 later upgrades the mobile version to a sticky single-stage progression. See `docs/STAGE-4.md` and `docs/STAGE-12.3.md`.


## Stage 5
Rooms + Room Comparison implemented. See `docs/STAGE-5.md`.


## Stage 6
Virtual Tour Preview + Restaurant Experience implemented. See `docs/STAGE-6.md`.


## Stage 7
Homepage narrative completion implemented: A Day at Tejjora, Why Tejjora, location/directions, review snapshot, curated gallery, direct-stay reassurance and final conversion scene. See `docs/STAGE-7.md`.


## Stage 8
Direct booking request flow implemented: dates → room → rate preference → extras → guest details → review → request reference → WhatsApp/phone hotel handoff. No live availability, payment or confirmed reservation is claimed. See `docs/STAGE-8.md`.


## Stage 9
Plan My Stay implemented as a rule-based conversational planner: trip purpose → arrival → dates/guests → preferences → suggested room/stay plan → prefilled booking handoff. It never claims live ETA, availability, room capacity or final pricing. See `docs/STAGE-9.md`.

## Stage 10 — Tejjora Concierge

A global hotel-specific concierge is now wired through a provider boundary. The current deterministic provider answers only from confirmed project knowledge, surfaces booking/planner/directions/contact actions, and refuses to invent live rates, availability, policies, ETA, or unconfirmed room details. See `docs/STAGE-10.md`.


## Stage 11 — Full Marzipano Virtual Tour

The full `/virtual-tour` experience is implemented with nine data-driven scenes, deep links, scene rail, custom navigation/zoom/reset/fullscreen controls, room booking handoffs and a dynamically imported Marzipano runtime. Because real equirectangular 360 captures have not yet been supplied, every scene remains in an explicit still-preview fallback state until its asset passes QA. See `docs/STAGE-11.md`.


## Stage 12 — Smart Arrival Experience

The `/arrival` placeholder has been replaced with a five-tab guest utility: Arrival, My Stay, Dining, Explore and Help. The default route is intentionally unlinked because no PMS/request persistence exists yet; `/arrival?demo=1` provides a visibly labelled sample-data preview for interface QA only. The route is noindex/nofollow, does not persist guest data in browser storage and exposes future booking/flight/transfer provider boundaries. See `docs/STAGE-12.md`.


## Stage 12.1 — Design Density + Official Brand Reset

The first remediation sub-stage preserves the current architecture while tightening oversized vertical spacing, adding 13–14 inch laptop-specific density tuning, improving mobile spacing, aligning the primary deep-lake color to the supplied official identity, and replacing text-only global branding with the supplied logo/mark where appropriate. See `docs/STAGE-12.1.md`.


## Stage 12.2 — Information Architecture + Multi-page Restructure

The homepage is now a shorter discovery/conversion journey. Deeper hospitality storytelling moved to `/experience`, the planner moved to `/plan-your-stay`, location moved to `/location`, while `/rooms`, `/book`, `/virtual-tour` and the noindex `/arrival` route retain their focused responsibilities. Navigation and concierge/arrival handoffs were updated to the new route model. See `docs/STAGE-12.2.md`.


## Stage 12.3 — Responsive Signature Motion

Mobile no longer receives static versions of the two signature interactions. The hero now uses a sticky window-to-full-view scroll transformation, while the terrace uses one sticky visual stage with scroll-controlled Morning → Day → Evening → Night media/copy progression. Reduced-motion users keep a static sequential fallback. See `docs/STAGE-12.3.md`.

## Stage 12.4 — Location + Google Reviews

The dedicated location experience now supports the official Google Maps Embed API with an honest no-key fallback. Google review data is available through a server-side Places API (New) provider; without production credentials the UI continues to show the dated verified snapshot and never fabricates review text. See `docs/STAGE-12.4.md`.

## Stage 12.5 — Panorama productization

Supplied panoramic assets are now format-audited. Exact-2:1 non-property sources are isolated as development-only Marzipano QA media; the non-2:1 wide source is flat-preview-only. Normal hotel tour scenes remain on truthful Tejjora still fallbacks until real spherical property captures are supplied. See `docs/STAGE-12.5.md`.


## Stage 12.6 — Complete Booking System

The request-only flow has been replaced with a date-based category inventory and reservation engine. Supplied base rates are centralized at ₹2,000 / ₹2,500 / ₹3,500; reservations persist in the current repository adapter, use temporary holds and prevent obvious overselling with a serialized per-date re-check. See `docs/STAGE-12.6.md`.

## Stage 12.7 — Razorpay Payment Architecture

Server-side Razorpay order creation, HMAC callback verification, signed/idempotent webhook reconciliation, persisted payment state and an explicit non-production test mode are implemented. Production checkout stays disabled until `BOOKING_PRODUCTION_READY=true` and real business configuration is supplied. See `docs/STAGE-12.7.md`.

## Stage 12.8 — Hotel Operations

The protected `/admin` interface is designed for a very small hotel team. It provides Today, Reservations, Availability & Rates and Payments views. All admin data endpoints require an HttpOnly signed staff session; guest PII is not exposed through public admin endpoints.

Configure staff access only on the server:

```bash
node scripts/generate-admin-hash.mjs 'a-strong-staff-password'
```

Then set `ADMIN_USERS_JSON` with one or two staff records and a random `ADMIN_SESSION_SECRET` of at least 32 characters. Do not commit real credentials. Base rates, category inventory, date-specific rate/inventory overrides and room blocks are persisted in the booking store and feed new public availability/pricing calculations. A future PMS can replace this internal repository without replacing the public booking UI.

## Stage 12.9 — Concierge Productization

The concierge now uses a hybrid structured engine: current website room rates and, when production inventory is configured, date-based availability come from the same operational booking data used by checkout/admin. Curated hotel knowledge remains the safe fallback. Development inventory is never represented as real availability, and booking/payment status is not disclosed from a booking reference alone. See `docs/STAGE-12.9.md`.

## Stage 12.10 — Premium Visual Upgrade

A site-wide visual productization pass now unifies the public hotel experience and booking journey around the official deep-lake/cream/orange identity. Hero, hotel story, terrace, rooms, experience gateway, reviews, location, dining, gallery, deeper page heroes and booking surfaces were refined with tighter image composition, editorial line language, restrained asymmetry, more deliberate selected states and mobile-specific overrides. No booking/inventory/payment business logic was changed. See `docs/STAGE-12.10.md`.


## Stage 12 — Final End-to-End Audit & Fix Pass

A fresh Stage 12 audit found and fixed several cross-stage gaps that individual sub-stage validators could not catch: secure post-booking retrieval, per-reservation payment authorization, stricter stay/input validation, safer booking-store failure behavior, inventory/payment race handling, payment-review reconciliation, admin capacity guards, public inventory sanitization, configurable guest/add-on/rate-plan/promo pricing paths, expired-hold UX and concierge/date parity.

The new `/manage-booking` route lets a guest retrieve a reservation only with the booking reference **plus the original booking email and phone**. A reference alone never exposes guest data. The final audit is documented in `docs/STAGE-12-FINAL-AUDIT.md`.

All available source/regression/type checks pass. The environment still cannot install npm dependencies because `registry.npmjs.org` is unreachable, so `eslint`, `next build`, final browser rendering and provider sandbox tests cannot honestly be marked PASS here. **Do not start Stage 13 until those runtime gates pass in an environment with dependencies/network access.**

## V2 REDESIGN

The post-Stage-12 redesign expands the public hotel product, adds Dining/Offers/Gallery/Contact/Policies routes, simplifies booking to three guest-facing steps, adds transactional email architecture, improves the hybrid concierge, activates the supplied reference panorama in the public tour, and adds SEO/analytics/manual-integration foundations.

Start with:
- `docs/V2-CRITICAL-AUDIT.md`
- `docs/V2-REDESIGN-COMPLETION.md`
- `docs/MANUAL-SETUP-AND-APIS.md`
- `docs/DEMO-DATA-AND-ASSET-REPLACEMENT.md`

## V3 production persistence

The current V3 build uses PostgreSQL for production booking persistence. JSON storage remains a local-development fallback only.

```bash
npm install
cp .env.example .env.local
# fill DATABASE_URL and other required values
npm run db:migrate
npm run db:seed
npm run dev
```

See `docs/V3-LUXURY-AND-DATABASE-AUDIT.md` for the architecture and audit.

> Note: the dependency lockfile is intentionally not shipped by this pass because the execution environment could not reach the npm registry after adding the PostgreSQL client. Run `npm install` once in a networked development environment to generate a fresh lockfile that matches `package.json`.
