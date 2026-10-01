# Stage 7 — Homepage Narrative Completion

Status: IMPLEMENTED

Stage 7 completes the non-booking homepage narrative after the restaurant chapter. It intentionally avoids implementing Plan My Stay (Stage 9), the full booking flow (Stage 8), AI (Stage 10) or Marzipano runtime (Stage 11).

## 06 / A DAY AT TEJJORA

- Editorial time-based stay story instead of another amenities grid
- Uses four narrative waypoints: morning, city, evening return, dinner
- Time labels are explicitly presentation waypoints, not restaurant or service operating hours
- Real property imagery is used where available; breakfast and terrace media remain neutral placeholders
- Desktop uses a structured editorial timeline; mobile becomes a natural vertical story

## 07 / WHY TEJJORA

- Interactive five-reason editorial system
- The View, The City, The Table, The Scale, The People
- Desktop supports hover/focus/tap media switching
- Facts stay within known property data: Gomti Nagar, restaurant, 29 rooms, three categories, 24-hour front desk
- Terrace imagery remains placeholder until the real view shoot arrives

## 08 / LOCATION

- Location is presented as a designed spatial chapter rather than a heavy embedded map
- Browser geolocation is requested only after the guest clicks “Route from my location”
- Successful geolocation opens Google Maps driving directions from the current coordinates
- If permission is denied/unavailable, the experience falls back to hotel directions without inventing ETA
- Nearby locations link to Google Maps search and do not display unverified distance/time values

## 09 / GUEST NOTES

- Uses the current verified Google snapshot stored in `src/data/reviews.ts`
- Current snapshot: 5.0 from 10 reviews, captured 2026-09-27
- Does not invent review excerpts or imply the number is live
- Links guests to Tejjora’s Google Maps search surface for current public information

## 10 / FRAGMENTS

- Curated property gallery from real existing hotel photography
- No terrace, food, stock or fake hotel imagery is mixed into the public gallery
- Filter groups: All, Stay, Hotel, Dining
- Accessible fullscreen lightbox with previous/next controls and Escape handling
- Gallery is intentionally curated instead of loading every available photograph

## 11 / STAY DIRECT

- Compact direct-booking reassurance instead of a large marketing block
- Uses only defensible benefits: direct hotel support, special-request handling, pre-arrival assistance
- Does not claim lowest price or rate guarantees

## 12 / COME CLOSER

- Full-bleed final property image
- Check Dates, Call, WhatsApp and Directions actions
- Ends the homepage with a direct conversion scene before the global footer

## Navigation correction

The Stage 2 utility navigation previously included a `Plan My Stay` anchor before that feature existed. Stage 7 removes that premature link to avoid a dead/broken destination. Stage 9 will restore the entry once the interactive planner is implemented.

## Truth rules preserved

- No fake travel times or distances
- No invented review quotes
- Google rating is clearly treated as a dated snapshot
- No stock photography is represented as Tejjora
- No fake restaurant timing/menu data
- No fake room availability
- No PMS / Channel Manager work in this stage

## New files

- `src/components/hotel/DayAtTejjora.tsx`
- `src/components/hotel/WhyTejjora.tsx`
- `src/components/location/LocationExperience.tsx`
- `src/components/reviews/ReviewsSection.tsx`
- `src/components/gallery/GalleryExperience.tsx`
- `src/components/hotel/DirectStayBanner.tsx`
- `src/components/hotel/FinalInvitation.tsx`
- `src/data/gallery.ts`

## Next stage

Stage 8: Full booking/request UX using the existing request-only booking architecture. No live inventory will be implied until a future PMS/inventory provider exists.
