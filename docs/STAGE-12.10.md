# Stage 12.10 — Premium Visual Upgrade

## Objective
Raise the existing multi-page Tejjora product from a functional prototype aesthetic to a more deliberate boutique-hospitality editorial system without disturbing booking, inventory, payment, admin, concierge, panorama or location behaviour.

## Audit findings addressed
- Premium feel was still relying too heavily on large typography and spacing rather than image composition, material hierarchy and visual continuity.
- Homepage sections had different generations of styling and needed a coherent editorial line language.
- Hero booking/search UI looked more like a floating widget than part of the art direction.
- Rooms needed stronger product/editorial framing and clearer active-category language.
- Gateway cards were too evenly aligned and template-like.
- Reviews used an excessively dominant score treatment.
- Location preview needed a more obvious transition from editorial story into utility.
- Booking forms were functional but visually flat compared with the public site.
- Mobile needed the same brand material and hierarchy without inheriting desktop offsets.

## Implemented visual system

### Brand/material layer
- Added low-opacity global grain generated in CSS; no external texture asset is required.
- Added a stronger deep-lake / official cream / controlled orange accent system.
- Added a consistent orange waterline marker to major section toplines.
- Added shared premium media and floating-surface shadow tokens.

### Hero
- Kept the Stage 12.3 sticky/scroll mechanics unchanged.
- Refined exterior image grade, wash, bottom atmosphere and optical hierarchy.
- Added a small orange brand marker to the hero kicker.
- Integrated the booking dock more tightly into the brand system.
- Added subtle input focus/hover material feedback while keeping booking usability stable.

### Hotel story
- Added a restrained oversized editorial index behind the copy.
- Strengthened layered lobby imagery using a framed secondary photograph.
- Improved facts and image-label material hierarchy.

### Terrace
- Preserved the Morning → Day → Evening → Night interaction exactly.
- Added atmosphere/frame treatment and active orange timeline state.
- No additional scroll-jacking or heavy effect was added.

### Rooms
- Active room tabs now receive a branded progress line.
- Room media receives premium edge/shadow treatment and restrained grading.
- Amenities are visually quieter and room selector becomes sticky only on desktop.
- Mobile removes the sticky selector and heavy media shadow.

### Experience gateway
- Converted the three equal cards into a controlled staggered editorial composition on desktop.
- Mobile intentionally removes the offsets and preserves an efficient vertical story.

### Reviews / location / final CTA
- Review score scale was reduced and moved into a deeper lake surface rather than oversized black-number theatre.
- Location preview now transitions from a cool editorial surface into a framed utility panel.
- Final booking invitation received a more cinematic crop/veil and a cream primary CTA.

### Experience / dining / gallery / rooms page
- Applied consistent image grading, border/shadow material and active-state language.
- Dining selected state gains a small controlled brand marker.
- Gallery and room media use subtle elevation only on precise-pointer devices.

### Booking experience
- Booking remains usability-first.
- Added an explicit direct-booking editorial marker, branded waterline progress and clearer selected states.
- Room cards, extras and rate options now share a consistent selected-state language.
- Sticky booking summary now reads as a premium stay folio rather than a generic card.
- No pricing, inventory, tax, payment or reservation logic was changed by this stage.

## Responsive strategy
- Dedicated <=820px and <=560px visual overrides remove desktop-only offsets, shadows and sticky selectors where they reduce usability.
- 13–14 inch laptop media query tightens hero and section typography/spacing without changing content order.
- No new fixed-position mobile surface was introduced.
- Existing reduced-motion behaviour remains authoritative; Stage 12.10 hover/elevation transitions are disabled under reduced motion.

## Performance strategy
- No new JS animation library or client component was added.
- No new image/video dependency was added.
- Grain is CSS-generated.
- New effects are primarily paint-light borders, gradients, shadows and transform-only hover movement.
- Panorama and heavy media loading behaviour remains unchanged.

## Regression boundary
This stage intentionally does not modify:
- inventory calculations
- room rates
- tax/business configuration
- reservation persistence
- Razorpay flows
- admin authentication
- concierge dynamic facts
- Google Maps / Places providers
- Marzipano scene logic

## Validation
Passed in this environment:
- Stage 1 / 9 / 10 / 11 / 12 / 12.1–12.9 validators
- Stage 12.9 strict core TypeScript configuration
- CSS brace integrity
- Stage 12.10 visual-system validator

Blocked by environment:
- `npm run lint`
- `npm run build`
- fresh browser screenshots of the modified Stage 12.10 build

The blocker is missing local dependencies plus npm registry DNS failure (`EAI_AGAIN`). Do not treat Stage 12 as finally production-gated until dependency-backed build and rendered viewport audit can run.
