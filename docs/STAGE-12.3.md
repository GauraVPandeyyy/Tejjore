# Stage 12.3 — Responsive Signature Motion

## Audit

The desktop hero already had a useful scroll-linked aperture expansion, while the mobile implementation became a static composition. The terrace sequence had an even larger parity gap: desktop used one pinned visual stage with Morning → Day → Evening → Night progression, while mobile rendered four long independent panels. That weakened the signature concept and made the page feel longer on 360–412 px devices.

## Strategy

Preserve the existing lightweight `requestAnimationFrame` progress model instead of introducing another animation runtime. Use one scroll-progress calculation per signature section and keep the visual work on opacity, transform and clip-path. Mobile receives its own composition rather than copying desktop coordinates.

Reduced-motion users continue to receive a non-pinned, sequential fallback.

## Hero implementation

- Mobile hero now has a real 100svh sticky stage inside a controlled scroll runway.
- The initial exterior photograph is framed as a rounded visual window.
- Scrolling expands that frame toward the viewport edges while the editorial copy translates/fades.
- The mobile booking trigger remains available near the bottom of the stage, with the global Call / WhatsApp / Check Dates bar still present.
- No scroll-jacking or wheel/touch interception is used.

## Terrace implementation

- Mobile now uses one consistent sticky visual stage rather than four long stacked scenes.
- Morning → Day → Evening → Night are driven by the same normalized section progress as desktop.
- Media layers crossfade and scale subtly while the active headline/copy changes.
- A compact four-state time rail shows progression without consuming a second screen.
- The old stacked sequence remains only as the `prefers-reduced-motion` fallback.
- Developer-facing placeholder copy was removed from the public desktop experience.

## Performance / accessibility

- Passive scroll listener + `requestAnimationFrame` only.
- No mobile `background-attachment: fixed`.
- No continuous layout writes.
- `prefers-reduced-motion` removes sticky transformations and restores readable static flow.
- Existing mobile action bar preserves booking access during cinematic states.

## Validation limitation

Source validators and syntax audits can run in the current environment. Full browser interaction validation, lint and Next production build still require installed project dependencies; npm registry access is unavailable in this runtime.
