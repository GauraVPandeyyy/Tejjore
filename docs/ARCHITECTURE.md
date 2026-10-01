# Architecture Snapshot

## Public routes (future build)

- `/` — primary hotel experience
- `/rooms` — all three room categories
- `/book` — booking/request journey
- `/virtual-tour` — Marzipano experience
- `/arrival` — post-booking arrival utility

## Data layer

All property information is centralized in `src/data`. Components should not duplicate business facts.

## Future providers

UI → service/domain logic → provider interface → implementation.

Reserved integration boundaries:

- InventoryProvider
- BookingProvider
- PaymentProvider
- MapsProvider
- FlightProvider
- ConciergeProvider
- AnalyticsProvider

No PMS or Channel Manager is implemented in the current phase.

## Motion hierarchy

- Ambient: subtle media drift / background motion
- Functional: navigation, buttons, forms
- Signature: terrace time sequence, room transitions, photo-to-360 transition

Only signature sequences may justify GSAP / ScrollTrigger pinning.
