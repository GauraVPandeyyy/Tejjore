# Stage 6 — Virtual Tour Preview + Restaurant Experience

Status: IMPLEMENTED

## Scope

Stage 6 adds two major commercial / experiential homepage chapters without implementing the full Marzipano runtime yet.

### 04 / STEP INSIDE
- Dark immersive virtual-tour portal after the room comparison
- Uses real Tejjora room photography for the preview, not fake panorama imagery
- Dedicated links for Deluxe, Super Deluxe and Premium scenes
- Preserves final scene hierarchy: Entrance, Reception, Lobby, Rooms, Dining, Lake View
- Routes into `/virtual-tour?scene=<id>` so Stage 11 can attach real Marzipano scenes without redesigning the CTA system
- Strong photo-to-tour visual language with room-specific scene entry points

### 05 / DINE
- Editorial restaurant chapter using existing real Tejjora restaurant photography
- Interactive Dining Room / Breakfast / Dinner states
- Food imagery remains clearly configured as placeholders until a real food shoot is supplied
- Daily breakfast and vegetarian breakfast availability are taken from central restaurant data
- Restaurant timings are not fabricated and display as hotel-confirmed data until supplied
- Functional WhatsApp table enquiry and call actions
- Real restaurant gallery strip from the current asset library

## Truth / asset rules

- No external restaurant name is invented. Public presentation is "Dining at Tejjora" / DINE until an independently confirmed restaurant brand exists.
- Existing hotel restaurant interiors are used as real property photography.
- Breakfast and dinner placeholders are intentionally non-deceptive development assets.
- No menu, restaurant timings, food pricing, or table availability is invented.
- The full Marzipano viewer is still Stage 11. Stage 6 only builds the premium discovery / entry portal.

## New components

- `src/components/virtual-tour/VirtualTourPreview.tsx`
- `src/components/restaurant/RestaurantExperience.tsx`

## Future handoff

Stage 11 should reuse the existing `?scene=` entry points and `virtualTourScenes` config.
Real 360 equirectangular files can replace panorama paths without changing Stage 6.
Real food photography can replace `assets.food.*` paths without component changes.
