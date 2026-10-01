# Stage 11 — Full Marzipano Virtual Tour

## Status

Implemented and architecture-locked.

The `/virtual-tour` route is no longer a placeholder. It now contains the complete scene-based immersive tour shell and Marzipano runtime integration, while remaining truthful about the current asset state: genuine 2:1 equirectangular 360 photography has not yet been supplied, so every scene currently renders a verified still-image fallback instead of pretending that an ordinary photograph is a panorama.

## Scene sequence

1. Entrance
2. Reception
3. Lobby
4. Room Corridor
5. Deluxe Room
6. Super Deluxe Room
7. Premium Room
8. Restaurant
9. Lake View

Deep links are supported with `?scene=<scene-id>`, including the room links already used elsewhere in the website.

## Marzipano architecture

`VirtualTourExperience`
→ `MarzipanoViewer`
→ dynamic `import("marzipano")`
→ `ImageUrlSource`
→ `EquirectGeometry`
→ `RectilinearView`
→ scene hotspots

Marzipano is never loaded for scenes whose `panoramaReady` value is `false`. This prevents broken requests and avoids misrepresenting still photography as a 360 capture.

When a verified spherical file is added:

1. Copy it to the matching path in `public/panoramas/`.
2. Confirm it is a genuine equirectangular 360×180 image with a 2:1 aspect ratio.
3. Record the final source width in `src/data/virtualTour.ts` (`panoramaWidth`).
4. Set only that scene's `panoramaReady` flag to `true`.
5. Re-tune `initialView` and hotspot yaw/pitch positions against the real capture.
6. Test desktop drag, touch, zoom, fullscreen, keyboard controls and each hotspot.

## Controls

The custom UI supports:

- mouse/touch panorama drag through Marzipano
- left/right look controls
- zoom in/out
- reset view
- keyboard arrows
- `+` / `-` zoom
- `0` reset
- fullscreen
- previous/next scene navigation
- complete scene rail
- room-to-booking CTA
- fallback continuation actions before 360 assets are ready

Device-orientation/gyro is intentionally not forced in this stage. Browser permission behavior varies substantially and it is not required for a high-quality tour. It can be added after real panoramas are available and device QA justifies it.

## Truth safeguards

- Ordinary 4:3 / 3:2 hotel photographs are never stretched into fake 360 scenes.
- A scene marked `panoramaReady: false` shows a still preview plus a clear 360-photography-pending note.
- Room booking links remain request-only and inherit Stage 8 safeguards.
- Room-specific lake-view guarantees are not introduced by this tour.
- Hotspot positions in the current data are placement seeds, not final spatial claims; they must be adjusted to the actual captures.

## Performance

- Marzipano is dynamically imported only when a scene is genuinely panorama-ready.
- Still fallbacks use existing optimized hotel images.
- The tour does not load all nine spherical scenes on page entry.
- Scene changes initialize only the selected panorama in the current implementation.
- Fullscreen remains optional and gracefully falls back to the embedded viewer.
- Reduced-motion users do not receive decorative fallback image animation.

## Mobile

- natural touch interaction
- horizontally scrollable scene rail
- compact zoom/fullscreen controls
- no hover dependency
- scene continuation buttons remain available while 360 photography is pending
- persistent hotel mobile actions remain outside the tour shell

## Asset capture requirement

Final panorama files:

- `/public/panoramas/entrance.jpg`
- `/public/panoramas/reception.jpg`
- `/public/panoramas/lobby.jpg`
- `/public/panoramas/corridor.jpg`
- `/public/panoramas/deluxe.jpg`
- `/public/panoramas/super-deluxe.jpg`
- `/public/panoramas/premium.jpg`
- `/public/panoramas/restaurant.jpg`
- `/public/panoramas/lake-view.jpg`

Required capture characteristics:

- genuine spherical 360×180 capture
- equirectangular projection
- 2:1 aspect ratio
- level horizon
- tripod/nodal-point discipline where practical
- no visible photographer/tripod after retouching
- no stitched people/objects crossing seams
- room staging consistent with normal guest presentation
- no excessive HDR or misleading wide-angle stretching

Keep original high-resolution masters separately; optimize web delivery only after the final panorama QA pass.
