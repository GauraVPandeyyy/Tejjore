# Tejjora Lake View: Redesign Masterplan

Version 1.1 (2026-10-04), **visual reference calibration**. Each implementation phase still needs a separate go-ahead.

Inputs:
- `TEJJORA_CURRENT_STATE_AUDIT.md`: code findings, with references.
- `TEJJORA_CONTENT_SOURCE_LEDGER.md`: which facts may be published. This stays the authority on all Tejjora facts.
- `TEJJORA_VISUAL_REFERENCE_ANALYSIS.md`: screenshot-derived design grammar. It is the authority on visual questions.
- `TEJJORA_PAGE_INVENTORY.md` and `TEJJORA_FEATURE_INVENTORY.md`.
- `TEJJORA_QA_MATRIX.md`: acceptance criteria.

> **v1.1 changelog.** Calibrated against the attached NILS am See **mobile home page** screenshot. No Flyward screenshot and no desktop screenshot were provided, so Flyward points and desktop rules stay *URL-derived / inferred*. Changes:
> - §1: reference analysis rewritten from the screenshot.
> - §2: colour usage, with ember demoted from button fill to accent; type usage rules; shape vocabulary; motion vocabulary.
> - §3: mobile navigation moves to a bottom dock.
> - §4: homepage reduced from 12 blocks to 9 core blocks plus 2 conditional ones; visual direction added for every page.
> - §5: Waterline Day becomes a swipe stage on mobile, with a 150svh cap on laptop.
> - §9.5: AI UI placement.
> - §14: per-width rules.
> - §17 and §18: notes.
>
> No feature is removed, and the booking backend and business rules are unchanged.

## 0. Fixed decisions and constraints

| Decision | Source |
|---|---|
| Keep the existing stack: Next 16 App Router, React 19, Tailwind 4, `pg` against Supabase Postgres, Razorpay, Brevo. | Preservation requirement |
| AI uses **Gemini on the free tier only**. No paid AI APIs. The provider layer must let another provider be added later. | User, 2026-10-04 |
| Restaurant ordering is **request-to-order**: the cart produces a reference, staff accept or decline it in admin, and the guest pays at the hotel or on the room bill. No online payment for orders. | User, 2026-10-04 |
| Admin-uploaded media goes to **Supabase Storage** in the same project, using server-side signed uploads. | User, 2026-10-04 |
| The "The Byke Boutique Tejjora" listing is recorded in the ledger only. | User, 2026-10-04 |
| No new paid SaaS. Rate limits, caches and quotas live in the existing Postgres. | Follows from the free-only rule |
| Never publish PLACEHOLDER or CONFLICT facts. Never present illustrative media as Tejjora. | Brief and ledger |
| Reference sites contribute **design grammar only**. Never copy their code, copy, logos, icons, photographs or exact layouts. | Brief |
| Before writing Next APIs (`proxy.ts`, caching, `revalidateTag`), read `node_modules/next/dist/docs`. | `AGENTS.md` |

Classification tags used throughout:
- **PRESERVE**: keep as it is.
- **REFINE**: improve in place.
- **REBUILD-IN-PLACE**: same route and contract, new internals.
- **ADD**: new.
- **REMOVE**: only with a stated safety proof.

---

## 1. Reference-site design analysis (screenshot-calibrated)

The full observations are in `TEJJORA_VISUAL_REFERENCE_ANALYSIS.md`. Summary:

