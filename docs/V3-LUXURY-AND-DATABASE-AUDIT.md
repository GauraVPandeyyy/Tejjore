# Tejjora Lake View — V3 Luxury + Database Audit

## What was found before this pass

| Feature | Previous source | API | Durable production DB | V3 action |
|---|---|---:|---:|---|
| Room marketing content | TypeScript data | No | N/A | Kept static where it is brand/content data |
| Rates / inventory config | Operations config + environment | Yes | No | PostgreSQL-backed store added |
| Availability | Server calculation over booking store | Yes | No | Same verified logic now reads PostgreSQL in production |
| Reservations | JSON file store | Yes | No | PostgreSQL reservations table + transaction lock |
| Guest booking details | JSON file store | Yes | No | Persisted inside PostgreSQL reservation row |
| Payments | Razorpay/test provider | Yes | Depended on JSON | Payment state persists in PostgreSQL |
| Inventory blocks | JSON file store | Admin API | No | PostgreSQL inventory_blocks table |
| Date/rate operations | JSON operations config | Admin API | No | PostgreSQL booking_operations row |
| Webhook idempotency | JSON array | Webhook API | No | PostgreSQL processed_webhooks table |
| Contact page | Direct phone/WhatsApp/Maps links | No form | N/A | No unnecessary contact table added |
| Dining content | Static verified property content + demo menu | No | N/A | Demo menu removed from public rendering; verified facts retained |
| Offers | Static concepts | No | N/A | Removed from primary IA; /offers redirects to Experiences |

## Persistence architecture

Production uses PostgreSQL when `DATABASE_URL` is present. `BOOKING_MODE=production` refuses to use the JSON fallback.

The existing booking/admin logic still calls the same `readBookingStore` / `withBookingStore` API. The store now selects PostgreSQL in production, so public booking, payment webhooks, inventory and admin operations share one source of truth.

### Transaction safety

`withPostgresBookingStore` opens a database transaction and obtains a PostgreSQL transaction advisory lock before reading inventory and writing reservation state. This prevents two application instances from independently consuming the same website inventory slot during a booking write.

### Tables

- `room_types`
- `reservations`
- `inventory_blocks`
- `booking_operations`
- `processed_webhooks`

Migration: `db/migrations/001_booking_core.sql`

## Setup

1. Create a PostgreSQL database.
2. Add `DATABASE_URL` to `.env.local`.
3. Set `DATABASE_SSL=true` only when the provider requires SSL.
4. Run `npm install`.
5. Run `npm run db:migrate`.
6. Optionally run `npm run db:seed` (it creates only the three existing room type references; no fake bookings).
7. Keep `BOOKING_MODE=development` while testing.
8. Run `npm run dev`.
9. Before live payment, configure real inventory, hotel pricing/tax rules, Razorpay live keys and set `BOOKING_PRODUCTION_READY=true` plus `BOOKING_MODE=production`.

## Design changes in this pass

- Instrument Serif + Manrope font system through `next/font/google`.
- Full-width identity-led navbar with calmer scroll state and purpose-built mobile menu.
- Compact luxury booking console inspired by hospitality booking patterns, without copying the reference site.
- Water-inspired directional button fill based on the supplied hover recording.
- Homepage Dining rebuilt so primary information never disappears on hover.
- Offers removed from primary navigation and homepage; Experiences is now the meaningful destination.
- Rooms hero converted to photography-led full-viewport arrival.
- Dining page no longer renders the demo menu as if it were hotel-approved data.
- Experience hero uses the supplied terrace/sunset imagery.
- Contact hero uses actual property reception photography.
- Tejjora AI launcher reduced to an original compact T/jewel mark.
- Company / GST fields removed from guest checkout UI and ignored on new public booking payloads.
- Existing Morning / Day / Evening / Night terrace behaviour preserved, including dedicated d1-d4 and m1-m4 assets.
- Short mobile viewports no longer hide terrace caption data.

## Validation performed in this environment

Passed:

- Stage 12 final static audit
- Stage 12.10 CSS balance validator
- V2 redesign validator (updated for Experiences + database files)
- Stage 12.7 booking/payment static validator
- Stage 12.8 admin static validator
- TypeScript syntax scan showed no TS1xxx parser errors in modified code

Not runnable here:

- `npm install` / `next build` because this execution environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`).
- Live PostgreSQL persistence test because no production `DATABASE_URL` was supplied.
- Live Razorpay payment because no production credentials were supplied.

These are external runtime gates, not intentionally unfinished code paths.
