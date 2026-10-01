# Tejjora Lake View — panorama delivery folder

The production virtual tour accepts only verified full-spherical property captures for Tejjora scenes.

## Final Tejjora files expected

- entrance.jpg
- reception.jpg
- lobby.jpg
- corridor.jpg
- deluxe.jpg
- super-deluxe.jpg
- premium.jpg
- restaurant.jpg
- lake-view.jpg

Each production file must be:

- genuine full spherical 360 × 180 photography
- equirectangular projection
- exact 2:1 aspect ratio
- level and correctly stitched
- suitable for commercial web use

Do not stretch ordinary hotel photography to 2:1.

## Stage 12.5 supplied-asset audit

The supplied development files were handled by their real format:

- `demo/interior-living-360.jpg` — 2048×1024, exact 2:1, eligible only as a labelled Marzipano development demo; **not Tejjora property media**.
- `demo/interior-kitchen-360.jpg` — 2048×1024, exact 2:1, eligible only as a labelled Marzipano development demo; **not Tejjora property media**.
- `/images/virtual-tour/wide-panorama-preview.png` — 905×360 (~2.514:1), flat-preview-only; it must never be used as a full 360×180 sphere.

The public Tejjora scenes remain on real-property still fallbacks until genuine Tejjora spherical captures are delivered and QA-approved.

### Development viewer QA

In a non-production build, append `?demo360=1` to `/virtual-tour` to expose the labelled viewer test bench. The demo bench is forcibly disabled in production builds.

After adding a verified Tejjora capture, update the matching scene in `src/data/virtualTour.ts`:

1. set `panoramaReady: true`
2. set `mediaKind: "property"`
3. set `panoramaWidth` to the delivered image width
4. tune `initialView`
5. tune hotspot yaw/pitch positions
