# Tejjora Lake View — Feature Inventory

As of commit `4534f15`. For every feature this inventory records:
- where it lives (the user interface and the API);
- what data it uses (the database or a TypeScript file);
- whether admin can control it;
- what depends on it;
- known gaps;
- the planned action.

## Features

### 1. Availability search
- **UI:** `BookingSearch`, `BookingExperience`.
- **API:** `POST /api/availability`.
- **Data:** the booking store (Postgres, or a JSON file in dev).
- **Admin control:** inventory, rates, blocks and overrides.
- **Depends on it:** the booking flow and the concierge.
- **Gaps:**
  - Exact room counts are visible to the public.
  - Client and server guest limits differ (6/4 vs 12/8).
  - There is no per-room occupancy limit.
- **Action:** PRESERVE the logic; REFINE limits and occupancy.

### 2. Server-side pricing
- **Where:** `lib/booking/pricing.ts`.
- **Data:** the DB rates, falling back to `commerce.ts`.
- **Admin control:** base rate and date overrides only.
- **Depends on it:** reservations, the payment order, the concierge.
- **Gaps:**
  - Rate plans, add-ons, tax and promos can only be set in env.
- **Action:** PRESERVE; ADD admin control of rate plans, tax and promos.

### 3. Reservation hold
- **API:** `POST /api/reservations`.
- **Data:** the `reservations` table.
- **Admin control:** none.
- **Depends on it:** payment, email.
- **Gaps:**
  - The reference has only 24 bits of randomness.
  - Expiry is never written back to the record.
  - `/api/booking-request` duplicates this endpoint.
- **Action:** PRESERVE; REFINE the reference; REMOVE the duplicate alias (the UI does not use it, see `providers.ts:35`).

### 4. Payment (Razorpay)
- **APIs:** `payments/order`, `verify`, `webhook`.
- **Data:** the `reservations` and `processed_webhooks` tables.
- **Admin control:** view only.
- **Depends on it:** confirmation.
- **Gaps:**
  - The webhook secret is empty.
  - There is a race between verify and webhook.
  - The amount paid is overwritten instead of added to.
  - The Razorpay call runs while the lock is held.
  - There is no refund UI.
- **Action:** REFINE (correctness), ADD refund.

### 5. Confirmation email (Brevo)
- **Where:** `lib/email/*`.
- **Data:** the email fields on the reservation.
- **Admin control:** sent automatically on confirm.
- **Gaps:** staff cannot resend it, and templates live in code.
- **Action:** PRESERVE; ADD a resend button.

### 6. Manage booking
- **UI:** `/manage-booking`.
- **APIs:** `reservations/retrieve`, `status`.
- **Data:** the `reservations` table.
- **Gaps:**
  - A guest needs reference, email and phone together.
  - The phone match uses digits only.
  - Each lookup writes a token to the DB.
  - Personal details are shown unmasked.
- **Action:** REBUILD-IN-PLACE as reference + mobile with masked output. Keep the full view behind the existing three-field check.

### 7. Admin authentication
- **UI:** `/admin/login`.
- **API:** `admin/auth/*`.
- **Data:** env vars.
- **Depends on it:** all admin features.
- **Gaps:**
  - A plain-text password is in use.
  - There are no roles.
  - There is no server-side session revocation.
  - The login lockout lives in memory.
- **Action:** REFINE.

### 8. Admin: Today, Reservations, Availability & Rates, Payments
- **UI:** `AdminDashboard`.
- **API:** `admin/*`.
- **Data:** the booking store.
- **Gaps:**
  - Overview data is not paginated and includes personal details.
  - Lists are capped at 20 items.
  - The grid shows 7 days, while 14 are fetched.
  - There is no audit log or CSV export.
- **Action:** PRESERVE the features; REFINE these gaps.

### 9. Room catalogue
- **UI:** `/rooms`, home preview, comparison table.
- **Data:** `data/rooms.ts`.
- **Admin control:** **none**.
- **Depends on it:** booking, the 360 tour hotspots, the concierge, the structured data.
- **Gaps:**
  - Specs are null.
  - The comparison table is all "Confirm with hotel".
  - There is no detail page per room.
