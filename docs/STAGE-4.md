# Stage 4 — Hotel Story + Signature Terrace / Lake View Experience

## Status

Implemented and locked for the current design direction.

## What was added

### 1. The Place / Hotel Story

A new editorial introduction chapter now sits directly after the cinematic hero.

It uses real Tejjora lobby/reception photography and establishes:

- Gomti Nagar / Lucknow context
- 29 rooms
- 3 room categories
- 24-hour hotel assistance
- the hotel address
- the transition from city energy to a quieter hotel rhythm

This is intentionally not an icon-based amenities section.

### 2. Signature Terrace / Lake View Scroll Story

Desktop now has the architecture and interaction for the requested four-state terrace sequence:

1. 06:30 — Morning
2. 12:30 — Day
3. 17:45 — Evening / Golden Hour
4. 20:30 — Night

The section remains pinned while the visitor scrolls through the sequence. The media layers crossfade progressively, the timeline fills with scroll progress, the active time state changes, and supporting copy updates.

The current media files are placeholders only:

- `/public/images/placeholders/terrace-morning.svg`
- `/public/images/placeholders/terrace-day.svg`
- `/public/images/placeholders/terrace-evening.svg`
- `/public/images/placeholders/terrace-night.svg`

Replace these paths centrally in `src/data/assets.ts` when real photography arrives.

## Photography rule for the final effect

For the strongest final result, all four real terrace photographs should be captured from the same or near-identical:

- camera position
- camera height
- focal length
- direction
- framing

The purpose is to make the visitor feel that time changes while the viewpoint remains anchored.

## Mobile behavior

Mobile intentionally does not use desktop-style long pinned scroll-jacking. Instead, the four terrace states are presented as full-height sequential visual chapters in normal native scrolling:

Morning → Day → Evening → Night.

The user still experiences the time progression through scrolling, but with better mobile usability and performance.

## Accessibility

With `prefers-reduced-motion: reduce`, the pinned desktop sequence is disabled and the native sequential version is used instead.

## Performance

The scroll-linked desktop effect uses a passive scroll listener plus `requestAnimationFrame`. No GSAP dependency is loaded for this stage. The imagery uses `next/image` and only the first visual is prioritized.

## Future refinement

When real terrace assets arrive, Stage 14 visual refinement can add subtle exposure/color transitions between states. A WebGL water-refraction treatment remains optional and should only be considered if it materially improves the final photography without hurting performance.
