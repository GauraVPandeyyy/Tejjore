# Tejjora Lake View — Current State Audit

Audit date: 2026-10-04 · Branch: `fix/booking-flow-and-review-fixes` @ `4534f15` · Method: read-only code trace, no source changes.

Companion documents:
- `TEJJORA_REDESIGN_MASTERPLAN.md`: the plan.
- `TEJJORA_PAGE_INVENTORY.md`: routes.
- `TEJJORA_FEATURE_INVENTORY.md`: features.
- `TEJJORA_CONTENT_SOURCE_LEDGER.md`: facts and media.
- `TEJJORA_QA_MATRIX.md`: tests.

> Severity key: **C** = critical (money, security, truthfulness), **H** = high, **M** = medium, **L** = low.

## 0. Inputs and limits of this audit

| Input | Status |
|---|---|
| `reference/current-tejjora`, `nilsamsee`, `flyward`, `hotel-photos`, `panorama`, `menu` | **Do not exist** anywhere in the repo or sibling folders |
| `Menu Veg.pdf` | Found at `C:\Users\Praib\Downloads\Menu Veg.pdf` (111 MB, 9 pages). The text is stored as vector outlines, not real text, so it was read visually. Transcribed in the ledger. |
| Google Drive photo folder | Reachable. 27 photos, each as a JPG + ARW pair, named `DSC065xx`/`DSC067xx`. They match the DSC sets in `docs/ASSET-MANIFEST.md`, which are already converted into `public/images/**` |
| Reference sites | Structure inspected via fetch. No assets or code copied. |
| Public listings | Tripadvisor (matches code), Trip.com and EaseMyTrip ("The Byke Boutique Tejjora", which conflicts). See the ledger. |
| Runtime | Not run in this phase. `.env.local` points at a live Supabase DB, Brevo and Razorpay test, so runtime tests need those services blanked first. |

## 1. Framework and versions

| Package | Version | Notes |
|---|---|---|
| next | 16.3.5 | App Router. Async `searchParams` (`book/page.tsx:13,41`). `AGENTS.md` requires reading `node_modules/next/dist/docs` before using Next APIs. |
| react / react-dom | 19.3.0 | |
| tailwindcss | 4.3.3 | `@tailwindcss/postcss`, no config file, `@theme inline` in `globals.css:48-61` |
| motion | 13.4.3 | Used only in `SiteHeader` and `BookingSearch` |
| marzipano | 0.10.2 | Dynamic import in `MarzipanoViewer.tsx:61` |
| pg | 8.16.3 | Direct Postgres (Supabase host). No Supabase SDK. |
| gsap, @fontsource/{cinzel, cormorant-garamond, lora} | — | **Installed but never imported** |

There is no `middleware.ts`/`proxy.ts`, no `error.tsx`, `not-found.tsx`, `loading.tsx` or `opengraph-image`. `next.config.ts` sets only AVIF/WebP image formats, `poweredByHeader:false` and `reactStrictMode`.

## 2. Routing and page architecture

Every page is wrapped by `SiteShell.tsx:9-19`. In order, it renders:
1. `SiteChromeProvider`
2. `AnalyticsBridge`
3. `SkipLink`
4. `SiteHeader`
5. `<div id="main-content">`
6. `SiteFooter`
7. `ConciergeLauncher`

The full route list is in `TEJJORA_PAGE_INVENTORY.md`. Key issues:
- **H — two heroes on `/`.** `VideoHero` (h1 at `VideoHero.tsx:85`) is immediately followed by `HeroExperience` (h1 at `HeroExperience.tsx:109`). That gives two h1s and two full-height openings.
- **M — `/location` has no h1.** Its top heading is an h2 (`LocationExperience.tsx:55`).
- **M — doubled titles.** Pages set titles that already contain "| Tejjora Lake View", and the layout template appends it again, e.g. `gallery/page.tsx:6`, plus rooms, dining, contact, book, location, plan-your-stay and policies.
- **M — `/offers` redirects to `/experience`** (`offers/page.tsx:4`), which leaves `OffersPage.tsx` orphaned.
- **M — broken anchors.**
  - `/experience#restaurant` is referenced at `ExperienceGateway.tsx:12` and `ArrivalDashboard.tsx:288`.
  - `#restaurant` and `#gallery` are referenced at `ExperiencePageHero.tsx:14-15`.
  - None of these ids exist on `/experience`.
