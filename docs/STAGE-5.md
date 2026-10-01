# Stage 5 — Rooms + Room Comparison

Status: IMPLEMENTED

## Scope

Stage 5 introduces the first full accommodation selling experience while preserving the project's rule against invented hotel data.

### Homepage
- `03 / STAY` immersive room selector
- Only three canonical categories: Deluxe Room, Super Deluxe Room, Premium Room
- Real curated Tejjora room photography from the existing Drive asset set
- Desktop hover/focus room switching, mobile tap selection
- Known amenities only
- CTAs to room detail, 360 scene, and booking request
- Functional comparison table after the immersive selector

### `/rooms`
- Editorial opening rather than a card catalogue
- Three room chapters on one page; no unnecessary room sub-pages
- Real image galleries for each provisional room set
- Accessible native-dialog lightbox with previous/next controls
- Known amenities
- Transparent hotel-confirmation wording for unverified occupancy, bed, dimensions, and exact view allocation
- Links to booking and future Marzipano room scenes
- Shared comparison module

## Data truth rules

The image-set mapping remains provisional:
- Set A → Deluxe
- Set B → Super Deluxe
- Set C → Premium

This stays centralized through `src/data/assets.ts` / `src/data/rooms.ts` and must be corrected once hotel management confirms the room mapping.

No price, size, occupancy, bed configuration, or guaranteed lake-view allocation has been fabricated.

## New components

- `RoomShowcase.tsx`
- `RoomComparison.tsx`
- `RoomGallery.tsx`
- `RoomsCollection.tsx`

## Future handoff

Stage 8 can consume the `?room=<room-id>` links without redesigning the Stage 5 room CTAs.
Stage 11 can consume the `?scene=<room-id>` virtual-tour links when real 360 panoramas are supplied.
