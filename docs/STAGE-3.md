# Stage 3 — Cinematic Hero + Booking Search

Status: implemented in source.

## Scope delivered

- Public homepage now opens with the real Tejjora exterior asset rather than a stage placeholder.
- Desktop hero uses the `Window → Experience` concept: the property image begins as a right-side aperture and progressively opens toward full-screen as the visitor scrolls.
- Hero copy follows the frozen Waterline direction: editorial display type, restrained supporting copy, room-count proof and two low-noise CTAs.
- Desktop booking dock is integrated into the hero rather than rendered as a generic widget below it.
- Booking search captures check-in, check-out and adult/child counts.
- Date validation prevents empty or inverted date ranges.
- Search state is forwarded to `/book` through URL query parameters, ready for Stage 8 to consume.
- No live-availability claim is made.
- Mobile uses a compact `Check dates` trigger that opens a full-width booking bottom sheet rather than squeezing desktop controls into a narrow viewport.
- Reduced-motion users receive a stable hero without scroll-linked transformation.
- Stage 2 header now begins transparent on the homepage and gains its compact surface after scroll.

## Current hero asset

`/public/images/exterior/tejjora-exterior-blue-sky-01.webp`

This is a real Tejjora asset and remains centrally controlled through `src/data/assets.ts`.

Future hero video can replace/augment the still without changing the composition contract.

## Booking state contract

Current URL output:

`/book?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&adults=2&children=0`

Stage 8 should read this state rather than redesign the search entry point.

## Deliberately deferred

- full booking results and rate plans — Stage 8
- The Place and hotel introduction — Stage 4
- terrace Morning → Day → Evening → Night pinned experience — Stage 4
- rooms experience — Stage 5
- restaurant — Stage 6
- full animation polish / GSAP review — Stage 14

## QA notes

- No PMS, channel manager or live inventory is used.
- No fake scarcity or confirmation language appears.
- Mobile search explicitly states that availability is confirmed by the hotel.
- Heavy animation libraries are still not loaded for the hero; the aperture effect uses lightweight scroll progress and CSS clipping.