- **L — no per-room route.** Rooms are only anchors on one page (`/rooms#deluxe`).

## 3. Reusable components

**Used:**
- Layout: `SiteHeader` (motion menu), `SiteFooter`, `SiteIntroLoader`
- Booking: `BookingSearch` (home dock), `BookingExperience`, `BookingSummary`, `BookingProgress`, `ManageBooking`
- Rooms: `RoomsCollection`, `RoomGallery`, `RoomComparison`
- Experience: `TerraceExperience`, `DayAtTejjora`, `WhyTejjora`, `LocalExperiences`
- Other: `GalleryExperience`, `DiningPage`, `RestaurantExperience`, `LocationExperience`, `GoogleMapExperience`, `PlanMyStay`, `ArrivalDashboard`, the virtual-tour set, `ReviewsSection`, `StructuredData`, `ConciergeLauncher`, `AdminDashboard`

**Unused, with no import anywhere:**
- `layout/MobileActionBar`
- `hotel/ExperienceGateway`
- `rooms/RoomShowcase`
- `offers/OffersPage` (its route redirects)
- `layout/Wordmark`
- `shared/Button`
- `shared/MediaPlaceholder`

**Duplicated:**
- **`DiningPage` vs `RestaurantExperience`.** Same headline ("Come for breakfast. Stay for the table." is an h1 on `/dining` and an h2 on home), same facts block, same WhatsApp URL.
- **`VideoHero` vs `HeroExperience`.**
- **`TerraceExperience` renders separate desktop and mobile DOM trees.** That means 8 images, 2 `priority` images, 2 h2s and 2 `aria-live` regions.

## 4–8. Design system, fonts, colours, CSS architecture, animation

- **Fonts** (`layout.tsx:6-18`):
  - Instrument Serif, which ships **weight 400 only**. `SiteHeader.tsx:311` asks for `font-extralight`, which therefore cannot render.
  - Manrope, variable weight.
  - Both are loaded via `next/font/google`.
  - The original `:root` (`globals.css:16-18`) names "Sentient" and "Satoshi", which are never loaded; they are overridden later at `globals.css:13985`.
  - `font-[var(--font-display)]` is ambiguous in Tailwind v4: it can be read as a font weight. The safe form is `font-(family-name:--font-display)`.
- **Colour (M):** three competing palettes.
  - `globals.css:3-46`: ink, ivory, lake-deep `#002e36`, sand, brass, brand-orange `#ff6437`.
  - `redesign.css:4-11`: `--redesign-ink #082f35`, `--redesign-accent #e36c3d`.
  - Hard-coded hex values in `SiteHeader.tsx:15-18` and `BookingSearch`: `#0D344A`, `#9FBED2`, `#F8F5ED`.
  - The logo actually uses deep teal ≈`#022D36`, cream ≈`#FBF3CF`, ember ≈`#FF6437` and sand ≈`#D9A47A`.
- **CSS architecture (H):**
  - `globals.css` is **15,951 lines** of stacked "Stage" layers: Stage 2 at line 333, through Stage 12.10 at 10840, then V2 at 11935 and V3 at about 13979.
  - Selectors are redefined many times. `.hero-experience` appears 8 times. `.terrace-scroll__desktop` is `height:430svh` at l.1979 and `min-height:300svh` at l.13505.
  - Dead blocks: `.site-header*` (the header now uses Tailwind) and `.mobile-action-bar`.
  - There are about 20 distinct max-width breakpoints and 18 reduced-motion blocks.
  - `redesign.css:40-57,147-160` adds 4.5–8rem padding plus a hairline to **every** home `section`, which includes the 100dvh video hero and the sticky terrace.
  - `body::before` (`globals.css:10861-10882`) is a fixed full-viewport grain layer with `mix-blend-mode:multiply` at z-index 999. It costs paint time on mobile.
