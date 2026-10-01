# Stage 12.9 — Concierge Productization

## Objective
Turn the Stage 10 deterministic FAQ-style concierge into a useful hybrid hotel assistant that uses real application state when it exists and refuses to invent dynamic facts.

## Implemented
- Default `HybridConciergeProvider` layered over the existing rule-based hotel knowledge provider.
- Current operational room rates are read from the same booking/admin operations store used by public checkout.
- Date-aware availability questions can query the booking inventory when genuine production inventory is configured.
- Development fallback inventory is never presented as real hotel availability.
- Natural date extraction supports ISO, DD/MM/YYYY, DD-MM-YYYY and common `2 Oct 2026 to 4 Oct 2026` style ranges.
- Availability answers deep-link into `/book` with dates and room category prefilled.
- Room comparison uses confirmed room positioning and shared confirmed amenities only.
- Booking/payment-status questions receive a privacy-safe response instead of exposing reservation data from a reference alone.
- Responses identify whether they came from current website operational data or curated hotel knowledge.
- Quick prompts now prioritize rates, availability, room comparison, breakfast, location and virtual tour.
- The UI does not persist guest chat or send message text to analytics.

## Truth / privacy safeguards
- No development inventory counts are represented as genuine availability.
- No unconfigured taxes, extras, policies, room occupancy, bed type, room size or room-specific lake view are invented.
- Reservation/payment status is not disclosed from a booking reference alone.
- Existing rule-based knowledge remains the fallback if no dynamic intent applies.

## Provider boundary
`CONCIERGE_PROVIDER=hybrid` is the default behavior. `CONCIERGE_PROVIDER=rules` can force the deterministic knowledge-only provider. An optional external language model can be introduced later behind `ConciergeLanguageLayer` without allowing it to become the source of truth for rates, inventory, booking state or payment state.

## Validation
Use:

```bash
npm run validate:stage12-9
npm run typecheck:stage12-9-core
```

Full Next.js lint/build still requires installed project dependencies.
