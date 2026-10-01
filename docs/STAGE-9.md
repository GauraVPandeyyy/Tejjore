# Stage 9 — Plan My Stay

## Status

Implemented and ready to lock after Stage 9 validation.

## Purpose

Turn the homepage planner from a generic lead form into a small, deterministic stay-planning product. The planner helps a guest organise a Tejjora stay without pretending to know live room inventory, traffic, hotel policies or unpublished room specifications.

## Experience flow

1. **Why are you coming?** — Business / Leisure / Family / Event / Short Stay
2. **How are you arriving?** — Airport / Railway / Driving / Already in Lucknow
3. **Dates + guests** — check-in, check-out, adults, children, optional meeting/destination
4. **Preferences** — Breakfast / Airport pickup / Early check-in / Late checkout
5. **Your Tejjora Plan** — suggested room, arrival guidance, stay suggestions, relevant places and booking handoff

## Rule engine

`src/lib/planner/rules.ts` is intentionally deterministic and provider-free. It uses only the guest's inputs plus existing Tejjora configuration.

The room output is labelled as a **planning suggestion**. It is not a capacity, inventory or availability decision. This is especially important for family/group travel because final room occupancy and bed configuration are not currently published.

## Booking handoff

`Check this stay` forwards known planner selections to `/book`:

- dates
- adults / children
- suggested room
- Breakfast Included preference when breakfast was explicitly selected; otherwise the guest chooses the rate in booking
- selected eligible add-on requests

The booking flow now validates and accepts `rate` and `addons` query parameters as optional prefill values. The guest still reviews the room, rate preference and extras before creating the request.

## Truth / safety rules

The planner does **not** claim:

- live availability
- fixed travel time or traffic conditions
- final room capacity
- final rate
- pickup availability
- early check-in / late checkout approval
- booking confirmation

Google Maps is used for live routing instead of hard-coded ETA values.

## Analytics

Existing events are now activated:

- `plan_my_stay_start`
- `plan_my_stay_complete`

Directions from the plan use the existing `directions_click` event.

## Mobile

Mobile keeps the same conversational sequence with a single-column native layout, no scroll-jacking and no hover dependency.

## Files

- `src/components/planner/PlanMyStay.tsx`
- `src/data/planner.ts`
- `src/lib/planner/rules.ts`
- `src/types/planner.ts`
- `src/app/book/page.tsx` (planner prefill parsing)
- `src/components/booking/BookingExperience.tsx` (planner prefills)