- **Animation:**
  - Hand-written `requestAnimationFrame` scroll scrubbers in `HeroExperience.tsx:29-80` and `TerraceExperience`.
  - `SiteHeader.tsx:180-220` calls `elementsFromPoint` on every scroll frame to decide the header tone.
  - With reduced motion, the scrubbers pin progress to 0, so reduced-motion users only ever see "Morning", yet the 300–430svh scroll runway remains.
- **Loader (C/H)** — `SiteIntroLoader.tsx`:
  - `useState(true)` (l.7) means the overlay is **server-rendered visible** at z-index 99999 (`globals.css:15577`).
  - It is removed only after hydration (fade at 1250ms, unmount at 1850ms).
  - **Without JavaScript, or if hydration fails, the page stays covered.**
  - Repeat visitors in the same session see a flash. Clicks are blocked for about 1.85s.
  - Reduced motion stops the keyframes but not the timers.

## 9–11. Images, media, responsive behaviour

- `next/image` is used with sensible `sizes` almost everywhere.
- No `placeholder="blur"` anywhere.
- `priority` is set on 7+ images.
- **H — duplicate hero videos.** `public/videos/tejjora-hero-desktop.mp4` and `-mobile.mp4` are **byte-identical** (md5 `c44caecc…`, 12.26 MB), so phones download the full 12 MB. The poster is a raw `<img>`.
- **C — terrace images.** The terrace sequence hard-codes `/d1-d4.png` and `/m1-m4.png` (2.5–2.9 MB PNGs each, `TerraceExperience.tsx:12-14`).
  - They appear to be AI-rendered or illustrative scenes, not photography.
  - `/d3.png` is also the `/experience` hero, with alt text "Tejjora terrace and lake view at sunset" (`ExperiencePageHero.tsx:20`). That presents illustrative media as a real view.
  - `docs/ASSET-MANIFEST.md:52-58` still lists terrace media as missing.
- **Identical files:**
  - `public/brand/tejjora-logo.png` and `tejjora-mark.png` (md5 `eba37b3b…`, 410 KB each).
  - `public/images/video-poster-mobile.jpg` and `public/images/hero/video-poster-mobile.jpg`, neither of which is referenced.
- **Placeholder SVG gradients** (about 550 B each) are used in `DayAtTejjora` (breakfast, terrace-evening), in `WhyTejjora` (terrace-day), and as the lake-view tour fallback.
- **Responsive:**
  - Desktop-first CSS with about 20 breakpoints, while the header uses Tailwind `lg:` (1024px). Tablets at 768–1023px get mixed states.
  - Mobile home has about 2,000svh of scroll runway.
  - `MobileActionBar` is not rendered, so only `/` has a persistent booking dock.

## 12. Database architecture

Source: `db/migrations/001_booking_core.sql`.

| Table | Used | Notes |
|---|---|---|
| `room_types` | FK target only | Never read or written by app code |
| `reservations` | Yes | Dates and timestamps are stored as **TEXT**. Guest PII is in plaintext JSONB. No CHECK constraint on status. Indexes exist but are unused, because the code always runs `SELECT *` (`postgres.ts:92`). |
| `inventory_blocks` | Yes | Fully deleted and re-inserted on every change (`postgres.ts:193-201`) |
| `booking_operations` | Yes | Single JSON config row (rates, inventory, overrides) |
| `processed_webhooks` | Yes | Up to 2,000 rows rewritten on every change |

