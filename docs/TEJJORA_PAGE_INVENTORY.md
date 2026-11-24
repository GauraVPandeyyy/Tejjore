# Tejjora Lake View — Page Inventory

As of commit `4534f15` (2026-10-04).

**Actions** use these tags:
- **PRESERVE**: keep as is.
- **REFINE**: improve in place.
- **REBUILD-IN-PLACE**: same route and purpose, new internals.
- **ADD**: new.
- **REMOVE**: only when it is proven obsolete.

**Every public page** is wrapped by `SiteShell`, which renders the header, footer and concierge launcher. The concierge is hidden on `/admin`.

## Current routes

### `/` (Home)

- **File:** `src/app/page.tsx`
- **Render:** server, with client islands.
- **Metadata:** title, description and canonical `/`.
- **h1:** two (bug): `VideoHero.tsx:85` and `HeroExperience.tsx:109`.
- **Index:** yes.
- **Planned action:** REBUILD-IN-PLACE.

Component tree, in render order:
1. `SiteIntroLoader`
2. `StructuredData` (Hotel and FAQ)
3. `BookingSearch` (fixed dock)
4. `VideoHero`
5. `HeroExperience`
6. `HotelStory`
7. `HomeRoomPreview`
8. `HomeStayReasons`
9. `RestaurantExperience`
10. `HomeAmenities`
11. `TerraceExperience`
12. `HomeExperiencesPreview`
13. `HomeGalleryPreview`
14. `ReviewsSection`
15. `LocationPreview`
16. `HomeFaqPreview`
17. `FinalInvitation`

### `/rooms`

- **File:** `rooms/page.tsx`
- **Metadata:** title (doubled suffix), description, canonical.
- **h1:** one, in the `RoomsCollection` hero.
- **Index:** yes.
- **Planned action:** REBUILD-IN-PLACE as an index of rooms, plus ADD `/rooms/[slug]`.

Component tree: `RoomsCollection`, made up of:
- a hero
- 3 room "chapters", each with a `RoomGallery`
- an inclusions block
- `RoomComparison`
- a CTA

### `/dining`

- **File:** `dining/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** one, "Come for breakfast. Stay for the table."
- **Index:** yes.
- **Planned action:** REBUILD-IN-PLACE, plus ADD `/dining/menu`.

Component tree:
1. `StructuredData` (Restaurant)
2. `DiningPage`: hero, editorial copy, a grid of 6 images, a facts block, and a WhatsApp CTA

### `/experience`

- **File:** `experience/page.tsx`
- **Metadata:** canonical.
- **h1:** one, in `ExperiencePageHero` (uses the `/d3.png` image).
- **Index:** yes.
- **Planned action:** REFINE. Fix the alt text and the broken anchors `#restaurant` and `#gallery`.

Component tree, in order:
1. `ExperiencePageHero`
2. `DayAtTejjora`
3. `HomeStayReasons`
4. `LocalExperiences`
5. `WhyTejjora`
6. `VirtualTourPreview`
7. `DirectStayBanner`

### `/gallery`

- **File:** `gallery/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** one, inline.
- **Index:** yes.
- **Planned action:** REFINE. Add keyboard and swipe navigation, `aria-pressed`, and media from the database.

Component tree: an inline hero, then `GalleryExperience`, which has filters, a grid of 22 items, and a `<dialog>` lightbox.

### `/location`

- **File:** `location/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** **none** (bug).
- **Index:** yes.
- **Planned action:** REFINE. Add an h1, LocalBusiness map link and NAP (name, address, phone).

Component tree: `LocationExperience`, which contains `GoogleMapExperience`, followed by `DirectStayBanner`.

### `/plan-your-stay`

- **File:** `plan-your-stay/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** one.
- **Index:** yes.
- **Planned action:** PRESERVE and REFINE. Label the select, add `aria-pressed`, and fire the `plan_my_stay_*` events.

Component tree: `PlanMyStay`, a client component using rules from `lib/planner/rules.ts`.

### `/book`

- **File:** `book/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** one.
- **Index:** yes. Consider noindex for URLs with query parameters.
- **Planned action:** REFINE, as described in the masterplan's booking section.

Component tree: `BookingExperience`, using `BookingProgress` and `BookingSummary`. It is a client component that reads its search parameters.

### `/contact`

