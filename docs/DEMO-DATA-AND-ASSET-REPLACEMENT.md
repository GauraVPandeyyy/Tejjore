# Demo Data & Asset Replacement Register

Demo/reference content is deliberately centralized so the product can be fully designed before every hotel input is final.

## Replace before public launch

- `src/data/reviews.ts` → `DEMO_REVIEWS`: visual fallback only; live Google Places reviews replace these when credentials are configured.
- `src/data/offers.ts` → promotional concepts: replace/enable/disable based on approved hotel offers.
- `src/data/dining.ts` → menu preview: replace with the restaurant's approved menu/cuisine.
- `src/data/localExperiences.ts` → editorial neighbourhood suggestions: verify final recommendations and descriptions.
- `src/data/rooms.ts` → any null room size/bed/occupancy/view fields: populate from the final room specification sheet.
- `src/data/policies.ts` → policy placeholders: replace with approved hotel business/legal policy.
- `public/panoramas/demo/*` / panorama manifest reference media → replace with genuine Tejjora 2:1 spherical panoramas.
- Terrace/lake time-of-day placeholder media → replace with the same terrace viewpoint photographed morning, day, evening and night.
- Breakfast/food placeholder photography → replace with real restaurant food photography.

## Existing real property media

The existing Tejjora exterior, lobby/reception, room-set and restaurant-interior images remain valid property media. Continue to curate rather than loading the entire source library.

## Rule

Reference imagery can demonstrate layout/interaction but must never be described as a confirmed Tejjora facility, room feature or view when it is not genuine property media.