- **Whole-store pattern.** `withPostgresBookingStore` (`postgres.ts:234-253`) runs `BEGIN`, then `pg_advisory_xact_lock(84322129)`, then loads **all** rows, mutates them in JS, and writes the diff.
- **Consistency:** correct.
- **Scalability (H):** every request is O(all bookings), and all writes across the app are serialised. Razorpay HTTP calls happen while the lock is held (`payments/order`).
- **Double-booking protection:** relies only on the app lock. There is no DB constraint.
- **Migrations:** one idempotent file, no tracking table. The `db-migrate`/`db-seed` scripts do not load `.env.local`.
- **DB SSL (M):** `rejectUnauthorized:false` (`postgres.ts:22`) disables certificate verification.
- **Store selection:** if `DATABASE_URL` is unset in development, a JSON file store at `.data/tejjora-booking-store.json` is used (`store.ts:124-138`).

## 13. API and server architecture

All routes live under `src/app/api/**/route.ts`. Plain `NextResponse.json` with hand-written validation (no zod).

| Route | Purpose | Rate limit |
|---|---|---|
| `POST /api/availability` | `searchAvailability` → per-room available count and nightly rates (the exact count is public) | 60/10min |
| `POST /api/reservations` | Creates a 15-minute hold | 5/15min |
| `POST /api/booking-request` | **Duplicate** of `/api/reservations` with a separate bucket, which doubles the hold quota. The UI does not call it (`providers.ts:35`). | 5/15min |
| `POST /api/reservations/retrieve` | Lookup by reference + email + phone | 8/15min |
| `GET/POST /api/reservations/status` | Bearer access token | 60/15min |
| `POST /api/payments/order` | Razorpay order | 12/15min |
| `POST /api/payments/verify` | Checks the HMAC from the browser checkout | 15/15min |
| `POST /api/payments/webhook` | HMAC + idempotency | none |
| `POST /api/concierge` | Rules engine plus optional Gemini rewording | **none** |
| `/api/admin/*` | Overview, reservation patch, room rates and inventory, overrides, blocks, login and logout | login only (8/15min) |

## 14. Authentication

`src/lib/admin/auth.ts`:
- **Users.** `ADMIN_USERS_JSON` with scrypt hashes, **or** a legacy plain-text `ADMIN_USER_ID`/`ADMIN_PASSWORD` compared timing-safely. **`.env.local` uses the plain-text path (H).**
- **Session.** A stateless HMAC-SHA256 cookie `tejjora_admin_session`: httpOnly, SameSite=Lax, Secure in production, 8-hour lifetime. The secret must be at least 32 characters.
- **No server-side revocation.** Logout only clears the cookie.
- **CSRF.** An Origin==Host check, skipped when the Origin header is absent (L199-219).
- **Brute force.** Login is limited per IP in an in-memory map. There is no per-account lockout. Unknown users get dummy scrypt work so timing doesn't reveal which accounts exist (good).
- **No roles.** Every admin can do everything.

## 15. Admin panel

`AdminDashboard.tsx` has four tabs:
- **Today:** 6 metrics, arrivals and departures.
- **Reservations:** search and filter, detail view, status change (confirm, cancel, complete), staff notes.
- **Availability & Rates:**
  - per-room base rate and inventory;
  - room blocks and date overrides;
  - a 7-day grid, although the API returns 14 days;
  - block and override lists are **capped at 20**, so later entries cannot be removed from the UI;
  - remove errors are silently ignored.
- **Payments:** totals and the 30 most recent payments.

**Cannot do:**
- refund (`razorpay.refund()` exists but is unused);
- edit a booking's dates, room or guest details;
- resend emails, export CSV, manage staff, or view an audit trail;
- edit rate plans, add-ons, promos or tax (env only);
- edit **any content**: rooms, photos, offers, menu, gallery, FAQs, policies, SEO, tour, AI knowledge.

**H — overview dump.** `GET /api/admin/overview` returns **every reservation, unpaginated**, with full PII and `accessTokenHash` (`lib/admin/operations.ts:48-81`).

## 16–19. Booking system, statuses, rooms, inventory