- **File:** `contact/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** one.
- **Index:** yes.
- **Planned action:** REFINE. Take contact details from the `property_facts` table and add FAQ structured data where FAQs are shown.

Component tree: `ContactPage`, which has a reception photo hero, phone, WhatsApp and maps links, and FAQs.

### `/policies`

- **File:** `policies/page.tsx`
- **Metadata:** title (doubled), canonical.
- **h1:** one.
- **Index:** yes.
- **Planned action:** REBUILD-IN-PLACE, with policies stored in the database and approved by the hotel.

Component tree: inline policies from `data/policies.ts`, which is placeholder text.

### `/virtual-tour`

- **File:** `virtual-tour/page.tsx`
- **Metadata:** "Virtual Tour", canonical.
- **h1:** one, at `VirtualTourExperience.tsx:37`.
- **Index:** yes.
- **Planned action:** REFINE. Change the default scene, fix the keyboard capture, and move scenes to the database.

Component tree: `VirtualTourExperience`, made up of `MarzipanoViewer`, `TourControls` and `TourSceneRail`. `PanoramaDemoLab` appears only when `?demo360=1` is set and the build is not production.

### `/manage-booking`

- **File:** `manage-booking/page.tsx`
- **h1:** one.
- **Index:** noindex.
- **Planned action:** REBUILD-IN-PLACE. Look up a booking by reference and mobile number, and show masked results.

Component tree: `ManageBooking`, which takes a reference, email and phone, and retrieves the booking with a payment retry option.

### `/arrival`

- **File:** `arrival/page.tsx`
- **h1:** one.
- **Index:** noindex.
- **Planned action:** PRESERVE. Later, link it to real bookings through the reference and mobile lookup.

Component tree: `<Suspense>` wrapping `ArrivalDashboard`. It shows demo data only, behind `?demo=1`.

### `/offers`

- **File:** `offers/page.tsx`
- **Behaviour:** `redirect("/experience")`.
- **Planned action:** REBUILD-IN-PLACE. Render offers that admin has published; keep the redirect only while there are none.

### `/admin`

- **File:** `admin/page.tsx`
- **Render:** `force-dynamic`, guarded by `requireAdminPage()`.
- **Index:** noindex.
- **Planned action:** REFINE and ADD tabs, as described in the masterplan's admin section.

Component tree: `AdminDashboard`, with four tabs.

### `/admin/login`

- **File:** `admin/login/page.tsx`
- **Index:** noindex.
- **Planned action:** REFINE, adding roles, lockout and audit logging.

Component tree: `AdminLogin`.

### Metadata routes

| Route | Planned action |
|---|---|
| `sitemap.ts` | REBUILD-IN-PLACE. Generate it from the database, include `lastModified`, and fail if the site URL is not set. |
| `robots.ts` | PRESERVE the rules and fix the base URL fallback. |
| `icon.png` | Keep the existing favicon. |

## Missing framework files (ADD)

- `src/app/not-found.tsx`, a branded 404 page.
- `src/app/error.tsx` and `global-error.tsx`.
- `loading.tsx` for `/book`, `/rooms/[slug]` and `/dining/menu`.
- `opengraph-image` routes, one per page type.
- `proxy.ts` for security headers and CSP. Check the Next 16 documentation for its name and API before writing it.

## Proposed new routes (ADD)

| Route | Purpose | Data source | Index |
|---|---|---|---|
| `/rooms/[slug]` (`deluxe`, `super-deluxe`, `premium`; the same ids as now) | Room detail page: gallery, specs, live "from" price, 360 link, booking CTA, `HotelRoom` structured data | `rooms` and `media_assets` tables, plus the booking store for rates | yes |
| `/dining/menu` | Structured, searchable menu with request-to-order | `menu_categories`, `menu_items` and `restaurant_settings` tables | yes |
| `/dining/order/[reference]` | Order status, after confirming with a mobile number | `menu_orders` table | noindex |
| `/faq` | All FAQs managed in admin, with FAQPage structured data | `faqs` table | yes |
| `/admin/*` sub-routes, or tabs | Rooms, Media, Offers, Restaurant (Menu and Orders), Content, SEO, Tour, AI Knowledge, Audit, Staff | New tables | noindex |

## Unrouted components

| Component | Planned action |
|---|---|
| `MobileActionBar` | **REFINE and reuse.** Render it on every public page as a persistent mobile bar with Call, WhatsApp and Book. |
| `RoomShowcase` | REMOVE after the new room cards ship. It is safe to delete because nothing imports it, and it duplicates `id="rooms"`. |
| `ExperienceGateway` | REMOVE, for the same reason: nothing imports it, and it carries a broken anchor. |
| `OffersPage` | REBUILD-IN-PLACE as the new `/offers` page. |
| `Wordmark` | Evaluate it for the new header; otherwise REMOVE. |
| `shared/Button` | Evaluate it for the new header; otherwise REMOVE. |
| `shared/MediaPlaceholder` | REFINE and reuse as the labelled placeholder slot. |