- **Action:** REBUILD-IN-PLACE on top of a `rooms` table. **Keep the ids.**

### 10. Offers
- **UI:** `OffersPage` (orphaned).
- **Data:** `data/offers.ts` (demo).
- **Admin control:** none.
- **Gaps:** the content is demo only, and the route redirects.
- **Action:** REBUILD-IN-PLACE as an `offers` table with validity dates.

### 11. Gallery
- **UI:** `/gallery`, home preview.
- **Data:** `data/gallery.ts` (real photos).
- **Admin control:** none.
- **Gaps:**
  - The lightbox has no keyboard or swipe navigation.
  - Alt text is generic.
- **Action:** REFINE, and back it with a `media_assets` table.

### 12. Restaurant
- **UI:** `/dining`, home section.
- **Data:** `data/restaurant.ts`, `dining.ts`.
- **Admin control:** none.
- **Gaps:**
  - There is no menu, hours or ordering.
  - The home section duplicates `/dining`.
- **Action:** REBUILD-IN-PLACE; ADD menu, ordering and admin (see the masterplan).

### 13. Terrace "morning → night" storytelling
- **UI:** `TerraceExperience` (home), `DayAtTejjora` (`/experience`).
- **Data:** hardcoded `/d*.png` and `/m*.png` images.
- **Admin control:** none.
- **Gaps:**
  - The images are illustrative, but the alt text implies a real view.
  - The DOM is duplicated.
  - The scroll runway is 300–430svh.
  - Reduced-motion users see only one frame.
- **Action:** REBUILD-IN-PLACE as "The Waterline Day".

### 14. Video hero and second hero
- **UI:** `VideoHero` and `HeroExperience`.
- **Data:** `/videos/*.mp4`.
- **Gaps:** two h1s, the 12 MB video is identical on mobile and desktop, and the poster is a raw `<img>`.
- **Action:** REFINE `VideoHero`. Merge the useful "Waterline" copy from `HeroExperience` into the page, then REMOVE `HeroExperience` from home. This is safe because it renders only on `/` and nothing else imports it. Verify with grep before deleting.

### 15. Intro loader
- **UI:** `SiteIntroLoader`.
- **Data:** sessionStorage.
- **Gaps:** blocks the page without JavaScript, blocks clicks for 1.85s, and covers the LCP.
- **Action:** REBUILD-IN-PLACE as a non-blocking loader.

### 16. Header, menu, booking dock
- **UI:** `SiteHeader`, `BookingSearch`.
- **Gaps:**
  - Colours are hardcoded hex values.
  - Tone detection calls `elementsFromPoint` on every frame.
  - There is no focus trap.
  - Two menu toggles exist.
- **Action:** REFINE.

### 17. Mobile action bar
- **UI:** `MobileActionBar` (not rendered).
- **Gap:** no persistent CTA anywhere except `/`.
- **Action:** REFINE and render it site-wide.

### 18. 360° virtual tour
- **UI:** `/virtual-tour`, `VirtualTourPreview`.
- **Data:** `data/virtualTour.ts`, `panoramaAssets.ts`.
- **Admin control:** none.
- **Depends on it:** room hotspots → `/book?room=`.
- **Gaps:**
  - The default scene is a demo.
  - The demo images have no licence.
  - Keyboard shortcuts are captured globally.
  - The viewer is rebuilt on every scene change.
  - Fullscreen does not work on iOS.
- **Action:** REFINE; ADD admin control and tiles.

### 19. AI concierge
- **UI:** `ConciergeLauncher`.
- **API:** `/api/concierge`.
- **Data:** `lib/concierge/*`, the booking store (availability and rates), Gemini (wording only).
- **Gaps:**
  - It is keyword-based and its quick prompts give wrong answers.
  - There is no memory, no tools, no rate limit and no streaming.
  - A prompt-injection path reaches price text.
- **Action:** REBUILD-IN-PLACE (Gemini, free tier, tool calling).

### 20. Plan my stay
- **UI:** `/plan-your-stay`.
- **Data:** `data/planner.ts`, `lib/planner/rules.ts`.
- **Gaps:** an unlabelled select, and its analytics events never fire.
- **Action:** PRESERVE; REFINE accessibility and analytics.