**Flow**, traced in `src/lib/booking/*`:
1. `BookingSearch` → `/book?checkIn&checkOut&adults&children`.
2. `/api/availability`.
3. Client price preview (display only).
4. `/api/reservations`. Inside the lock it:
   - caps active holds at 2 per email or phone;
   - checks capacity per night;
   - **re-prices on the server**;
   - sets `status=payment_pending`, `expiresAt=now+15m`, and a hashed 32-byte access token (`reservations.ts:52-94`).
5. Brevo "received" email.
6. `/api/payments/order`. Creates the Razorpay order and extends the hold by 15 minutes.
7. `/api/payments/verify`. HMAC check, then `settleVerifiedPayment`.
8. `/api/payments/webhook`.
9. Confirmation email. The send is claimed inside the lock, with a 5-minute stale window.

**Statuses** (`types/booking.ts:4-6`):
- Reservation: `initiated | payment_pending | payment_review | confirmed | payment_failed | cancelled | completed`.
- Payment: `not_started | pending | paid | failed | refunded`.
- **Never assigned:** `initiated`, `payment_failed`, `refunded`.
- **Expiry is never persisted.** Expired holds simply stop counting (`capacity.ts:11-16`), and there is no cleanup job.

**Reference.** `TLV-YYMMDD-XXXXXX`: the first 6 hex characters of a UUID (`reservations.ts:26`), which is **24 bits per day**. The validation regex allows `[A-Z0-9]`.

**Validation** (`validation.ts`):
- Check-in must be today or later in Asia/Kolkata. Maximum 30 nights. At most 365 days ahead.
- Adults 1–12, children 0–8, rooms 1–6, and rooms ≤ adults.
- **No per-room occupancy limit**, because every `maxGuests` is null. **12 adults can book 1 room.**
- The client caps adults at 6 and children at 4 (`BookingSearch.tsx:154`), which does not match the server.

**Defects:**
- **C — Webhook disabled.** `RAZORPAY_WEBHOOK_SECRET` is empty in `.env.local` (length 0), so every webhook returns 401. A booking is only confirmed if the guest's browser reaches `/verify`.
- **H — Verify race.**
  - `verify/route.ts:24` reads the reservation **outside** the lock.
  - Inside the lock, `applyVerifiedPaymentToStore` (`reservations.ts:133-156`) short-circuits only on `confirmed+paid`.
  - So if a webhook has meanwhile set `payment_review` (for example because of an amount mismatch), verify flips it back to `confirmed` and sets `amountPaid=grandTotal`.
- **H — Webhook overwrites the amount paid.** On the mismatched-order branch (`webhook/route.ts:71`), `amountPaid` is **overwritten**, so a second payment hides the first.
- **M — Lookups write to the DB.** Each successful lookup appends an access token, keeping a rolling 5 (`reservations.ts:101-111`). It also bumps `updatedAt`, which skews the admin "confirmedToday" figure and the email stale-claim timer.
- **M — Phone matching.** Phones are normalised to digits only, with no +91 handling (`access.ts:39-41`).

**Rooms:**
- The catalogue is hard-coded in `src/data/rooms.ts` (Deluxe, Super Deluxe, Premium). `maxGuests`, `bedType`, `sizeSqFt` and `view` are all null.
- Base rates come from DB config, falling back to `commerce.ts:142-146` (2000, 2500, 3500).
- Inventory comes from DB config, then the `INVENTORY_*` env vars, then development defaults of 10/10/9, or 0 in production.

## 20–22. Offers, pricing, gallery

- **Offers:** `data/offers.ts` is flagged demo (`demo:true`). There is no DB table and no admin control. The route redirects.
- **Pricing:**
  - Only the `room-only` plan is bookable.
  - Breakfast, Flexible and Non-refundable plans and all 7 add-ons have `null` prices.
  - Tax and service charge default to 0.
  - Promo codes come from the server-only env var `PROMO_CODES_JSON`.
  - `hotel.indicativeStartingRate=2750` contradicts the 2000 Deluxe rate and is unused.
- **Gallery** (`GalleryExperience.tsx`):
  - 22 real property images.
  - Filter buttons have no `aria-pressed`.
  - Native `<dialog>` lightbox with Esc, backdrop click and previous/next buttons. **No arrow keys or swipe.**

