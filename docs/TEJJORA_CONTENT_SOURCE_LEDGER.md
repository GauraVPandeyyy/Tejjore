# Tejjora Lake View — Content Source Ledger

Last updated: 2026-10-04. This ledger is the authority on what may be published.

**Rules:**
- Only **VERIFIED** facts may appear as property facts on the public site, in structured data, or in AI answers.
- **PROVISIONAL** facts need hotel confirmation first.
- **PLACEHOLDER** content must be visibly labelled or kept out of public view.
- **CONFLICT** rows are never published until resolved.

Status meanings:
- **VERIFIED**: issued by the hotel (hotel's own menu or logo, or values the hotel team supplied that are recorded in code), or independently consistent across the code and a reliable listing.
- **PROVISIONAL**: found in a public source but not confirmed by the hotel.
- **PLACEHOLDER**: created for design or testing only.
- **CONFLICT**: sources disagree.

## 1. Sources consulted

| ID | Source | Accessed | Notes |
|---|---|---|---|
| SRC-CODE | Repository `src/data/*.ts` | 2026-10-04 | `commerce.ts:137-141` says the rates were "supplied by the hotel team" |
| SRC-LOGO | `public/brand/tejjora-logo.png` | 2026-10-04 | Hotel brand asset |
| SRC-MENU | `Menu Veg.pdf` (hotel-issued, 9 pp., titled "Room Menu" on the cover) | 2026-10-04 | Local copy at `C:\Users\Praib\Downloads\`. Not yet in the repo. |
| SRC-TA | [Tripadvisor listing](https://www.tripadvisor.com/Hotel_Review-g297684-d34090989-Reviews-Tejjora_Lake_View-Lucknow_Lucknow_District_Uttar_Pradesh.html) | 2026-10-04 | Name, address and phone match the code |
| SRC-TRIP | [Trip.com "The Byke Boutique Tejjora"](https://www.trip.com/hotels/lucknow-hotel-detail-133136657/the-byke-boutique-tejjora/) | 2026-10-04 | **Conflicting identity.** User decision: ledger only. |
| SRC-EMT | [EaseMyTrip "The Byke Boutique Tejjora"](https://www.easemytrip.com/hotels/the-byke-boutique-tejjora-lucknow-9757604/) | 2026-10-04 | Fetch returned a listing page with no details |
| SRC-DRIVE | Google Drive photo folder (27 JPG + 27 ARW, `DSC065xx`/`DSC067xx`) | 2026-10-04 | Hotel photography |
| SRC-REVIEWS | `src/data/reviews.ts` snapshot | captured 2026-09-27 | Google rating snapshot. The review texts are demo. |
| — | `reference/*` folders | — | **Do not exist**, so they could not be used |
| — | Google Business Profile / Maps | — | Not accessible to this audit. The owner should export the data. |

## 2. Property facts

| Fact | Value | Status | Source | Notes |
|---|---|---|---|---|
| Name | Tejjora Lake View | VERIFIED | SRC-LOGO, SRC-CODE, SRC-TA | Use title case in prose. The code's all-caps `"TEJJORA LAKE VIEW"` is a display style. |
| Descriptor | "A Boutique Hotel" | VERIFIED | SRC-LOGO, SRC-MENU | |
| Established | ESTD 2026 | VERIFIED | SRC-LOGO, SRC-MENU | |
| Tagline on menu | "Luxury Rooms & Restaurant" | VERIFIED | SRC-MENU | |
| Street address | C-1/242, Vikalp Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010, India | VERIFIED | SRC-CODE `hotel.ts:4-11`, SRC-TA | The schema currently drops "Gomti Nagar" (`schema.ts:13-20`). Fix this for NAP consistency (name, address and phone written the same everywhere). |
| Phone | +91 96211 34909 (also WhatsApp) | VERIFIED | SRC-CODE `hotel.ts:12-14`, SRC-TA | |
| Email | — | MISSING | env `NEXT_PUBLIC_HOTEL_EMAIL` only | Do not invent one |
| Coordinates | — | MISSING | | Get from the Google Business Profile. Do not geocode and then publish as fact. |
| Total rooms | 29 | VERIFIED | SRC-CODE `hotel.ts:15`, SRC-TA | SRC-TRIP says 28, which is a CONFLICT. |
| Room categories | 3 | VERIFIED | SRC-CODE | |
| Category names | Deluxe Room, Super Deluxe Room, Premium Room | VERIFIED (code) / CONFLICT | SRC-CODE vs SRC-TA "Deluxe, Super Deluxe, **Superior Suites**" vs SRC-TRIP "Deluxe, **Superior**, Premium" | Hotel to confirm the public names |
| Per-category inventory | 10 / 10 / 9 | PLACEHOLDER | `commerce.ts:159-164`, marked "development-only" | SRC-TRIP shows 7 / 5 / 9. Hotel input is required. |
| Base rates (₹/night, room only) | Deluxe 2,000 · Super Deluxe 2,500 · Premium 3,500 | VERIFIED (internal) | `commerce.ts:142-146` | Live price must always come from the DB or admin, never from copy |
| `indicativeStartingRate` | 2,750 | PLACEHOLDER/ERROR | `hotel.ts:17` | Contradicts the Deluxe rate. Unused. Remove it or derive it from the DB. |
| Room size, bed type, max guests, view | null | MISSING | `rooms.ts` | SRC-TRIP lists 1 King bed per room type (CONFLICT source; do not publish) |
| Check-in / check-out | — | MISSING / CONFLICT | SRC-TRIP "after 14:00 / until 10:00" | Not published until the hotel confirms |
| "Lake view" | Brand name and positioning | **NEEDS CONFIRMATION** | SRC-TA describes "balconies with **city** views" | The hotel must confirm which lake is visible and from which rooms or areas (terrace? restaurant?). Until then, copy must not claim lake views from rooms. |
| Languages | English, Hindi | PROVISIONAL | SRC-TA | |
| Front desk | 24-hour | VERIFIED (code) / PROVISIONAL | `amenities.ts`, SRC-TA, SRC-TRIP | |
| Amenities | AC, free Wi-Fi, free private parking, 24h front desk, room service, on-site restaurant, breakfast, flat-screen TV, work desk, private bathroom | VERIFIED (code) | `amenities.ts:1-12` | "Breakfast" conflicts with SRC-TRIP's "Breakfast not provided". The menu does include a breakfast section, which supports the code. |
| Extra amenities | Coffee shop, ironing service, self-serve laundry, housekeeping, balconies | PROVISIONAL | SRC-TA | |
| Lift / elevator | — | PROVISIONAL | SRC-TRIP | |
| Bathtub in rooms | — | CONFLICT | SRC-TRIP only | Do not publish |
| Children / minimum check-in age | "Main guest ≥18", "children welcome" | CONFLICT | SRC-TRIP only | |
| Smoking | Non-smoking rooms | PROVISIONAL | SRC-TA, SRC-TRIP | |
| Rating | Google 5.0 from 10 reviews (snapshot 2026-09-27) | PROVISIONAL (dated) | `reviews.ts:3-10` | Tripadvisor shows 5.0 from 1 review. Do not emit `aggregateRating` structured data without a live, verifiable source. |
| Review texts | 3 demo reviews | PLACEHOLDER | `reviews.ts:12-17` | Must never be displayed as real |
| Nearby places | Singapore Mall, Indira Gandhi Pratishthan, Dr. B. R. Ambedkar Memorial, CCS International Airport, Lucknow railway connectivity | VERIFIED as names only | `nearby.ts` | **No distances are published.** SRC-TRIP gives distances (airport 26.9 km, Malhaur station 3.18 km): CONFLICT source, do not publish. |
| Janeshwar Mishra Park, Dr. Ram Manohar Lohia Park, Ambedkar Memorial Park "within a short drive" | — | PROVISIONAL | Search-result summary of SRC-TA | Confirm before using in copy |
| Owner and management names | — | NOT PUBLIC | | The AI must not answer unless a fact is marked public and verified |
| Policies (cancellation, ID, children, extra beds) | Generic text | PLACEHOLDER | `policies.ts:1-4` | Needs hotel-approved text |
| Offers (3) | Concept text | PLACEHOLDER | `offers.ts` (`demo:true`) | |
| Local experiences | | PLACEHOLDER | `localExperiences.ts:3` | |
| Editorial times (06:30 / 12:30 / 17:45 / 20:30; 07:30 / 09:30 / 17:45 / 20:00) | Narrative only | PLACEHOLDER | `experience.ts` | Not service hours. Never present them as hours. |
| FAQ "booking request… confirmation later" | Stale | OBSOLETE | `faq.ts:4` (unused) | Contradicts live booking |

### 2.1 CONFLICT record: "The Byke Boutique Tejjora"

| Attribute | Tejjora Lake View (code, SRC-TA) | Byke listing (SRC-TRIP) |
|---|---|---|
| Name | Tejjora Lake View | The Byke Boutique Tejjora |
| Address | **C-**1/242, Vikalp Khand, Gomti Nagar | 1/242, Vikalp Khand, Gomti Nagar |
| PIN | 226010 | 226028 |
| Phone | +91 96211 34909 | +91 93728 02568 |
| Rooms | 29 | 28 (Deluxe 7, Superior 5, Premium 9) |
| Check-in/out | — | after 14:00 / 00:00–10:00 |
| Breakfast | Served (menu) | "Not provided" |

**Decision (user, 2026-10-04):** relationship unknown. Record here only; publish nothing from the Byke listing. If it turns out to be the same property under another operator or brand, the hotel should request that OTAs correct the listing, because NAP inconsistency harms local SEO.

## 3. Restaurant menu (SRC-MENU)

### 3.1 Document facts

| Field | Value | Status |
|---|---|---|
| Cover title | "Room Menu" (in-room dining). The cover's script text may read "Room Menue". | VERIFIED |
| File title | "Menu Veg" | VERIFIED. **However, the menu contains egg dishes.** Never describe it as "pure vegetarian". |
| Currency | ₹, two decimals in source | VERIFIED |
| Restaurant public name | — | MISSING. The code uses "Tejjora Restaurant" with `publicBrandNameConfirmed:false`. |
| Opening time / service hours | — | MISSING |
| Last order | 10:30 pm | SUPERSEDED — the last-order feature was removed (migration `006_drop_last_order_time.sql`); ordering has no time-of-day cut-off. Do not reintroduce without owner approval. |
| Minimum order time | 30–40 minutes | VERIFIED |
| Cancellation | "Once the Order is Placed it can not be cancelled" | VERIFIED |
| Price changes | "Prices and availability are subject to change without prior notice" | VERIFIED |
| Allergies | "Please inform us if you are Allergic to any of the ingredients." | VERIFIED. This is the only allergy statement. |
| Taxes | "Taxes as Applicable" | VERIFIED |
| Service charge | "Service charge of 5% is excluded of the rates" | VERIFIED |
| Cover imagery | Misty lake with mountains | PLACEHOLDER/STOCK. **Not a Tejjora view.** Never use it as property media. |

### 3.2 Items

"Source spelling" is recorded wherever the display name was normalised. The hotel must approve the normalised spellings. Egg items are flagged **E**, derived only from the item name. No other dietary labels are derived.

**Beverages**

| Item | Variants / notes | ₹ |
|---|---|---|
| Mineral Water | | 30 |
| Cold Drink | | 60 |
| Soda | | 30 |
| Fresh Lime | Water/Soda (Sweet/Salted/Masala) | 70 |
| Preserved Juice | Orange/Mango/Pineapple (source: "Pinapple") | 100 |
| Tea | Masala/Ginger/Black Tea/Lemon Tea | 50 |
| Ice Tea | | 60 |
| Milk | Chocolate/Plain | 80 |
| Coffee | Black/Regular | 90 |
| Cold Coffee | Plain/With Ice cream | 100 |
| Lassi | Sweet/Salted | 110 |
| Vanilla Ice-Cream Shake | | 110 |

**Breakfast**

| Item | Variants / notes | ₹ |
|---|---|---|
| Boiled Egg **E** | 2 pc | 50 |
| Cheese Omelette **E** | Two eggs | 120 |
| Choice of Paratha | 2 pc; Aloo/Gobhi/Mix/Paneer; served with yogurt & pickle | 150 |
| Poori Bhaji | 4 pc; deep-fried whole-wheat bread served with spiced potato preparation, pickle and masala onion | 150 |
| Chola Bhatura | 2 pc; Punjabi-style spicy chickpea curry served with puffy Indian bread | 120 |
| Toasted Bread | 4 pc; Butter/Jam | 80 |
| Egg Bhurji **E** | | 120 |

**Sandwich**

| Item | ₹ |
|---|---|
| Cheese Sandwich | 150 |
| Vegetables Sandwich | 150 |
| Vegetables Grilled Sandwich | 150 |
| The Club Sandwich | 170 |

The Club Sandwich's ingredients are not stated, so do not label it.

**Soups** (column header "Veg"; no non-veg column exists)

| Item | ₹ |
|---|---|
| Cream of Tomato | 110 |
| Cream of Mushroom | 110 |
| Sweet Corn | 110 |
| Hot N Sour | 110 |
| Manchow | 110 |

**Appetizers** (the source has Half/Full columns, but **only one price per row is printed, under Full**; half prices are MISSING)

| Item | Source spelling | Full ₹ |
|---|---|---|
| Paneer Tikka | | 300 |
| Hara Bhara Kabab | "Harab Bhara Kabab" | 280 |
| Paneer Hariyali Tikka | | 300 |
| Mushroom Tikka | "Mashroom Tikka" | 350 |
| Paneer Malai Tikka | | 350 |
| French Fries | | 175 |
| Potato Wedges | | 100 |
| Peanut Masala | | 100 |
| Fried Papad | | 80 |
| Roasted Papad | | 25 |
| Papad Masala | | 40 |
| Crispy American Corn | | 175 |
| Veg Spring Roll (8 pc) | | 180 |
| Assorted Pakoda | "Asorted Pakoda" | 175 |

**Chinese (Starters)**

| Item | Source spelling | ₹ |
|---|---|---|
| Veg Manchurian (Dry) | | 160 |
| Mushroom Chilli | "Mushroom Chilly" | 220 |
| Crispy Vegetables Honey Chilli Potato | "…Honey Chilly Potato" | 180 |
| Ginger Garlic Paneer Pepper | "GingerGarlic Paneer Papper" | 230 |
| Paneer Chilli (Dry) | | 250 |
| Paneer 65 | | 250 |
| Paneer (8 pc; Salted/Pakoda) | | 200 |

**Chinese Main Course**

| Item | ₹ |
|---|---|
| Mushroom Chilli (Gravy) | 300 |
| Paneer Chilli (Gravy) | 300 |
| Vegetable Manchurian (Gravy) | 300 |
| Vegetable Noodles | 250 |
| Paneer Noodles | 200 ⚠ priced lower than Vegetable Noodles. Confirm. |
| Veg Fried Rice | 250 |
| Paneer Fried Rice | 280 |
| Egg Fried Rice **E** | 250 |

**Indian Main Course (Veg)**

| Item | ₹ |
|---|---|
| Paneer Butter Masala | 280 |
| Paneer Do-Pyaza | 280 |
| Handi Paneer | 280 |
| Kadhai Paneer | 300 |
| Shahi Paneer | 300 |
| Paneer Bhurji | 300 |
| Zeera Aloo | 175 |
| Aloo Gobhi | 180 |
| Mix Vegetables | 250 |
| Vegetables Kofta | 250 |
| Malai Kofta | 250 |
| Dal Arhar Tadka | 160 |
| Dal Makhani | 250 |
| Dal Punjabi Tadka | 300 |
| Dal Fry | 250 |

**Salad and Raita**

| Item | ₹ |
|---|---|
| Fresh Green Salad | 60 |
| Plain Curd | 70 |
| Aloo Raita | 110 |
| Mix Veg Raita | 110 |
| Boondi Raita | 110 |
| Pineapple Raita | 110 |

**Indian Breads**

| Item | ₹ |
|---|---|
| Tawa Roti | 25 |
| Butter Tawa Roti | 30 |
| Tawa Laccha Paratha | 35 |
| Naan | 40 |
| Missi Roti | 40 |

**Rice and Biryani**

| Item | ₹ |
|---|---|
| Steamed Rice | 150 |
| Zeera Rice | 175 |
| Veg Pulao | 175 |
| Veg Dum Biryani | 280 |
| Egg Biryani **E** | 250 |

**Desserts**

| Item | ₹ |
|---|---|
| Scoop of Ice-Cream (2 scoops) | 120 |
| Hot Gulab Jamun (2 pc) | 100 |

**Totals:** 90 items in 12 sections; 5 egg items (E). Cuisine labels supported by the item names: North Indian, Indo-Chinese, breakfast and snacks. The menu itself does not use these labels, so in schema.org use them only as `servesCuisine`, phrased as a description.

## 4. Media ledger

| Asset | Path | Provenance | Status | Allowed use |
|---|---|---|---|---|
| Logo / mark | `public/brand/tejjora-logo.png`, `tejjora-mark.png` (identical files) | Hotel | VERIFIED | Brand |
| AI avatar | `public/brand/TejAI.png` (1.5 MB) | Project-made | Brand asset | Optimise |
| Exterior ×5 | `public/images/exterior/*` (DSC06564, 06723, 06724, 06726, 06729) | Hotel photography (SRC-DRIVE) | VERIFIED | Any |
| Lobby ×4 | `public/images/lobby/*` (DSC06570, 06574, 06579, 06717) | Hotel | VERIFIED | Any |
| Deluxe ×5 / Super Deluxe ×5 / Premium ×6 | `public/images/rooms/**` | Hotel | VERIFIED photos; **room-type mapping PROVISIONAL** (`assets.ts:1-5`, ASSET-MANIFEST "provisional Set A/B/C") | Confirm which photo shows which category |
| Restaurant ×7 | `public/images/restaurant/*` | Hotel | VERIFIED | Any |
| Hero video | `public/videos/tejjora-hero-{desktop,mobile}.mp4` (byte-identical) | Unknown. Confirm the footage is the property. | PROVISIONAL | Re-encode the mobile version |
| Hero posters | `public/images/hero/video-poster-*.webp` | Frame from the video | PROVISIONAL | |
| Terrace sequence | `public/d1-d4.png`, `public/m1-m4.png` | **Appears AI-rendered or illustrative.** Origin unrecorded. | PLACEHOLDER | Only with an "Illustrative" label. Never alt-text them as a real Tejjora view (fix `ExperiencePageHero.tsx:20`). |
| Placeholder SVGs | `public/images/placeholders/*.svg` | Project-made gradients | PLACEHOLDER | Neutral slots only |
| 360 demos | `public/panoramas/demo/interior-{living,kitchen}-360.jpg` | Third party, **licence not recorded** | PLACEHOLDER (licence unknown) | Replace with a CC0 panorama such as Poly Haven, and record the licence here |
| Wide panorama preview | `public/images/virtual-tour/wide-panorama-preview.png` | Unknown | PLACEHOLDER | |
| Duplicate posters | `public/images/video-poster-mobile.jpg`, `public/images/hero/video-poster-mobile.jpg` | — | Unreferenced | Candidates for removal |
| Menu cover photo | (inside the PDF) | Stock-like | PLACEHOLDER | Do not reuse |
| **Missing** | Terrace morning/day/evening/night photography, food and breakfast photography, staff and lifestyle shots, 360 equirectangular panoramas, separate mobile hero video | — | — | Needs a shoot or a request to the hotel. The Drive has 27 frames; check whether any unused frames cover these. |

## 5. Open questions for the hotel (blocking publication)

1. Which lake is visible, and from which rooms or areas? Is there a terrace?
2. What are the public room-category names and the inventory per category (10/10/9 vs 7/5/9)?
3. What are each room's size, bed type, maximum occupancy, view, and whether it has a balcony?
4. What are the check-in and check-out times? What are the cancellation, ID, children and extra-bed policies?
5. What is the restaurant's public name and its opening hours? Are half-portion prices available? Is the Paneer Noodles price of ₹200 correct?
6. What public email address and social profiles should be listed? Are the Google Business Profile coordinates verified?
7. What is the relationship between Tejjora Lake View and "The Byke Boutique Tejjora"?
8. Is the hero video footage of this property? Where did the terrace images d1–d4 and m1–m4 come from?
9. Will the hotel enable Google Places API billing for live reviews? (The free monthly credit still requires a GCP billing account.)
