# Stage 8 — Direct Booking Request Experience

## Scope completed

The `/book` placeholder has been replaced by a complete request-only direct booking journey. This phase deliberately does **not** claim live inventory, take payment, create a confirmed reservation, or persist a hotel booking.

### Flow

1. Dates + guests + number of rooms
2. Room preference — Deluxe / Super Deluxe / Premium
3. Rate-plan preference
4. Optional add-on requests
5. Guest contact details
6. Review + explicit acknowledgement
7. Request reference generation
8. WhatsApp / phone handoff to Tejjora Lake View

## Important truth rules

- All three room categories remain `request-only` until PMS/live inventory is integrated.
- No "available", "sold out", scarcity, or remaining-room claims are made.
- Room-specific prices are not invented.
- Rate-plan prices, add-on prices, taxes and final totals are not invented.
- No card details or payment are collected.
- The guest must explicitly acknowledge that the flow creates a request, not a confirmed reservation.
- The final screen clearly says that availability, final rate, inclusions and policies must be confirmed by the hotel.

## Provider boundary

`src/lib/booking/providers.ts` now includes:

- `requestOnlyInventoryProvider`
- `websiteBookingProvider`

These preserve the future integration seam for PMS, real inventory, booking persistence and payments.

## Request API

`POST /api/booking-request` validates the request server-side and creates a human-readable `TLV-...` reference. It does not persist guest data in this phase. The current phase does not persist booking-request or guest data for retrieval. Persistence is deferred to a future PMS/CRM-backed provider.

## WhatsApp handoff

The success state generates a structured WhatsApp message containing the request reference, dates, guests, room preference, rate preference, add-ons and guest contact details. This is currently the primary operational handoff to the hotel.

## Future replacement points

Later phases can replace the current providers with:

- PMS inventory search
- confirmed reservation creation
- payment provider
- tax / tariff calculation
- cancellation-policy engine
- email / WhatsApp Business API confirmations
- booking lookup / modification / cancellation

without redesigning the Stage 8 public flow.