## 23. Restaurant and menu

- `data/restaurant.ts`: `timings`, `menuUrl` and `phone` are all `null`; `publicBrandNameConfirmed:false`.
- **No menu items exist in code.** The demo menu was removed in V3.
- The real menu (PDF) is transcribed in the ledger. It is a **"Room Menu"** containing 90 items in 12 sections, plus operating notes:
  - last order 10:30 pm;
  - 30–40 minute preparation time;
  - no cancellation once placed;
  - 5% service charge excluded;
  - taxes as applicable.
- Structured data says `servesCuisine: "Restaurant dining"` (`schema.ts:35`), which is a placeholder.

## 24. AI concierge

**C/H overall.** The concierge is a keyword router, not an assistant.
- `/api/concierge` accepts at most 12 messages of at most 800 characters each. It reads **only the last guest message** (`hybridProvider.ts:149`).
- The hybrid provider pulls dates out of the text, then sets intent flags with `.includes()`.
  - Live data is used only for availability and rates, via `searchAvailability` and `effectiveRoomRate`.
  - Everything else comes from `knowledge.ts`.
- **Gemini is used for rewording only** (`languageLayer.ts`). It needs `CONCIERGE_LANGUAGE_PROVIDER=gemini` plus a key and model from env, and calls REST `generateContent` with `temperature 0.2` and 350 tokens.
  - **No timeout.**
  - **The guest's raw text goes into the prompt, and the rewrite runs on live price replies.** Nothing checks afterwards that the numbers survived.
- **Substring-matching bugs.** `containsAny` is `text.includes(word)` (`knowledge.ts:45-47`):
  - The quick prompt "Compare the three room categories" returns the **pet policy**, because "cat" matches inside "categories" (`knowledge.ts:68`).
  - "How do I get to Tejjora Lake View?" returns the **lake disclaimer**, because "lake" matches at `knowledge.ts:135` before the location rule.
  - Also: "location" and "vacation" → pet; "small" → mall; "comfortable" → table; "ideal" → deal; "review" → view; "training" → train.
- **No memory**, so follow-ups lose their dates. No tool calling, no booking status, no menu, no streaming, no cards. `asOf` is never shown.
- **Dates.** No "tomorrow", "this weekend", "Oct 10" (month-first), ordinals or ranges. The parser uses UTC "today", while validation uses India time.
- **No rate limit**, so Gemini usage can be abused.

## 25–27. SEO, structured data, sitemap

- `metadataBase`, schema, sitemap and robots all fall back to **`https://example.com`** when `NEXT_PUBLIC_SITE_URL` is unset (`layout.tsx:20`, `schema.ts:4`, `sitemap.ts:4`, `robots.ts:4`).
- Every page shares the root OG title and image.
- **Schema** (`lib/seo/schema.ts`):
  - `Hotel`: name in uppercase, address without "Gomti Nagar", 4 amenities. No `geo`, `image`, `priceRange`, `numberOfRooms`, `checkinTime`, `sameAs` or `hasMap`.
  - `Restaurant`: placeholder cuisine.
  - `FAQPage`: only on `/`.
- **Sitemap:** 11 static routes, no `lastModified`.
- **Robots:** disallows `/admin`, `/arrival`, `/manage-booking` and `/api/`.
- **Section numbering** is inconsistent on home ("06" appears twice).

## 28. Analytics

- GA4 via gtag, only when `NEXT_PUBLIC_GA_ID` is set.
- `track()` sends a CustomEvent, which `AnalyticsBridge` forwards.
- **Never fired:** `hero_check_dates`, `room_view`, `room_compare`, `virtual_tour_*`, `restaurant_enquiry`, `plan_my_stay_*`, `rate_selected`.
- Call and WhatsApp clicks are untracked outside `/arrival`.
- No consent handling.

## 29–30. Contact, forms, maps

