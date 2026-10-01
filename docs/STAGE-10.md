# Stage 10 — Tejjora Concierge

Status: IMPLEMENTED / READY FOR VALIDATION

## Purpose

Tejjora Concierge is a hotel-specific assistance layer, not a generic chatbot. It uses only the project's confirmed hotel knowledge and sends uncertain or live questions back to the hotel rather than inventing an answer.

## Current provider

`RuleBasedConciergeProvider`

The UI talks to `/api/concierge`, which resolves the provider through `getConciergeProvider()`. A future AI provider can replace the deterministic provider without changing the client UI contract.

## Supported topics

- room categories and room-selection handoff
- parking
- Wi-Fi
- breakfast and vegetarian breakfast
- restaurant basics
- confirmed hotel amenities
- hotel address and directions
- Indira Gandhi Pratishthan
- airport / railway arrival guidance
- nearby highlighted places
- virtual tour
- Plan My Stay
- booking-request flow
- phone / WhatsApp handoff

## Truth rules

The concierge must not invent:

- live availability
- final rates
- check-in or check-out times
- cancellation terms
- room size
- bed configuration
- occupancy limits
- guaranteed room-level lake views
- pet policy
- restaurant timings/menu/table availability
- live traffic or ETA

When the current project data does not support an answer, the concierge says that clearly and surfaces hotel contact actions.

## UX

- global floating launcher
- premium dark concierge panel
- quick prompts
- message history held in React state only
- no guest PII persistence
- action chips for rooms, booking, planner, virtual tour, directions, WhatsApp and phone
- responsive mobile panel positioned above the persistent mobile action bar
- keyboard Escape closes the panel
- `aria-live` message region
- reduced-motion support

## Analytics

- `ai_open`
- `ai_message`

No conversation text is added to the analytics payload; `ai_message` currently sends only message length.
