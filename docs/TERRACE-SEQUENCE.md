# Signature Terrace View Sequence

## Intent

The lake/terrace experience must be felt through scrolling, not presented as a basic image carousel.

## Desktop behaviour (future Stage 4)

- Section occupies roughly 350–450vh of scroll distance.
- Visual viewport remains pinned for most of the sequence.
- Scroll progress maps to four states: Morning → Day → Evening → Night.
- Time marker progresses vertically or along a thin waterline.
- Terrace/lake media cross-dissolves with clip/mask and exposure changes, not a hard carousel slide.
- Copy changes sparingly; the image remains dominant.
- At the end, the pinned state releases naturally into the room chapter.

## Mobile behaviour

- Avoid long scroll-jacking.
- Use snap/swipe or compact scroll-linked panels.
- Preserve the four time states and the same visual story.

## Assets required later

Real photographs should ideally be captured from the **same terrace position and camera height** at:

- Morning / early daylight
- Midday
- Golden hour / evening
- Night

Keeping framing consistent allows the scroll transition to feel like time is changing around the user rather than the camera jumping between unrelated shots.

## Replacement

Only update `assets.terraceView` in `src/data/assets.ts`.