- No contact form. Contact is by phone, WhatsApp and Maps links.
- The email comes only from `NEXT_PUBLIC_HOTEL_EMAIL`.
- Google Maps Embed uses `NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID`.
- `data/nearby.ts` holds place names and Maps queries, with **no distances**, deliberately.

## 31–33. Caching, loading states, error handling

- **Caching.** Reviews use an in-memory 1-hour cache. There is no data cache because content is static TS. The admin page is `force-dynamic`.
- **No route-level loading or error boundaries.** The booking UI handles loading and errors inline.
- **Error leakage (M).** Raw `error.message` is returned by `payments/order/route.ts:76` and by all admin routes. `store.ts:52` embeds the underlying error text.

## 34. Security

| # | Sev | Finding |
|---|---|---|
| S1 | C | Webhook secret empty, so webhook verification always fails |
| S2 | H | Admin uses a plain-text password in env; no roles; no session revocation; CSRF check skipped when Origin is absent |
| S3 | H | No security headers: CSP, HSTS, X-Frame-Options/`frame-ancestors`, Referrer-Policy. Admin can be framed. |
| S4 | H | Rate limiter is an in-memory, per-instance `Map` (`rateLimit.ts`). The IP comes from `x-real-ip`, falling back to the last `x-forwarded-for` entry, which can be spoofed if the host does not overwrite it. Concierge, webhook and admin APIs have no limit. |
| S5 | H | Admin overview dumps all PII and token hashes |
| S6 | H | Verify/webhook race and `amountPaid` overwrite (see §16) |
| S7 | M | DB SSL with `rejectUnauthorized:false` |
| S8 | M | Public POST routes accept `text/plain` bodies, so a cross-site "simple request" can create holds |
| S9 | M | Raw error messages returned to clients |
| S10 | M | Prompt injection can reach the Gemini rewording of price text; no check that numbers survive |
| S11 | M | `PAYMENT_TEST_MODE=true` on any non-production `NODE_ENV` deployment would allow free confirmation (currently false) |
| S12 | L | 24-bit reference suffix. Lookup also requires email and phone, so enumeration risk is currently low, but it becomes material once lookup is reference + mobile only. |
| S13 | L | No audit log; admin actions are not attributed to a person |

No SQL injection was found: every query is parameterised. Webhook HMAC and verify HMAC are timing-safe.

## 35. Accessibility

- **Skip link:** present, but the target has no `tabIndex=-1`.
- **Focus:** global `:focus-visible`.
- **Menu dialog:** `role=dialog`, `aria-modal` and Esc, but **no focus trap or focus return**. Two menu toggles exist on home (header and booking dock).
- **Concierge:** not a dialog, no focus trap, no focus return. The typing indicator uses `aria-label` on a plain div, so it is not announced.
- **Tab patterns:** `RestaurantExperience` and the unused `RoomShowcase` declare `role=tab` with no arrow keys or `aria-controls`.
- **Missing `aria-pressed`:** gallery filters, `WhyTejjora`, `PlanMyStay` choices.
- **Labels:** the `PlanMyStay` arrival `<select>` is unlabelled (`PlanMyStay.tsx:72-73`).
- **Alt text:** `HomeGalleryPreview` uses identical alt text on 5 images (`HomeStoryBlocks.tsx:146`).
- **Keyboard capture (H):** `MarzipanoViewer.tsx:124-134` registers a window `keydown` handler **with no dependency array**, so it is re-registered on every render. It captures arrow, `+`, `-` and `0` page-wide, including in text inputs.
- **Reduced motion:** terrace users see one frame only. Video is not paused.

## 36. Performance

- 12 MB hero video served to phones.
- 2.5–2.9 MB PNG sources for the terrace (optimised by `next/image`, but heavy at the origin).
- A 1.5 MB `TejAI.png` used as a launcher icon.
- A full-viewport blend-mode grain layer.
- `elementsFromPoint` on every scroll frame.
- A blocking loader.
- 16k lines of CSS shipped globally.
- Duplicate terrace DOM trees.

## 37. Migrations