### 21. Arrival dashboard
- **UI:** `/arrival`.
- **Data:** `data/arrival.ts` (demo).
- **Gap:** it is not connected to real bookings.
- **Action:** PRESERVE; later link it through the reference + mobile lookup.

### 22. Reviews
- **UI:** `ReviewsSection`.
- **Data:** `lib/reviews/provider.ts` (Google Places), with `reviews.ts` (demo) as the fallback.
- **Admin control:** none.
- **Gaps:**
  - The fallback demo reviews are shown publicly.
  - Places needs GCP billing.
- **Action:** REFINE. Add a `testimonials` table with source attribution, and hide the section rather than show demo content.

### 23. Location and maps
- **UI:** `/location`, `LocationPreview`.
- **Data:** `data/nearby.ts`, the Maps embed env var.
- **Gaps:** no h1, and no coordinates.
- **Action:** REFINE.

### 24. Contact
- **UI:** `/contact`.
- **Data:** `hotel.ts`, the email env var.
- **Gap:** no form. This is fine: it is a deliberate decision.
- **Action:** PRESERVE; take data from the `property_facts` table.

### 25. Policies and FAQs
- **UI:** `/policies`, home and contact FAQs.
- **Data:** `policies.ts` (placeholder), `hospitality.ts` `homeFaqs`, `faq.ts` (stale and unused).
- **Admin control:** none.
- **Action:** REBUILD-IN-PLACE on top of a database; REMOVE `faq.ts` (it is unused and contradicts the current booking flow).

### 26. SEO and structured data
- **Where:** `lib/seo/schema.ts`, `sitemap.ts`, `robots.ts`, layout metadata.
- **Gaps:**
  - `example.com` is used as a fallback URL.
  - Page titles are doubled.
  - Structured data is missing key fields.
  - Hotel structured data appears on `/` only.
- **Action:** REFINE.

### 27. Analytics
- **Where:** `AnalyticsBridge`, `lib/analytics/track.ts`.
- **Gaps:** 8 events are declared but never fired, and there is no consent handling.
- **Action:** REFINE.

### 28. Rate limiting
- **Where:** `lib/security/rateLimit.ts`.
- **Data:** in memory.
- **Gaps:** it does not work across instances, the IP header can be spoofed, and some routes have no limit.
- **Action:** REBUILD-IN-PLACE on Postgres.

### 29. Email, maps, analytics and AI integrations
- **Gaps:**
  - The unused `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Unused env vars: `TEJJORA_AI_API_KEY`, `PMS_*`, `FLIGHT_API_KEY`.
- **Action:** Document them; REMOVE the unused ones from `.env.example` once confirmed.

### 30. Validation scripts
- **Where:** `scripts/validate-*.mjs` (17 scripts).
- **Gap:** they are static checks, not runtime tests.
- **Action:** PRESERVE; ADD runtime tests for booking, payment and lookup.

## Dependency notes before changing core features

### Room ids (`deluxe`, `super-deluxe`, `premium`)
These ids are used in several places:
- the `room_types` foreign key;
- the `booking_operations.config` keys;
- the `inventory_blocks` table;
- the 360 tour hotspots (`/book?room=`);
- anchors on `/rooms`;
- the `INVENTORY_*` env vars;
- the concierge.

**Never rename them.** Add a separate `slug` only if the URLs need to change.

### `withBookingStore` / `readBookingStore`
This is the single entry point for all booking and admin writes. Any change to the database must keep this contract, or migrate every caller in one step:
- `reservations.ts`
- `admin/operations.ts`
- `inventory.ts`
- the email modules
- the webhook

### Reference format
The format is validated in `validation.ts`, `access.ts` and the admin search, and it appears in emails. New references must widen the regex rather than replace it.

### Access tokens
Tokens are stored in sessionStorage under `BookingExperience.tsx:32-35`, with hashes in `access_token_hash` (5 rolling). Payment retry in `ManageBooking` depends on them.

### Analytics event names
Downstream GA reports may depend on the existing event names. Keep them, and only add new ones.

### Window event `tejjora:concierge-open`
Other components dispatch this event to open the concierge. Keep it.
