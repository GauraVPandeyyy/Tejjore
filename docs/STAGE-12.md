# Stage 12 — Smart Arrival Experience

## Status

Implemented and architecture-locked.

The `/arrival` route is now a guest-utility experience rather than a marketing-page placeholder. It is intentionally excluded from search indexing and remains outside the primary navigation. The current phase does not pretend that the website can retrieve a live booking, flight, transfer or room status before a verified provider/PMS connection exists.

## Guest flow

The experience is organised into five tabs:

1. **Arrival** — hotel address, live Google Maps route, parking guidance and hotel contact.
2. **My Stay** — connected-stay presentation when trusted booking data becomes available; current default state is deliberately unlinked.
3. **Dining** — confirmed breakfast and restaurant basics without inventing menu, timings or inclusions.
4. **Explore** — current routes from Tejjora to relevant Lucknow destinations, with no hard-coded travel time.
5. **Help** — phone, WhatsApp and Tejjora Concierge handoff.

The top of the page keeps three high-priority actions permanently obvious: Navigate to Tejjora, Call the hotel, and WhatsApp Tejjora.

## Current booking-data state

There is no request persistence or PMS lookup in the current build. Consequently, `/arrival` does not accept arbitrary URL values and present them as a verified reservation.

A clearly labelled development preview is available at:

`/arrival?demo=1`

It uses `DEMO-STAY` and visibly states that it is sample data, not a live booking. The default route contains no fake guest name, room assignment, check-in time, tariff, policy or confirmation status.

## Future provider boundary

The arrival layer now has explicit seams for:

- `ArrivalStayProvider` / `ArrivalLookupProvider`
- `FlightProvider`
- `TransferProvider` / `TransferStatusProvider`
- existing Maps and Analytics providers

Future connected flow:

`secure arrival link → booking lookup → verified stay data → optional flight/transfer providers → Smart Arrival UI`

The UI should not need to be redesigned when these providers arrive.

## Truth safeguards

- No fake live booking retrieval.
- No fake room-ready state.
- No hard-coded check-in/check-out time where the hotel has not confirmed one.
- No invented flight status.
- No invented transfer status.
- No fixed traffic ETA.
- No unverified breakfast inclusion.
- No invented restaurant timings/menu.
- Special requests are requests only; the hotel must confirm them.
- Guest/stay details are not persisted to `localStorage` or `sessionStorage`.

## Dining

Current confirmed information shown in Smart Arrival:

- on-site restaurant
- daily breakfast
- vegetarian breakfast option

Exact timing, menu, rate-plan inclusion and table availability remain hotel-confirmed values.

## Explore

Nearby routing uses the central `nearby.ts` dataset and current Google Maps routes from the hotel. This preserves useful navigation while avoiding stale ETA/distance claims.

## Concierge integration

The global Concierge can now be opened programmatically with the `tejjora:concierge-open` browser event. Smart Arrival uses this in the Help tab so the guest does not need to find the floating launcher manually.

## Mobile

- utility-first hierarchy
- sticky five-tab switcher
- large map/call/WhatsApp actions
- no hover dependency
- one-column arrival/help tools
- compact nearby-route list
- normal page scrolling; no scroll-jacking

## SEO/privacy

`/arrival` currently exports `robots: { index: false, follow: false }`. A future authenticated or tokenized guest-arrival link can add stronger access controls when real booking data is connected.