One file, `001_booking_core.sql`, which is idempotent. There is no migration ledger. The seed creates room types only (no fake bookings).

## 38–39. Environment variables and third parties

**Present in `.env.local`** (names only):
- Analytics and maps: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID`.
- Supabase: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which **no code uses**.
- Database: `DATABASE_URL` (Supabase), `DATABASE_SSL`, `DATABASE_POOL_MAX`.
- Booking: `BOOKING_STORE_PATH`, `BOOKING_MODE`, `BOOKING_PRODUCTION_READY`.
- Payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (**empty**), `PAYMENT_TEST_MODE`.
- Pricing: `NEXT_PUBLIC_TAX_*`, `NEXT_PUBLIC_SERVICE_CHARGE_*`.
- Admin: `ADMIN_USER_ID`, `ADMIN_USER_NAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_ALLOW_MANUAL_CONFIRM`.
- Concierge: `CONCIERGE_PROVIDER`, `CONCIERGE_LANGUAGE_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_CONCIERGE_MODEL`.
- Email: `BREVO_API_KEY`, `BOOKING_EMAIL_FROM`, `BOOKING_EMAIL_FROM_NAME`, `BOOKING_EMAIL_REPLY_TO`.

**Only in `.env.example`:**
- Reviews: `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` (without them, reviews fall back to demo).
- Inventory and admin: `INVENTORY_*`, `ADMIN_USERS_JSON`.
- Pricing: `PROMO_CODES_JSON`, `NEXT_PUBLIC_RATE_PLAN_CONFIG_JSON`, `NEXT_PUBLIC_ADDON_CONFIG_JSON`, the extra-guest pricing vars.
- Site: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_HOTEL_EMAIL`.

**Declared but unused:** `TEJJORA_AI_API_KEY`, `PMS_API_URL`, `PMS_API_KEY`, `PAYMENT_PROVIDER_KEY`, `FLIGHT_API_KEY`.

**Services in use:**
- Supabase Postgres (via `pg`)
- Razorpay
- Brevo
- GA4
- Google Maps Embed
- Google Places API (New), optional
- Gemini, optional
- WhatsApp `wa.me` links

## 40. Unfinished and duplicate implementations

**Duplicates:**
- `/api/booking-request` repeats `/api/reservations`.
- Stay-date iteration is implemented 5 times.
- Capacity counting is implemented 3 times.
- `calculateNights` exists twice, once in UTC and once in local time.
- There are two `PaymentProvider` interfaces.
- `loadRazorpay` is duplicated.
- Amenities are defined 5 times with different wording.
- There are two FAQ sources, and `faq.ts` is stale and unused.

**Dead code:** `razorpayPaymentProvider.refund`, `buildWhatsAppBookingMessage`, every interface in `provider-types.ts`, `unlinkedArrivalStayProvider`, and the fields `companyName`/`gstNumber`.

**UI without a backend:**
- The `payment_failed` admin filter, a status that is never set.
- The offers page.
- The arrival dashboard (demo data via `?demo=1`).

**Backend without UI:**
- Refunds.
- Blocks and overrides beyond the first 20.
- Days 8–14 of the inventory grid.

**Stale docs:**
- `TERRACE-SEQUENCE.md:35-36`
- `ASSET-MANIFEST.md:52-58`
- `MANUAL-SETUP-AND-APIS.md` §7 (describes the JSON store)
- `README` :213 and :330
- `STAGE-12-FINAL-AUDIT.md:166`, which names the wrong promo env var

## Severity summary

**Critical:**
- S1, the webhook.
- Terrace and illustrative media presented as real.
- The loader blocks without JavaScript.
- Concierge misanswers its own quick prompts.

**High:**
- Admin authentication and roles.
- Security headers.
- Rate limiter.
- PII dump.
- Payment race and overwrite.
- Two h1s and two heroes.
- The 12 MB mobile video.
- The whole-store DB pattern.
- CSS sprawl.
- The tour's global key capture.
- The default demo tour scene.

**Medium and low:** all the remaining items listed above.