| Dimension | NILS am See: **observed** (mobile screenshot) | Flyward: URL-derived, *not verified* | Tejjora translation |
|---|---|---|---|
| Navigation | No top bar. Call icon and language switch over the hero. **Bottom floating dock**: a segmented [Enquire, dark \| Book, light] pill, a circular menu button, and small circle shortcuts (calendar, voucher). | Minimal horizontal nav | Mobile: one site-wide bottom dock with Menu, **[Ask \| Book]**, a dates circle and the AI circle. Desktop (*inferred*): a transparent-to-solid header with a Book pill, plus the hero booking console. |
| Hero | About one viewport tall. Full-bleed photo with the **wordmark as the only text**. Translucent **wavy water lines**. The photo **dissolves into the paper background** below. | Layered depth, short headline, one CTA | Video hero with a centred cream Tejjora lockup as the accessible h1, Tejjora's own waterline overlay, and a gradient dissolve into the story section. On laptop the lockup, a one-line positioning statement and the console all show without scrolling. |
| Section grammar | Repeated pattern: **ornament → uppercase hairline heading → centred paragraph → outline pill with arrow → carousel with circle arrows** | Value → cards → numbered journey → proof → form | One `SectionIntro` pattern used everywhere, with a logo-derived ornament glyph |
| Rooms | **Peek carousel** (~88vw cards). Square image with **Enquire/Book pills on the image**. **Display title overlaps the image edge**. Copy is only capacity, "FROM price incl. …" and one link. No spec table. | — | The same economy, using live DB "from" prices and capacity shown only when known. Specs move to `/rooms/[slug]`. |
| Imagery | Square photos, **one arch mask**, a staggered two-photo collage, gap-less full-bleed **feature bands**. Every image readable at the size shown. | AVIF, informational | Real Tejjora photos only. **"Awadh arch"** mask (Tejjora's own form). Collage for the gallery. Feature bands for sub-pages. |
| Grounds and colour | **Two grounds only**, navy and paper, plus one muted secondary pill colour | Dark on light | Lake and paper. Ember used only as an accent. |
| Typography | Hairline high-contrast display face: **caps for section headings, mixed case for titles**. Geometric sans body. Bold only for prices and keywords. | Sans | Fonts unchanged: Cormorant Garamond, Manrope, Cinzel. Usage rules in §2.2. |
| Transitions | Hero dissolve; overlaps across boundaries; short dark bands; the wave motif returns in the footer; a marquee band used as a transition | Sequential reveals | §2.7 continuity rules |

**Corrections to v1 (URL-only) assumptions:**
1. NILS's mobile booking lives in a bottom dock, not a header widget.
2. Its display type is a high-contrast serif-like face, not "restrained sans".
3. The hero has no headline overlay. The poetic copy sits in the story section below it.
4. Room cards show no room size.
5. There are no "3 callout cards". The site uses one arch carousel plus feature bands.

### Why Tejjora currently feels weaker (unchanged, sharpened by the screenshot)

1. **Too much scroll.**
   - Mobile home is about 2,000svh (≈17,000 CSS px). The reference is ≈8,600 px with more content types.
   - The 158svh second hero, the 300–430svh terrace runway and the 4.5–8rem padding from `redesign.css` are the causes.
2. **Two heroes**, two h1s and a blocking 1.85s intro.
3. **No single palette or type system**:
   - three palettes;
   - Instrument Serif at weight 400 only;
   - about 20 breakpoints.
4. **Visible empty data** ("Confirm with hotel"). The reference shows *less* information but no gaps.
5. **Uneven media**: illustrative terrace images and SVG gradients sit beside real photos.
6. **Weak conversion**: no persistent booking access outside `/`, and concierge misfires.
7. **No repeated section grammar.** Each section is styled independently, so the page reads as stacked components. The reference gets its cohesion from one repeated pattern.

---

## 2. Design system (REBUILD-IN-PLACE in `globals.css` / `@theme`)

### 2.1 Colour (derived from the logo; usage calibrated)

| Token | Value | Use |
|---|---|---|
| `--tj-lake-950` | `#022D36` | **Dark ground.** Header when solid, dark bands, footer, Book pill on paper. Taken from the logo background. |
| `--tj-lake-800` | `#0B4450` | Raised surfaces on dark |
| `--tj-mist-300` | `#9FBED2` | Secondary pill fill and hairlines on dark (existing value) |
| `--tj-cream-100` | `#FBF3CF` | Type on dark; Book pill fill on lake |
| `--tj-paper-50` | `#F8F5ED` | **Light ground** (existing value) |
| `--tj-sand-400` | `#D9A47A` | Ornament glyphs, eyebrows, dividers |
| `--tj-ember-500` | `#FF6437` | **Accent only.** The dot inside the Book pill (echoes the logo fruit), focus rings, the active Waterline step and the progress dot. **Never a button or panel fill.** On paper, use `--tj-ember-600 #D9481F` for any text-sized ember. |
| `--tj-ink-900` | `#14201F` | Body text on paper |

Rules:
- One `@theme` block.
- Delete the `--redesign-*` variables and the hard-coded hex values in `SiteHeader` and `BookingSearch`.
- **Only two page grounds, paper and lake.** Never place two dark bands next to each other. Keep dark bands short; the footer is the only long dark area.
- Contrast for all text pairs must meet WCAG 2.2 AA.

### 2.2 Typography (fonts unchanged; usage refined)

The logo pairs classical Roman capitals ("TEJJORA", with descending J's), a light geometric sans ("LAKE VIEW") and a serif tagline. The screenshot confirms the direction: a hairline high-contrast display face plus a clean sans body. Cormorant Garamond at 300–400 provides that hairline contrast, and it is the logo's own register, not an imitation of the reference.

**Display: Cormorant Garamond 300/400** (variable, with italic), via `next/font/google`.

| Use | Case | Size | Line height | Notes |
|---|---|---|---|---|
| Section headings | UPPERCASE | clamp(28px, 6vw + 6px, 44px), with a height cap of `9svh` on laptops | 1.08 | Tracking +0.04em; at most 4 lines on mobile |
| Room, card, band and footer titles | Mixed case | 36–48px on mobile, up to 56px on desktop | — | |
| Short dark-band labels | UPPERCASE | — | — | Wide tracking +0.25em |

**Body and UI: Manrope.**
- 16–17px, line height 1.7.
- On mobile, paragraphs are centred with a maximum of ~38ch. On desktop they are left-aligned with a maximum of ~60ch.
- Bold is used only for prices and the occasional keyword.

**Buttons: Manrope 500**, 14–15px, sentence case, with a leading "→" glyph.

**Prices:**
- "From" plus the amount in Manrope 700.
- The qualifier ("/ night · room only") in 400.
- Prices always come from the database.

**Accent: Cinzel**, for tiny eyebrows only (≤12px, tracked). It is never used for headings or paragraphs.

**Hindi:** Noto Serif Devanagari and Noto Sans Devanagari, `preload:false`, loaded only when Hindi copy is rendered.

**Cleanup:** remove the unused `@fontsource/*` packages.

### 2.3 Space, layout, shape, breakpoints

**Spacing.** A 4px base.
- Section gap: `clamp(64px, 10svh, 112px)`. This replaces the 4.5–8rem in `redesign.css`.
- Mobile gutter: 20px at 360px wide; 24px at 390 and 430px.

**Breakpoints.** Mobile-first, `min-width` only.

| Name | Width |
|---|---|
| `xs` | 360 |
| `sm` | 430 |
| `md` | 768 |
| `lg` | 1024 |
| `xl` | 1440 |
| `2xl` | 1920 |

**Maximum widths.**
- Content: 1240px.
- Text: ~60ch.
- Full-bleed only for the hero, the collage, feature bands and the Waterline stage.

**Shape vocabulary:**
- **Square photographs.** No small-radius cards.
- **The Awadh arch mask:** a rounded-top arch referencing Lucknow architecture. Use it at most once or twice per page (dining hero and carousel, one story image).
- **Pills:** for every text button. Outline for secondary, filled for Book.
- **Circle buttons:** 44px (above the reference's ~39px, to meet the touch-target rule). Used for arrows, the menu, dates and the AI launcher.
- **One very-large-radius container:** for the closing invitation, which rises into the footer.
- **Section ornament:** a small **logo-derived waterline glyph with an ember dot**, drawn by Tejjora, placed above major headings.

**Viewport-fit rule.** Every composition (hero, story, room card, collage, Waterline scene, dining carousel, feature band) is readable within one viewport at every width in §14. No block needs a second scroll to make sense.

### 2.4 Motion (one vocabulary)

Use the installed `motion` library everywhere through a small primitive set: `Reveal`, `Stagger`, `LineDraw`, `ArchReveal` and `CardCarousel`.

**REMOVE `gsap`.** It is never imported, so removal is safe.

| Motion | Behaviour |
|---|---|
| Text | Rises 12px and fades, 480ms, staggered 60ms |
| Images and masks | Arch opens or clip reveal, 600ms. Crossfade 500ms. |
| Carousels | Native scroll-snap, arrows animate 360ms, swipe on touch. The next card always peeks. |
| Waterline | Slow drift of the hero and footer lines, loop ≥12s. Progress line draws. |
| Hover | Arrow nudges 4px; pill fill sweeps (preserve the existing water-fill button). |
| Marquee | Optional, at most one, ≤30px/s, pauses on hover and focus |

- One easing curve: `cubic-bezier(.22,.61,.36,1)`. Durations stay within 240–700ms.
- No scroll-jacking. **No parallax on mobile.** Sticky runway is at most **150svh**, and only for the laptop Waterline stage.
- **Reduced motion:**
  - every reveal becomes static;
  - carousels and scenes use buttons only;
  - the video pauses on its poster;
  - the waterline is static;
  - the marquee stops;
  - the loader is skipped.
- Header tone uses `IntersectionObserver` on `[data-header-tone]`, replacing the per-frame `elementsFromPoint`.
- Remove the full-viewport grain layer. If any texture remains, use a static 2% texture on dark bands only.

### 2.5 CSS consolidation

`globals.css` (15,951 lines) is replaced by:
1. tokens and base styles;
2. component CSS modules or Tailwind, migrated one component at a time.

Migration steps for each component:
1. Freeze the old stage layers.
2. Migrate the component.
3. Delete its old selectors.
4. Visual-diff at the 9 viewports.

`redesign.css` folds into the tokens and is then **REMOVED**. This is safe once its 3 rule groups are migrated and the screenshot diff proves it.

### 2.6 Loader (REBUILD-IN-PLACE `SiteIntroLoader`)

- **Look:** the waterline draws across the screen behind the cream lockup, about 600ms in total. It then hands off to the hero, which shows the same lockup in the same position, so the loader appears to *become* the hero.
- **Rendering:**
  - Server-rendered **hidden**.
  - Shown only on the first visit of a session, via an inline script that sets `data-intro` on `<html>` before paint.
  - Never blocks pointer events after the fade.
  - No timers under reduced motion.
  - Shows nothing without JavaScript.
- **Accessibility:** the overlay is `aria-hidden`, and `pointer-events:none` after 300ms.

### 2.7 Continuity rules (so the site reads as one experience)

1. **The hero dissolves** into paper through a gradient. There are no hard edges after the hero.
2. **One repeated intro grammar:** ornament → caps heading → centred paragraph → outline pill. Use it for every major section.
3. **Overlap across boundaries:**
   - titles overlap image edges;
   - the collage heading overlaps the photos;
   - circle arrows overlap the arch mask;
   - the invitation container overlaps the footer.

   Protect contrast with a paper-tinted underlay where the image behind is busy.
4. **Ground changes are motivated.** The Waterline Day moves the ground from paper to lake as the day reaches night, which leads into the dark Impressions band. Dining returns to paper ("morning again").
5. **Motif bookends:** the waterline appears in the hero, in the Waterline progress line and in the footer background.
6. **Feature bands** are gap-less, full-bleed strips.
7. **Section numbers:** none are hand-set. If numbering is used, it is generated.

---

## 3. Information architecture

```
Desktop header (≥1024, inferred): logo · Stay · Dine · Experience · Gallery · 360° Tour · Location · [Book]
                                  transparent over hero → solid lake on scroll; Utility: Manage booking · phone
Mobile (<1024, observed grammar): top = call icon (left) + Tejjora mark (right), no top menu toggle
                                  bottom dock = [≡ Menu] [ Ask | Book • ]   + circles above: [dates] … [AI]

/                     Home
/rooms                Rooms index (cards + comparison)
/rooms/[slug]         Room detail (deluxe | super-deluxe | premium)        ADD
/dining               Restaurant story + hours + signature dishes
/dining/menu          Structured menu + request-to-order                    ADD
/dining/order/[ref]   Order status (ref + mobile; noindex)                 ADD
/experience           Waterline Day + local experiences
/gallery              Collage gallery
/virtual-tour         360°
/location             Getting here, map, nearby (no invented distances), arrival journey
/offers               Only when admin has published offers (else redirect)  REBUILD
/faq                  All FAQs                                               ADD
/plan-your-stay       Planner (preserve)
/book                 Booking (+ numbered arrival journey on confirmation)
/manage-booking       Reference + mobile status; full manage view           REBUILD
/contact, /policies   Preserved, DB-driven
/arrival              Preserved (noindex)
/admin/*              Expanded CMS + operations
```

**Bottom dock (REFINE and merge).** This is one site-wide component.

It merges:
- the **existing home-only `BookingSearch` mobile dock** (`BookingSearch.tsx:406-475`). It already has a menu circle, an Enquire/Book segmented pill and a commented-out calendar circle.
- the unused **`MobileActionBar`** (Call, WhatsApp, Book).

How it works:
- It is rendered in `SiteShell` on every public page except `/admin`.
- **Book** keeps today's behaviour: it validates dates, opens the planner sheet if dates are missing, and otherwise goes to `/book`.
- **Ask** opens a small sheet offering WhatsApp, Call or Tejjora AI.
- Content gets bottom padding equal to the dock height plus the safe area.

This also resolves the audit's "two menu toggles" finding.

---

## 4. Page-by-page plan (with visual direction)

### Home `/` (REBUILD-IN-PLACE): 9 core blocks + 2 conditional

**Target length:** ≤9,000 CSS px at 390px wide (≈11 screens), down from ≈17,000. Every block fits one viewport.

| # | Block | Ground | Notes |
|---|---|---|---|
| 1 | **Hero** (REFINE `VideoHero`) | Image → paper | See "Hero detail" below |
| 2 | **Story** | Paper | `SectionIntro`: ornament, caps heading, centred paragraph (≤38ch mobile), one pill. One real exterior or lobby photo, optionally in the arch mask. Absorbs the useful "Waterline" copy from `HeroExperience`. |
| 3 | **Rooms carousel** | Paper | See §4 Rooms; same card on home and on `/rooms` |
| 4 | **The Waterline Day** | Paper → lake | §5. The signature, and the bridge into the dark band. |
| 5 | **Impressions** (gallery teaser) | Lake | Staggered pair of real photos, caps heading overlapping them, "View gallery" link, circle arrows. Kept short. |
| 6 | **Dining** | Paper | Arch-masked carousel of real restaurant photos with circle arrows; title and 2-line copy; **signature dishes with prices from `menu_items`**; "View menu" pill |
| 7 | *Offers* | Paper | **Only when an offer is published.** Same card grammar plus validity dates. |
| 8 | *Reviews* | Paper | **Only real testimonials, with attribution.** Otherwise the block is not rendered. |
| 9 | **Explore bands** | Image bands | Gap-less full-bleed strips: "Inside, in 360°" → `/virtual-tour`; "Getting here" → `/location`; "Plan your stay" → `/plan-your-stay`. Stacked at about 38svh each on mobile; three across on desktop. **Replaces** the separate 360 teaser, location preview and arrival-journey sections. |
| 10 | **FAQ** | Paper | 3–5 items, hairline accordion; link to `/faq` |
| 11 | **Invitation + footer** | Paper container → lake footer | A large-radius cream container ("Shall we hold your dates?" with date and Book controls, plus Ask) rises into the footer. Footer: centred NAP, real-profile links only, a real-page link list, the waterline in the background. **No newsletter**, because there is no backend for it. |

*Optional:* one slow marquee of **verified attributes only**, as the transition into the footer. Off under reduced motion.

**Hero detail (block 1).**
- On mobile it is about 92svh. There is **no headline or CTA overlay**: the dock provides Book.
- **Centred cream Tejjora lockup** in the upper third, as the accessible **h1** ("Tejjora Lake View — boutique hotel in Gomti Nagar, Lucknow").
- **Tejjora waterline SVG** across the lower frame.
- A **gradient dissolve** into paper.
- **Laptop (1366×768):** height is 100svh minus the console. The lockup, one positioning line and the **booking console** (dates, guests, Book) docked at the bottom are all visible.
- **Video:**
  - separate mobile encode (720p, <3 MB) and desktop encode;
  - the poster is the LCP image, served via `next/image` with `priority`;
  - playback pauses under reduced motion, under Save-Data and when off-screen.

**Moved, not removed:**
- The numbered arrival journey (Flyward-inspired) moves to the `/book` confirmation and `/location`.
- The 360 teaser and the location preview become Explore bands.

**REMOVE `HeroExperience` from home.** Its copy moves into the Story block.
- Safe: it is used only in `src/app/page.tsx:2,37`.
- `scripts/validate-stage12-2.mjs:19` and `validate-stage12-3.mjs:7` reference it and **must be updated in the same change**.

### Rooms `/rooms` and `/rooms/[slug]`

**Room card** (shared by home, `/rooms`, offers and AI results; REFINE):
- Width:
  - 86vw on mobile, with the next card peeking;
  - 2.1 cards at 768;
  - 2.4 at 1024;
  - 3 at 1440 and above.
- Scroll-snap and 44px circle arrows. Arrow keys work when the carousel has focus.
- Image ratio: 1:1 on mobile, 4:5 on desktop. Square corners.
- **Pills on the image, top-right:** "Book" (lake fill with ember dot) deep-links to `/book?room={id}` using the existing behaviour; "Ask" is an outline pill.
- The **mixed-case display title overlaps the image's bottom edge.**
- "Up to N guests" appears **only when admin has set it**.
- **"From ₹X / night · room only"** comes live from the DB; the inclusion text comes from the bookable rate plan.
- A "View room" link.
- **No spec tables or "Confirm with hotel" text on cards.**

**Index (REBUILD-IN-PLACE):**
1. `SectionIntro`.
2. On desktop, three cards in a row; the carousel applies below 1024.
3. A comparison table with only the rows where every room has a value.
4. Feature bands to 360 and Gallery.

**Detail (ADD):**
- A gallery hero that fits the viewport: one large image plus a thumbnail strip, with a keyboard- and swipe-enabled lightbox.
- Title, "from" price, Book and a date picker:
  - desktop: in a **sticky rail**;
  - mobile: the dock's Book plus the dates circle.
- Specs as a quiet two-column hairline list. Amenities come from the canonical list.
- A live rate and availability widget (reuses `/api/availability`).
- A 360 band and an "Other rooms" carousel.
- `HotelRoom`, `Offer` and breadcrumb structured data.

**Room IDs are unchanged.** `/rooms#deluxe` redirects to `/rooms/deluxe`.

### Dining `/dining` and `/dining/menu`

- `/dining` (REBUILD-IN-PLACE):
  1. Arch-masked hero image of the real restaurant.
  2. `SectionIntro` story.
  3. Hours (from `restaurant_settings`; hidden while null).
  4. Signature-dish carousel.
  5. The menu's ordering notes, verbatim.
  6. "View menu" pill.
- `DiningPage` and `RestaurantExperience` merge into shared blocks, which removes the duplicate headline.
- `/dining/menu` (ADD, §8): paper ground.
  - Sticky category chips (outline pills; the active chip is lake-filled).
  - Search.
  - Items in a hairline list: name, then variant chips, then the price right-aligned in bold sans. The egg marker appears only where flagged.
  - The **cart is a bottom sheet rising from the dock** on mobile and a side panel on desktop.

### Experience `/experience` (REFINE)

- The full Waterline Day, then local experiences as **feature bands** (admin-approved only), then the 360 band.
- Fix the alt text and anchors.
- `DayAtTejjora` timing copy is labelled "a suggested rhythm".

### Gallery `/gallery` (REFINE)

- **Collage rows** alternating a staggered pair and a single wide image. No image is taller than 80svh.
- Filter chips (outline pills, `aria-pressed`). Media comes from `media_assets` with provenance.
- Lightbox on lake: circle arrows, arrow keys, swipe, a counter, focus return.

### 360 Tour `/virtual-tour` (REFINE, §11)

- Viewer on a lake ground.
- Scene rail of outline pills, circle controls, and a "Demo panorama — not Tejjora" label when applicable.

### Location `/location` (REFINE)

- An h1.
- **Centred NAP block in the footer style.**
- A map card that loads on click.
- Nearby places as a hairline list with "Directions" links (no unverified distances).
- **The numbered arrival journey.**

### Booking `/book`, Manage booking

- **`/book`:**
  - Paper ground with a minimal step header.
  - Dates: a calendar sheet on mobile; a two-month inline calendar on desktop.
  - Room choices use the room-card grammar.
  - A sticky summary.
  - Ember appears only on the active step and the dot in the Pay pill.
  - The confirmation shows the reference (copy button) and the numbered arrival journey.
  - Business rules are unchanged (§7).
- **`/manage-booking`:** one centred card with two fields (reference, mobile) and one pill. The masked result appears as a hairline list.

### Contact, FAQ, Policies, Offers

- **Contact:** the footer-style NAP, Call and WhatsApp pills, and a map band.
- **FAQ:** a hairline accordion with plus/minus circles and category chips. `FAQPage` structured data appears only where FAQs are visible.
- **Policies:** an editorial column (≤68ch) with "Last updated" and an approval gate.
- **Offers:** the card grammar plus validity dates, shown only when published (otherwise redirect).

### Plan your stay, Arrival

- **Plan your stay:** PRESERVE, plus accessibility and analytics fixes. It adopts the tokens, pills and circles.
- **Arrival:** PRESERVE (noindex), and it adopts the tokens.

### AI concierge and Admin

- **AI:** see §9.5.
- **Admin:** adopts the tokens and type only: a lake header, a paper workspace, hairline tables and pills. It keeps its utilitarian density, with no marketing motion.

### Global

- The bottom dock (§3).
- `not-found`, `error` and `loading` files.
- Per-page OG images.

---

## 5. Signature interaction: "The Waterline Day" (REBUILD-IN-PLACE `TerraceExperience`)

**Preserved concept:** Morning → Day → Evening → Night.

**Calibrated interaction.** It uses the reference's carousel grammar rather than a long sticky runway.

**Mobile (<1024): a swipeable 4-scene stage.**
- One viewport-fit stage (≤85svh), with the image on top and the caption below.
- Swipe, circle arrows, or the time chips (Morning · Day · Evening · Night, `aria-pressed`).
- A **waterline progress line** with the ember dot travelling along it.
- **No vertical scroll runway.**

**Laptop and desktop (≥1024): one sticky 100svh stage with ≤150svh of runway.**
- Scroll advances the scenes, and the same time chips and circle arrows are always present as an alternative.
- Scroll is never the only way through.

**Ground transition.** The section background moves from paper to lake as the scene reaches Night. That leads straight into the dark Impressions band, so the page reads as one continuous day.

**Common to both layouts:**
- One DOM tree, with `<picture>` art direction. No duplicate trees.
- The header tone follows the scene.
- **Captions:** time label, one line of copy, and a "what happens here" link where verified (breakfast → menu; evening → restaurant hours).
- **Media slots** come from `media_assets` with provenance. While only illustrative images exist (d1–d4, m1–m4), they carry an "Illustrative" tag and "Illustration of…" alt text. Real photography replaces them without code changes.
- **Reduced motion:** step mode only, crossfades only, one live region.
- Assets are AVIF/WebP: ≤300 KB per desktop frame and ≤150 KB per mobile frame.

---


## 6. Admin plan (admin becomes the source of truth)

### 6.1 Data layer (ADD: `db/migrations/003_content_core.sql`, `004_restaurant.sql`, `005_ops_security.sql`)

> **Dependency correction (Phase 1, 2026-10-05):** Phase 1 needed a shared rate limiter and a payment ledger before the Phase 2 schema existed, so `002_payment_ledger_and_rate_limits.sql` now holds `reservations.payments`, `rate_limits` and `schema_migrations`. Phase 2 migrations are renumbered 003–005; `rate_limits` and the migration ledger below already exist.
>
> **Implemented (Phase 2, 2026-10-05):** `003_content_core.sql`, `004_restaurant.sql` and `005_ops_security.sql` exist with the tables below (plus `offers.is_demo`, `menu_items.portion`/`review_note`, `restaurant_settings.service_charge_note`, `entity_media.layout_hint`, `tour_scenes` label/eyebrow/fallback fields, `ai_usage` per provider). `schema_migrations` gained a `checksum` column managed by the runner. The reservations status CHECK listed under `audit_log`'s migration is deferred to Phase 6.

| Table | Key fields | Feeds |
|---|---|---|
| `rooms` | `id` (FK to `room_types`, same ids), `slug`, `name`, `summary`, `body`, `size_sqft`, `bed_type`, `max_adults`, `max_children`, `view`, `amenities` (jsonb), `sort`, `published` | /rooms, home, booking occupancy, AI, schema |
| `media_assets` | `id`, `storage_path`, `width`, `height`, `blur_data`, `alt`, `credit`, `provenance` (`tejjora`/`licensed`/`illustrative`/`placeholder`), `licence`, `source_url` | All imagery |
| `entity_media` | `entity_type`, `entity_id`, `media_id`, `role`, `sort` | Galleries |
| `offers` | `title`, `summary`, `terms`, `valid_from`, `valid_to`, `room_ids`, `adjustment_type`/`value` (optional link to pricing), `promo_code`, `published` | /offers, home, AI, schema |
| `property_facts` | `key`, `value` (jsonb), `status` (`verified`/`provisional`/`placeholder`), `source`, `public` (bool), `updated_by` | Contact, footer, schema, AI |
| `faqs`, `policies` | content, `sort`, `published`, `approved_by`, `approved_at` | /faq, /policies, AI |
| `testimonials` | `author_display`, `text`, `rating`, `source` (`google`/`tripadvisor`/`direct`), `source_url`, `review_date`, `consent`, `published` | Reviews |
| `announcements` | `text`, `link`, window, `published` | Site banner |
| `seo_pages` | `path`, `title`, `description`, `og_media_id`, `noindex` | Metadata |
| `tour_scenes`, `tour_hotspots` | equirect/tile paths, initial view, `ready`, `provenance`; hotspot `yaw`/`pitch`/`target`/`label` | /virtual-tour |
| `ai_knowledge` | `topic`, `question`, `answer`, `public`, `approved` | AI |
| `menu_*`, `restaurant_settings`, `menu_orders`, `menu_order_items` | see §8 | Restaurant |
| `audit_log` | `actor`, `role`, `action`, `entity`, `entity_id`, `diff`, `ip_hash`, `at` | Admin |
| `rate_limits` | **Done in Phase 1 (migration 002):** `bucket_key`, `window_start`, `hits`, `expires_at` | All APIs |
| `ai_usage` | `day`, `requests`, `tokens` | Gemini free-tier budget |
| `admin_sessions` | `id`, `user_id`, `expires_at`, `revoked_at` | Revocation |

- **Migration ledger (ADD):** a `schema_migrations` table and an update to `scripts/db-migrate.mjs`. That script must also load `.env.local`.
- **Seed (REFINE `scripts/db-seed.mjs`):**
  - imports the current `src/data/*.ts` content and the ledger menu;
  - sets `property_facts.status` from the ledger;
  - never seeds demo reviews as published.

### 6.2 Content read layer (ADD `src/lib/content/*`)

- Server-only getters (`getRooms`, `getMenu`, `getFacts`, and so on) use Next 16 caching with tags. Read the Next docs for the exact API: `unstable_cache`/`"use cache"` and `revalidateTag`.
- Admin saves call `revalidateTag(...)`.
- **Fallback:** if the DB is unreachable, return the current TS data (marked `source:"fallback"`), so public pages never blank. Placeholder facts are filtered out unless `status=verified`.
- The existing `src/data/*.ts` files become the seed and fallback. **PRESERVE** them until phase 9, then reduce them to fallback-only.

### 6.3 Admin UI (REFINE `AdminDashboard` + ADD tabs)

Existing tabs, with fixes:
- **Today**
- **Reservations**: pagination, CSV export, resend email, refund (using the existing `razorpay.refund()`), audit trail per booking.
- **Availability & Rates**: 14-day grid, paginated blocks and overrides, visible errors.
- **Payments**

New tabs:
- **Rooms**: copy, specs, amenities, ordering, publish, media picker.
- **Media**: upload to Supabase Storage. Re-encoding through `sharp` produces AVIF/WebP, sizes and a blur placeholder. Alt text and provenance are required.
- **Offers**
- **Restaurant**: categories, items, prices, availability toggles, signature flag, settings, and an **Orders queue**.
- **Content**: facts with status, FAQs, policies, announcements, testimonials.
- **SEO**: per-page title, description, OG image, noindex.
- **Virtual Tour**: scenes, hotspots, ready flag, provenance.
- **AI Knowledge**: approved Q&A, a public toggle, and a "test question" box.
- **Audit log**
- **Staff**: users and roles.

**Roles:**

| Role | Access |
|---|---|
| `owner` | All |
| `manager` | Everything except staff and secrets |
| `front_desk` | Reservations and orders |
| `kitchen` | Orders and menu availability |

### 6.4 Admin security (REFINE `lib/admin/auth.ts`)

- In production, refuse the plain-text `ADMIN_PASSWORD`. Require `ADMIN_USERS_JSON` (scrypt) or a DB staff table using the same hashing.
- Store a session id in `admin_sessions` to allow revocation and "log out everywhere".
- Require an Origin header on mutations (reject when it is absent).
- Per-account lockout in `rate_limits`.
- Write to `audit_log` on every mutation.
- Overview API: paginate, omit `accessTokenHash`, mask PII in list views, and show full PII only in the detail view with an audit entry.

---

## 7. Booking improvement plan (PRESERVE business rules; REFINE correctness and UX)

| Item | Action |
|---|---|
| Server pricing, holds, advisory lock, HMAC verification | PRESERVE |
| Verify race | REFINE: inside the lock, re-read the reservation and **never downgrade `payment_review`**. If the reservation is already `paid`, only append the `paymentId`. |
| Webhook amount | REFINE: track a `payments` jsonb array of `{id, amount, at}` and compute `amountPaid` as its sum. Never overwrite. |
| Razorpay call under lock | REFINE: create the order outside the lock, then attach it inside a short locked transaction, keeping idempotency on `paymentOrderId` |
| Webhook secret | Owner action: set `RAZORPAY_WEBHOOK_SECRET`. The app fails fast at startup in production when it is empty. |
| Occupancy | REFINE: limits per room from `rooms.max_adults`/`max_children`. Client and server share one validator module (`lib/booking/validation.ts`, imported on both sides). The total guest cap is the sum over the rooms. |
| Date UX | One date-range picker: keyboard accessible, blocks past dates in IST, max 30 nights, 365 days ahead, and greys out sold-out nights using `/api/availability`. |
| Statuses | ADD `expired`, written by a lazy sweep inside `withBookingStore` writes. Use `payment_failed` when Razorpay reports failure and the hold has expired. Use `refunded` from the admin refund. Add a DB CHECK constraint in a Phase 6 migration (006+; deferred from 005 because the booking store rewrites legacy rows). |
| Reference | REFINE: new format `TLV-` plus 10 characters of Crockford base32 from `crypto.randomBytes` (about 50 bits), for example `TLV-7KQ2-M9XD-4P`. Widen the validation regex to accept **both** the old and new formats. |
| Summary and confirmation | Sticky summary (room, nights, guests, nightly breakdown, taxes and fees when configured, total, hold countdown). The confirmation page shows the reference with a copy button, "add to calendar", WhatsApp share and Manage booking. |
| Errors | Typed error codes mapped to friendly copy. Hold-expired recovery ("re-check availability"). No raw messages. |
| Guest status lookup (ADD `POST /api/reservations/lookup`) | See below |
| Full manage view | PRESERVE the reference + email + phone path for payment retry. Lookups **no longer write tokens**. Issue a short-lived signed cookie instead. |
| Duplicate route | **REMOVE `/api/booking-request`**. Safe because the UI calls only `/api/reservations` (`lib/booking/providers.ts:35`), and the only other matches are CSS class names. Keep a `308` to `/api/reservations` for one release in case external clients exist. |
| Scalability | Phase 2+: replace the whole-store load with targeted queries (`WHERE room_id AND stay overlaps`), and use per-room-type advisory locks instead of one global lock. Keep the `withBookingStore` API as a compatibility layer. |

**Guest status lookup (`POST /api/reservations/lookup`):**
- **Input:** a reference and a mobile number. The mobile is normalised to E.164 (default +91, strip spaces, a leading 0, and a +91 prefix).
- **Server checks:**
  - Postgres rate limit of 5 per 15 minutes per IP, and 10 per day per reference.
  - Constant-time compare against the stored normalised phone.
- **Response:**
  - Every failure returns the same generic message: "We couldn't find a booking with those details."
  - On success, return only: status, room name, dates, guest count, `amountDue` and payment status. The name is masked ("R. S****") and the phone shows only its last 4 digits. Never return email, notes or price breakdown IDs.
- **Logging:** write an `audit_log` row containing an IP hash, not the raw IP.

---

## 8. Restaurant and menu plan (ADD)

**Schema (`004_restaurant.sql`):**

| Table | Fields |
|---|---|
| `menu_categories` | `id`, `name`, `slug`, `sort`, `note` (e.g. "Half/Full"), `published` |
| `menu_items` | `id`, `category_id`, `name`, `source_name` (original spelling), `description`, `variants` (jsonb, e.g. ["Aloo","Gobhi"]), `price_full`, `price_half` (nullable), `contains_egg` (bool, set only from the ledger), `available` (bool), `signature` (bool), `sort`, `published` |
| `restaurant_settings` | `public_name` (nullable until confirmed), `opening_time` (nullable), `last_order_time` (`22:30`), `prep_minutes_min` (30), `prep_minutes_max` (40), `service_charge_pct` (5), `taxes_note` ("Taxes as applicable"), `allergy_note` (verbatim), `no_cancel_note` (verbatim), `price_change_note` (verbatim), `ordering_enabled`, `room_delivery_enabled` |
| `menu_orders` | `id`, `reference` (`TLO-xxxxxxxx`), `room_number` (nullable), `guest_name`, `phone_e164`, `status`, `subtotal`, `service_charge`, `total_excl_tax`, `notes`, `created_at`, `accepted_by`, `status_history` (jsonb) |
| `menu_order_items` | `order_id`, `item_id`, `name_snapshot`, `variant`, `qty`, `unit_price_snapshot` |

**Seed:** 90 items in 12 sections from the ledger (§3.2), with `contains_egg` on the 5 E items.

**Public `/dining/menu`:**
- Sticky category chips with scroll-spy.
- Search with diacritic-insensitive and typo-tolerant matching ("paneer", "panir").
- Unavailable items appear dimmed and marked "Not available today".
- Variants appear as chips. Half prices show only when they are set.
- The egg marker appears **only** where `contains_egg` is set. No other dietary labels and no "pure veg" claim.
- The operating notes are shown verbatim.
- On mobile, a bottom sheet holds the category navigation and the cart.

**Order flow:**
1. The guest adds items to a cart (stored in localStorage, per viewer).
2. In the drawer, the guest enters a room number (optional) or name, plus a phone number.
3. The guest checks the "orders cannot be cancelled once placed" box.
4. The guest submits the order.

Rules:
- Between `last_order_time` and `opening_time`, the submit button is disabled with a clear message. If the opening time is unknown, ordering stays enabled until last order and an admin switch can disable it.
- **The server re-prices from the DB**, rejects unavailable items, and computes the 5% service charge. The summary shows "Taxes as applicable" (no tax is computed until the hotel configures it).
- `POST /api/orders` is limited per IP and per phone and returns the reference.
- Statuses: `requested → accepted → preparing → out_for_delivery/ready → delivered`, plus `declined` (with reason) and `cancelled_by_staff`. **No guest cancellation**, matching the printed menu policy.
- The guest status page `/dining/order/[ref]` asks for the mobile number and polls every 20s.
- In admin, the kitchen queue polls every 15s with a sound and badge. Staff accept, decline or advance orders, and every change is audited. No paid realtime service is used.

---

## 9. AI concierge architecture (REBUILD-IN-PLACE `src/lib/concierge/*`; free-tier Gemini)

### 9.1 Layers

```
ConciergeLauncher (UI)
  │  SSE
/api/concierge  ── rate limit (Postgres) ── daily budget (ai_usage)
  │
Orchestrator (src/lib/concierge/orchestrator.ts)
  ├─ Slot memory: dates, guests, roomId (from history + client slots)
  ├─ LlmProvider interface  ──► geminiProvider (REST generateContent + functionDeclarations, 8 s AbortController)
  │                          └► (future providers plug in here)
  ├─ Tool registry (read-only, server-validated)
  ├─ Grounding validator (numbers/dates must come from tool output)
  └─ Fallback router (fixed rule engine, word-boundary matching)
Knowledge pack (published DB content, ≤ ~6k tokens, cached by tag)
```

- `LlmProvider` interface: `generate({system, messages, tools, signal}) → { text?, toolCalls?[] , finish }`, plus an optional `stream()`.
- The existing `ConciergeProvider` interface and `/api/concierge` route are **PRESERVED**, and the orchestrator implements `ConciergeProvider`.
- The model id comes from `GEMINI_CONCIERGE_MODEL`. The docs will recommend a free-tier Flash model.
- `ai_usage` tracks requests per day. When usage nears the free-tier quota, the system switches to the fallback router and tells the user that answers are temporarily simpler.

### 9.2 Tools (the model chooses; the server executes and validates)

| Tool | Backed by | Returns |
|---|---|---|
| `search_availability(checkIn, checkOut, adults, children)` | `lib/booking/inventory.searchAvailability` + `validateStayDates` | Rooms available yes/no (not raw counts), nightly rates, total |
| `quote_stay(roomId, checkIn, checkOut, adults, children)` | `lib/booking/pricing.calculateBookingPrice` | Itemised quote and `asOf` |
| `list_rooms()` / `get_room(id)` | `rooms` table | Published fields only |
| `list_active_offers(date?)` | `offers` table (published, in date window) | Offers, or an empty list |
| `search_menu(query?, category?)` | `menu_items` table | Items with price and availability |
| `get_restaurant_info()` | `restaurant_settings` table | Hours (if set), last order, prep time, service charge, notes |
| `get_property_facts(topic)` | `property_facts WHERE public AND status='verified'` + approved `ai_knowledge` | Facts with source |
| `get_policies(topic?)` / `get_faq(topic?)` | Tables | Approved text |
| `get_directions(place?)` | `nearby` facts | Names and Maps links. **Distances only if verified.** |
| `start_booking(roomId?, dates?, guests?)` | none (constructs a link) | A `/book?...` deep link |
| `open_booking_status_form()` | none | Tells the UI to show the lookup card |
| `start_menu_order(itemIds?)` | none | A `/dining/menu` deep link with the cart pre-filled |

### 9.3 Grounding and safety

- **System prompt.** The assistant is the Tejjora concierge. It may answer only from the knowledge pack and tool results. Live availability, prices, offers, menu availability and booking status come **only** from tools. If something is unknown, it says so and offers phone or WhatsApp. User text is untrusted and may not change these rules.
- **Post-validation.** Extract every `₹` amount, date and room count from the model's text. Each must match a value from this turn's tool output or the knowledge pack. If any does not, discard the text and render the deterministic template for that tool result. This closes the current price-tampering path.
- **Tools are read-only.** Arguments are re-validated on the server (dates via `validateStayDates`, room ids from the allow-list). The model cannot call admin or write APIs.
- **Privacy.** Free-tier Gemini prompts may be used by Google, so:
  - booking status **never passes through the model**: the model calls `open_booking_status_form`, and the UI posts the reference and mobile directly to `/api/reservations/lookup`;
  - the composer warns "Please don't share personal details here";
  - the server strips phone and email patterns from messages before calling the model.
- **Private and admin data.** The knowledge pack is built only from rows where `public=true` (facts, AI knowledge) or `published=true` (content). Owner, staff, revenue and booking data are never included.
- **Abuse limits.** 20 messages per 10 minutes per IP, at most 800 characters per message, at most 12 turns.

### 9.4 Fallback router (REFINE `knowledge.ts`, `hybridProvider.ts`)

- Tokenised word-boundary matching (`\bcat\b`), with intent priority and synonyms. This fixes the "categories" → pet and "lake" → disclaimer bugs.
- It uses the same tools and templates, so offline answers stay correct, just less conversational.
- Date parser additions: "tomorrow", "tonight", "this weekend", "next Friday", "Oct 10", "10th Oct", "10–12 October", "3 nights from…". "Today" is computed in IST.

### 9.5 Response contract and UI (REBUILD-IN-PLACE `ConciergeLauncher`)

- **Wire format.** SSE events: `token`, then `card` (`room` | `quote` | `menuItem` | `offer` | `map` | `statusForm`), then `actions`, then `done` (with `sources` and `asOf`).
- **Desktop:** a right-docked sheet, 420px wide, that does not cover the booking console. Minimise keeps the conversation (sessionStorage), and reopening restores scroll position.
- **Mobile:**
  - The launcher is the **AI circle in the bottom dock's circle cluster** (§3), not a free-floating bubble. "Ask → Tejjora AI" in the dock opens it as well.
  - It opens as a sheet that **rises from the dock** to full height, with safe-area insets.
  - Swipe down to minimise; the dock stays visible beneath the sheet.
- **Content:** suggested prompts (context-aware per page); rich cards with a photo, price, "Book" and "Add to order" actions; a quote card with a nightly breakdown; a map card.
- **Visual grammar (calibrated).** The panel uses Tejjora tokens and the site's own components, and does not imitate any chatbot brand.
  - **Suggested prompts:** outline pills.
  - **Results:** room, menu and offer results reuse the **room-card grammar** (square image, title overlapping the image edge, "From ₹" in bold sans, pills on the image), shown in a mini `CardCarousel` with circle arrows.
  - **Messages:** guest messages sit in lake pills; assistant text sits on paper with no bubble, in Manrope at 16px with 1.6 line height.
  - **Header:** a hairline divider and a small waterline glyph.
  - **Ember:** only on the send button's dot and the focus ring.
  - **Motion:** the sheet rises in 360ms and streamed text fades in.
- **Accessibility:** `role="dialog"`, a labelled title, a focus trap, Esc to close, and focus returns to the launcher. A polite live region announces "Tejjora AI is typing". Buttons are at least 44px.
- **Errors:** retry, plus phone and WhatsApp fallbacks.
- **Avatar:** optimise `TejAI.png` (1.5 MB) to a 96px WebP/AVIF.

### 9.6 Evaluation (phase 7 exit)

A scripted set of about 40 questions, including all the examples in the brief:
- "What rooms are available from 10 to 12 October?"
- "3 nights cost"
- "Paneer Butter Masala price" → ₹280 from the DB
- "dinner time" → "Last order 10:30 pm", with opening hours given only if they are set
- offers → an honest "no current offers" when none exist
- "how far from X" → no invented distance

**Pass criteria:**
- 0 ungrounded numbers.
- 0 PII sent to the model, checked by logging redaction in tests.
- Correct fallback when Gemini is disabled.

---

## 10. SEO plan (REFINE; legitimate techniques only, no ranking guarantees)

| Area | Action |
|---|---|
| Base URL | Require `NEXT_PUBLIC_SITE_URL` in production. If it is missing, fail the build instead of falling back to `example.com`. |
| Titles | Pages set short titles; the layout template appends the brand once. Titles come from `seo_pages` overrides when present. |
| Descriptions and OG | Per page, with an OG image per page type (the room photo for room pages). |
| Headings | One h1 per page. Semantic h2/h3. Remove hand-numbered section labels or generate them. |
| Structured data | `Hotel` (layout-level): name, address (with `addressLocality` and Gomti Nagar), telephone, url, image[], `numberOfRooms` 29, `priceRange` derived from DB rates, `amenityFeature` from the canonical list, `hasMap`. Add `geo`, `checkinTime`, `checkoutTime` and `sameAs` **only once VERIFIED**. `aggregateRating` **only** from a live, verifiable source. |
| | `HotelRoom` and `Offer` on room pages. |
| | `Restaurant` with `hasMenu` → `Menu` → `MenuSection` → `MenuItem` + `offers.price` (INR). `servesCuisine` only "North Indian" and "Indo-Chinese", as supported by the menu. |
| | `FAQPage` only where the FAQs are visible. `BreadcrumbList` everywhere except home. |
| Sitemap | Generated from the DB: static routes, plus `/rooms/[slug]`, `/dining/menu` and `/offers` when published, with `lastModified` from `updated_at`. |
| Robots | Keep the disallows. Add `/dining/order/`. |
| Local | One honest `/location` page (no doorway pages per neighbourhood). NAP identical to the Google Business Profile. Owner actions: claim and complete the GBP, ask OTAs to correct the conflicting listing, gather real reviews. |
| Images | Alt text from `media_assets`, descriptive filenames, AVIF/WebP, width and height set. |
| Content | Room pages with real specs. A menu page with real items, which is a strong local intent match for "restaurant Gomti Nagar". |
| Speed | See §13. |

---

## 11. 360° Marzipano plan (PRESERVE viewer; REFINE)

- **Persistent viewer.** Create the Marzipano `Viewer` once, keep scenes in a map, and call `scene.switchTo()` with the transition. Do not destroy and rebuild the viewer.
- **Keys.** Attach to the focused viewer container (`tabIndex=0`) with a dependency array. Ignore keys when focus is in an input.
- **Assets.** An offline script (`scripts/build-panorama-tiles.mjs`) uses `sharp`, which is free and local, to cut an equirectangular image into multi-resolution cube tiles plus a preview. Marzipano's `CubeGeometry` loads the preview first, then the tiles.
- **Scenes and hotspots** live in `tour_scenes` and `tour_hotspots`. Admin manages the ready flag, initial yaw/pitch/fov, labels and targets: another scene, a room page, or `/book?room=`.
- **Default scene.** The first `ready` scene with `provenance='tejjora'`. If none exists, open on a labelled "Demo panorama — not Tejjora Lake View" scene with credit and licence.
- **Licensing.** Replace the current demo images (licence unknown) with a **CC0** panorama, for example from Poly Haven, and record it in the ledger.
- **Fullscreen.** The Fullscreen API, with an iOS fallback using a fixed-position "pseudo-fullscreen" class. Gyroscope look-around is opt-in (`DeviceOrientation` permission prompt on iOS).
- **Fallback.** WebGL unavailable or reduced data → a static preview with the hotspot list. Loading shows a progress ring. Errors show a retry.
- **Accessibility.** The scene rail is a `<nav>`, hotspots are buttons with labels, and a text description is given per scene.

---

## 12. Security plan

| # | Action | Phase |
|---|---|---|
| 1 | Set the webhook secret (owner). Fail fast in production if it is unset. | 1 |
| 2 | `proxy.ts` (check the Next 16 docs) or `next.config.ts` `headers()`: CSP with nonces (allow Razorpay checkout, Google Maps, GA, Supabase Storage), HSTS, `frame-ancestors 'none'` (admin) / `'self'`, Referrer-Policy `strict-origin-when-cross-origin`, Permissions-Policy (camera/mic off; gyroscope self for the tour) | 1 |
| 3 | Postgres rate limiter (`rate_limits` upsert) keyed on the platform-trusted client IP. Document the hosting header (e.g. Vercel `x-real-ip`). Covers every public POST, the concierge, admin and orders. | 1 |
| 4 | Require `Content-Type: application/json` on JSON POST routes, and the same-origin `Origin` header on all state-changing routes (except the webhook) | 1 |
| 5 | Sanitised error responses (code + generic message). Log details on the server. | 1 |
| 6 | Admin: hashed users only in production, roles, revocable sessions, audit log, paginated and masked overview | 1–3 |
| 7 | Payment race and amount accumulation fixes | 1 |
| 8 | DB TLS with the Supabase CA (`ssl: { ca }`) instead of `rejectUnauthorized:false` | 1 |
| 9 | High-entropy references, reference + mobile lookup hardening (§7) | 6 |
| 10 | Uploads: server-only service-role key, MIME sniffing, size limit (15 MB), re-encode, random paths, no SVG uploads | 3 |
| 11 | AI: read-only tools, post-validation, PII stripping, budget, no private data in the knowledge pack | 7 |
| 12 | Encrypting PII at rest: evaluate `pgcrypto` for `guest` jsonb (phone and email searchable through hashes) | later |
| 13 | Retention: purge expired holds' PII after 30 days (job run on admin load or a free cron) | later |
| 14 | Dependency audit (`npm audit`); remove unused packages | 1 |

---

## 13. Performance plan

- **Budgets (home, mobile, throttled 4G):** LCP under 2.5s, CLS under 0.05, INP under 200ms, JS under 170 KB gzip on first load.
- **Video.** Separate encodes: mobile 720p under 3 MB, desktop 1080p under 6 MB, WebM + MP4, `preload="none"` plus the poster. Start playback only when visible and not under reduced motion or Save-Data.
- **Images.**
  - Convert d1–d4 and m1–m4 to AVIF/WebP.
  - `sizes` on every image.
  - `placeholder="blur"` from `media_assets.blur_data`.
  - At most 1 `priority` image per page.
  - Supabase Storage images go through `next/image` `remotePatterns`.
- **Code.** Dynamic-import the concierge (on first open or idle), Marzipano, the date picker and the admin. Remove gsap and @fontsource. Delete dead CSS.
- **Fonts.** `next/font` with `display:swap`, subsets latin and latin-ext, Devanagari loaded lazily.
- **Paint.** Remove the full-viewport blend layer. Header tone via IntersectionObserver. Terrace runs as a single tree.
- **Caching.** Tag-cached content reads. `Cache-Control` for static media. The Maps iframe loads on click.
- **Monitoring.** `next/web-vitals` sent to GA4 (already present).

---

## 14. Mobile and responsive plan (calibrated; full table in `TEJJORA_VISUAL_REFERENCE_ANALYSIS.md` §19)

Mobile rules (360 / 390 / 430) are **observed** from the reference screenshot. Tablet and laptop rules (768 and up) are *inferred*.

### Mobile: 360 / 390 / 430

**Shared rules**

- **Gutter**: 20px at 360, 24px at 390 and 430.
- **Section headings**: UPPERCASE, 28px / 30–32px / 34–36px, at most 4 lines.
- **Body text**: at least 16px, centred, at most about 38ch.
- **Hero**: about 92svh. The lockup is at most 70vw wide and sits in the upper third. No copy or CTA overlays the image. Book lives in the dock.
- **Bottom dock**:
  - Menu button: 48px circle.
  - Ask/Book pill: 48px tall.
  - Dates and AI: 44px circles, placed above the pill.
  - The page gets bottom padding equal to the dock height plus the safe area.
  - **The dock must fit 360px** without truncating labels.
- **Carousels**: cards at 86vw (84vw at 430) so the next card peeks. Scroll-snap. 44px circle arrows.
- **Waterline Day**: a swipe stage of at most 85svh. No vertical runway.
- **Feature bands**: stacked, each about 38svh.
- **Menu page**: sticky category chips, with the cart in a bottom sheet.
- **Home page length**: at most 9,000 CSS px at 390px.

### Tablet: 768

- Gutter 32.
- Rooms carousel shows 2.1 cards.
- The minimal top bar and the dock remain.
- The hero is about 85svh.

### Small laptop / tablet landscape: 1024

- The desktop header appears, transparent over the hero and solid lake once scrolled, with a Book pill.
- The dock is removed.
- The booking console sits at the bottom of the hero.
- Rooms carousel shows 2.4 cards.
- Feature bands sit three across.
- Using one breakpoint system removes the mixed states seen between 768 and 1023px.

### Laptops: 1366×768, 1440×900, 1536×864

- **Above the fold**: the lockup (h1), one positioning line and the booking console are all visible.
- **Heading size**: the clamp is capped at 9svh.
- **Block height**: every block is at most 100svh. The collage is at most 80svh.
- **Waterline Day**: a sticky 100svh stage with at most 150svh of runway, plus chips and arrows.
- **Rooms**: 3 cards in a row.
- **Room detail**: the booking rail stays in view.

### Large desktop: 1920+

- Content stops at 1240px wide. Full-bleed is reserved for the hero, the collage, feature bands and the Waterline stage.
- Images are capped by `sizes`.

### Everywhere

- Touch targets at least 44px.
- No information available only on hover.
- Pointer-coarse variants provided.
- No parallax on mobile.


---

## 15. Implementation phases

**Phase 4 + 5A ✅ complete (2026-10-05, `docs/qa/phase-4-5/PHASE_4_5A_REPORT.md`):** design system (`tejjora.css`), dock/header/loader/footer, home, `/rooms`, `/rooms/[slug]`, `/dining`, `/dining/menu`; `redesign.css` removed; Phase 5B (other pages) not started in that report.

**Phase 5B ✅ complete (2026-10-05, `docs/qa/phase-4-5/PHASE_5B_REPORT.md`):** experience, gallery, 360 tour (presentation only), location, contact, FAQ (new), policies, offers (redirects while none published), plan your stay, arrival, book, manage booking, 404/error/loading. Phase 6 not started.

**Status (2026-10-05):** Phase 0 ✅ complete (`docs/qa/baseline/BASELINE_REPORT.md`). Phase 1 ✅ complete (`docs/qa/phase-1/PHASE_1_REPORT.md`); owner actions listed there are still required before production payments and admin sign-in work in production. Phase 2 ✅ complete (`docs/qa/phase-2/PHASE_2_REPORT.md`): migrations 003–005, `src/lib/content/*`, seed, fallback, tag cache. Production `db:migrate` + `db:seed` remain owner deployment actions. Phase 3 is split into 3A/3B/3C: **Phase 3A ✅ complete** (`docs/qa/phase-3/PHASE_3A_REPORT.md`): roles (owner/manager/front_desk/kitchen) and a 29-permission map, revocable DB sessions (`admin_sessions`) with sign-out-everywhere, central `authorizeAdmin` on every admin API, `audit_log` writes and an Audit view, paginated/masked reservations, 14-day availability grid. Staff sign-in in production now requires migration 005 + `DATABASE_URL`, and `ADMIN_USERS_JSON` entries need a `role`. **Phase 3B/3C ✅ complete** (`docs/qa/phase-3/PHASE_3BC_REPORT.md`): Rooms, Offers, Content (facts/FAQs/policies/announcements/testimonials), Media (Supabase Storage, sharp re-encode), SEO (wired via `generateMetadata`), Restaurant (menu, kitchen availability, orders queue), Virtual Tour, AI Knowledge (approved-only preview), per-session staff revocation; one validated, audited, tag-revalidating CMS engine over the Phase 2 tables. **Phase 3 complete.** Owner action: Supabase Storage bucket + `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. Phase 4 not started.

> **Dependency notes (Phase 2):** `next` patched 16.3.5 → 16.3.8 for GHSA-vcvr-r3jv-pc5j (critical, `next/og`); no other runtime package changed. Dev-only `@electric-sql/pglite` added so migrations, seed and content getters are tested against a real in-memory PostgreSQL without touching the live database. The project does not use `cacheComponents`, so the content cache uses the documented `unstable_cache` + `revalidateTag(tag, profile)` model. The reservations status CHECK (§7) moves from migration 005 to the Phase 6 status work.

Each phase needs explicit approval. Phases 1–3 gate everything else.

| Phase | Scope | Depends on | Completion criteria |
|---|---|---|---|
| **0. Baseline** | Blank `.env.local` live services (see memory). Run `npm run lint`, `next build` and all `scripts/validate-*.mjs`. Screenshots of every public page at the 9 viewports. Lighthouse for home, rooms and book. | — | `docs/qa/baseline/*` committed; known failures listed |
| **1. Hotfixes** | Security headers, Postgres rate limiter, verify/webhook fixes, webhook-secret fail-fast, admin hash enforcement and Origin requirement, sanitised errors, non-blocking loader, single h1 and `/location` h1, title template, `metadataBase` requirement, tour keydown fix, concierge word-boundary matching and quick-prompt fixes, alt-text truthfulness fix, DB TLS | 0 | All validators pass. New tests for verify/webhook races, lookup and the concierge prompts. No visual regressions beyond the intended ones. |
| **2. Data layer** | Migrations 003–005 (the migration ledger already exists from 002); `src/lib/content/*` with tag caching and TS fallback; seed from the TS files and the ledger menu; `property_facts` statuses | 1 | Public pages render identically from the DB. Killing the DB connection still renders the fallback. |
| **3. Admin CMS** | Roles, sessions, audit; Rooms, Media (Supabase Storage), Offers, Restaurant (menu and orders queue), Content, SEO, Tour, AI Knowledge, Staff; fixes to the existing tabs | 2 | Each admin edit appears on its public surface after revalidation. Audit rows written. Role restrictions enforced (tests). |
| **4. Design system** | Tokens, fonts, motion primitives, breakpoint system, header/navigation, **site-wide bottom dock** (merging the `BookingSearch` mobile dock and `MobileActionBar`), `SectionIntro`/`CardCarousel`/`Collage`/`FeatureBand`/arch-mask/ornament components, loader, CSS consolidation (component by component) | 1 | 9-viewport visual QA signed off. Continuity rules (§2.7) hold. Lighthouse at or above baseline. `redesign.css` removed. |
| **5. Pages** | Home, rooms + `/rooms/[slug]`, dining + `/dining/menu` (browse), experience with the Waterline Day, gallery, location, contact, policies, FAQ, 404/error | 2, 4 | QA matrix page rows pass at all viewports |
| **6. Booking and ordering** | Booking UX, occupancy, statuses, new references, reference + mobile lookup, request-to-order and order status, kitchen queue | 2, 3, 5 | End-to-end tests on localhost with Razorpay **test** keys; order lifecycle tests; enumeration tests (generic errors, rate limits) |
| **7. AI concierge** | Provider interface, Gemini tools, orchestrator, grounding validator, SSE, rich UI, budget, evaluation set | 2, 3 | Evaluation passes (§9.6). Fallback works with Gemini disabled. |
| **8. 360 tour** | Persistent viewer, tiles script, admin scenes, CC0 demo, iOS fullscreen, accessibility | 3 | Works on iOS Safari, Android Chrome and desktop. Swapping a scene needs no code. |
| **9. SEO and performance** | Structured data, sitemap, OG, media conversion, video encodes, CWV tuning; reduce TS data to fallback only | 5–8 | Rich Results Test valid. CWV budgets met. Ledger re-audited. |

---

## 16. Regression risks

| Risk | Mitigation |
|---|---|
| `globals.css` selectors are shared across components | Migrate one component at a time, with screenshot diffs at the 9 viewports |
| Validators assert components exist (`validate-stage12-2.mjs:19` lists HeroExperience, RoomShowcase and ExperienceGateway; `validate-stage12-3.mjs:7` reads HeroExperience) | Update the validators in the same commit as any removal |
| `withBookingStore` contract (booking, admin, email, webhook) | Keep the signature. Add targeted queries behind it. Run payment race tests. |
| Room ids used as FKs, config keys, hotspots, anchors and env vars | Never rename. Slugs equal ids. |
| Reference format change | The regex accepts both formats. The admin search handles both. |
| Session-stored access tokens and payment retry | Keep the three-field manage path. Use a signed cookie for lookup. |
| `/offers` redirect, `/rooms#id` anchors | Redirect until replacements exist. Add the anchor → slug handler. |
| `tejjora:concierge-open` event and analytics event names | Keep them. Add new names only. |
| Gemini free-tier quota and outages | `ai_usage` budget plus the fallback router |
| Supabase Storage URLs in `next/image` | Add `remotePatterns`, keep the TS fallback media |
| Live services in `.env.local` | Blank them for tests; use Razorpay test keys only on localhost |
| Moving the home `BookingSearch` dock site-wide (its Book button validates dates and opens the planner sheet; it has its own menu toggle) | Extract it into a shared dock component **without changing the Book logic**. Remove the duplicate top menu toggle below 1024px. Test Book with and without dates on every page. |
| Moving the 360, location and arrival sections into feature bands or other pages | Keep their routes, content and analytics events. Only the presentation on home changes. |

---

## 17. Files likely to be modified

- **App:** `src/app/layout.tsx`, `page.tsx`, `rooms/`, `dining/`, `experience/`, `location/`, `offers/`, `manage-booking/`, `virtual-tour/`, `sitemap.ts`, `robots.ts`, `globals.css`. `redesign.css` is removed.
- **Components:** `layout/{SiteHeader,SiteShell,SiteFooter,SiteIntroLoader,MobileActionBar}`, `hero/VideoHero`, `hotel/TerraceExperience`, `rooms/*`, `dining/*`, `restaurant/*`, `gallery/*`, `concierge/ConciergeLauncher`, `virtual-tour/{MarzipanoViewer,VirtualTourExperience}`, `booking/*`, `admin/*`.
- **Library:** `src/lib/booking/{reservations,access,validation,public,inventory,pricing}.ts`, `src/lib/admin/{auth,operations}.ts`, `src/lib/security/rateLimit.ts`, `src/lib/database/postgres.ts`, `src/lib/concierge/*`, `src/lib/seo/schema.ts`, `src/lib/reviews/provider.ts`.
- **API:** `src/app/api/payments/{verify,webhook,order}`, `api/reservations/*`, `api/concierge`, `api/admin/*`, plus new `api/orders`, `api/reservations/lookup` and `api/admin/{content,media,menu,...}`.
- **Config and scripts:** `next.config.ts`, `proxy.ts` (new), `db/migrations/002+`, `scripts/{db-migrate,db-seed}.mjs`, new `scripts/build-panorama-tiles.mjs`, affected `scripts/validate-*.mjs`, `.env.example`, `package.json` (remove gsap and @fontsource; add `@supabase/supabase-js` for Storage only).
- **Calibration additions:** `src/components/booking/BookingSearch.tsx` (extract the mobile dock), `src/components/layout/MobileActionBar.tsx` (merged into the dock), `src/components/hero/VideoHero.tsx` (lockup, waterline overlay, dissolve), `src/components/home/HomeStoryBlocks.tsx` (Explore bands, collage).
- **New:** `src/components/ui/{SectionIntro,CardCarousel,Collage,FeatureBand,ArchMask,Ornament,Waterline}.tsx`, `src/lib/content/*`, `src/lib/ai/*` (or `concierge/orchestrator`, `tools`, `providers/gemini`), `src/components/menu/*`, `src/components/motion/*`.

---

## 18. Conflicts between the requirements and the current architecture

1. **"Lake-front" positioning is unverified.** Tripadvisor describes city-view balconies. Hero and room copy must not claim lake views until the owner confirms them (ledger §5 Q1).
2. **AI booking status vs free-tier privacy.** Resolved: status goes through the UI card to the secured API, never through the model.
3. **Live Google reviews** need the Places API, which requires GCP billing even within the free credit. That conflicts with "free only" unless the owner enables billing. Default: admin-curated testimonials with attribution.
4. **"Admin manages everything" vs static TS content.** Resolved by a DB plus a fallback layer, not a rewrite.
5. **Production payments are blocked by config** (`BOOKING_PRODUCTION_READY`, webhook secret). These are owner actions.
6. **No real terrace, food or 360 media.** The Waterline Day and the tour ship with labelled illustrative or demo slots.
7. **Missing inputs.** The `reference/*` folders do not exist, and Google Business data is not accessible.
8. **Inventory split unknown** (10/10/9 vs 7/5/9).
9. **The in-memory rate limiter cannot secure multi-instance hosting.** Moving it to Postgres is required, because Redis is not allowed under "free only".
10. **"Menu Veg" title vs egg dishes.** No "pure veg" claims.
11. **Restaurant hours unknown.** Only the last-order time is verified, so "what time can I order dinner?" can only answer up to the last order.
12. **Half prices are not printed.** The Half/Full UI appears only once admin sets half prices.
13. **The visual calibration is partial.** Only the NILS **mobile** home page was provided as a screenshot. Flyward findings and all desktop and laptop layouts remain URL-derived or *inferred*. If Flyward or desktop screenshots are supplied, recalibrate `TEJJORA_VISUAL_REFERENCE_ANALYSIS.md` §3, §4 and §19 and this document's §1, §3 and §14.
14. **The reference hero has no headline or CTA**, while Tejjora requires a visible h1 and an easy booking path. Resolved: the hero lockup *is* the accessible h1. On mobile the dock provides Book; on laptops the booking console is shown in the hero.

---

## Appendix A: Recommended CLAUDE.md / AGENTS.md additions (not applied)

`CLAUDE.md` currently contains only `@AGENTS.md` (the Next 16 docs rule, which is regenerated by `next dev`). Suggested additions, for the owner to decide, preferably in a separate file imported from `CLAUDE.md` so that `next dev` does not overwrite them:

- Read `node_modules/next/dist/docs` before using Next APIs. Next 16 uses `proxy.ts` instead of middleware.
- `.env.local` points at a live Supabase DB, Brevo and Razorpay test. Blank these before runtime tests.
- Never publish PLACEHOLDER or CONFLICT facts. Check `docs/TEJJORA_CONTENT_SOURCE_LEDGER.md` first.
- Never present illustrative or demo media as Tejjora property media.
- No paid AI or SaaS. Gemini free tier only. Never send guest PII to the model.
- Room ids (`deluxe`, `super-deluxe`, `premium`) are stable keys. Never rename them.
- Run `scripts/validate-*.mjs`, lint and build before declaring a phase done. Update validators when removing components.
- Reference sites are for design grammar only. Never copy their code, copy text or assets.
