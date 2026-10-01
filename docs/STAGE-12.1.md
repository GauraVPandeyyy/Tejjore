# Stage 12.1 — Design Density + Official Brand Reset

## Audit findings

The Stage 12 codebase used a consistent editorial system, but many sections relied on very large vertical spacing and display sizes to create a premium feeling. Repeated values such as `clamp(8rem, 14vw, 13rem)`, `clamp(7rem, 11vw, 11rem)`, large 8–10rem headings and tall section media created excessive scroll length on common 1280×800 and 1366×768 laptop screens.

The identity in the global header and footer was also still text-only even though an official Tejjora Lake View logo is now available.

## Strategy

1. Keep the Waterline editorial identity and existing component architecture.
2. Introduce shared density tokens instead of individually inventing new spacing per section.
3. Keep genuinely cinematic full-screen moments full-screen, but tighten the surrounding editorial sections.
4. Add a shorter-screen desktop tuning layer for 13–14 inch laptops.
5. Tighten mobile spacing independently rather than merely scaling desktop down.
6. Use the official supplied logo without stretching it or covering the site with the full badge.
7. Use the logo symbol in compact navigation/product contexts and the full supplied lockup in the footer.

## Brand implementation

Official supplied asset:

- `/public/brand/tejjora-logo.png` — untouched full logo lockup
- `/public/brand/tejjora-mark.png` — crop of the official illustration mark for compact UI usage
- `/src/app/icon.png` — app/favicon identity derived from the official mark

The color system now aligns the primary deep lake tone to the supplied logo (`#002E36`) and exposes its cream (`#FFF6C6`) and orange (`#FF6437`) as controlled brand accents. Orange is deliberately not used as a dominant site color.

## Density system

New shared tokens:

- `--section-y-xl`
- `--section-y-lg`
- `--section-y-md`
- `--section-gap-lg`
- `--section-gap-md`
- `--page-top`

These now control the major homepage chapters and product routes. A specific `min-width: 900px and max-height: 850px` tuning layer reduces display scale and vertical runway on typical 13–14 inch laptop viewports.

## Areas tightened

- global container width
- global header height
- footer spacing and brand lockup
- hero travel, type and booking-dock density
- hotel story spacing/media height/fact cards
- terrace UI chrome while preserving its cinematic stage
- room showcase and comparison
- rooms page hero
- booking page page-top/header/progress spacing
- virtual-tour intro and overall spacing
- Smart Arrival top spacing
- A Day at Tejjora
- Location landmark rows
- Reviews scale
- Gallery image heights
- Plan My Stay stage height/options
- Direct Stay strip
- final invitation height
- mobile equivalents for the same system

## Intentionally deferred

- Information architecture/homepage shortening belongs to Stage 12.2.
- Hero and terrace mobile signature-motion redesign belongs to Stage 12.3.
- Live map/review providers belong to Stage 12.4.
- Supplied panorama evaluation and Marzipano asset integration belong to Stage 12.5.
- Real booking/inventory/payment/admin work belongs to later Stage 12 substages.

This prevents Stage 12 from becoming one risky, unreviewable change set.
