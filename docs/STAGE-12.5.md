# Stage 12.5 — 360° / Panorama Productization

## Audit

The Stage 11 Marzipano architecture was already structurally sound: lazy dynamic import, scene-level activation, still-image fallbacks, custom controls and room-booking handoffs. The gap was media productization. No genuine Tejjora 2:1 spherical capture existed, and the newly supplied files had mixed geometry and unclear property provenance.

## Asset classification

Three supplied panoramic assets were inspected by actual pixel dimensions:

- Living-room image: 2048×1024 — exact 2:1. Technically eligible to exercise an equirectangular viewer, but treated as development/demo media only because it is not verified Tejjora property photography.
- Kitchen image: 2048×1024 — exact 2:1. Same treatment: development/demo only.
- Wide panorama image: 905×360 — approximately 2.514:1. It is not accepted as a full 360×180 sphere and remains flat-preview-only.

Aspect ratio alone is not proof of a correctly stitched spherical capture. Production Tejjora scenes still require real hotel 360 photography and visual seam/orientation QA.

## Implementation

- Added a central `panoramaAssets.ts` manifest with dimensions, aspect ratio, media provenance and immersive eligibility.
- Added the two exact-2:1 assets under `public/panoramas/demo/`.
- Added the non-2:1 source only as a flat preview asset.
- Added `mediaKind` and `sourceNote` support to the virtual-tour scene contract.
- Preserved all real Tejjora scenes as `pending`; no stock/demo panorama is silently substituted into a hotel scene.
- Added a development-only 360 viewer QA bench available at `/virtual-tour?demo360=1` in non-production builds.
- The QA bench carries persistent on-screen wording that the media is not Tejjora property photography.
- Production builds ignore the demo query parameter entirely.
- Existing Marzipano lazy-loading, touch drag/pinch, fullscreen, zoom, keyboard controls, hotspots and still fallbacks remain intact.

## Public truth model

Normal `/virtual-tour` continues to show actual Tejjora still photographs for pending scenes. A visitor is never shown unrelated demo interiors as if they were Deluxe, Premium, Lobby, Restaurant or Lake View.

## Replacement workflow

When genuine hotel panoramas arrive, replace the expected scene files, switch only QA-approved scenes to `panoramaReady: true` + `mediaKind: "property"`, then tune initial orientation and hotspots against the real sphere.
