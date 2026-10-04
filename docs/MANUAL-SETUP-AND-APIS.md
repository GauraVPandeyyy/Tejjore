> **V3 database update:** Production booking persistence now requires PostgreSQL via `DATABASE_URL`. Run `npm run db:migrate` after configuring the database. The old JSON booking store is local-development fallback only. See `docs/V3-LUXURY-AND-DATABASE-AUDIT.md`.

# Tejjora Lake View — Manual Setup & External Integrations

This document lists the production credentials and business inputs that cannot be invented in code. The application is designed to keep working in a safe fallback/demo mode where possible.

## 1. Public site URL and Search Console

**Why:** canonical URLs, sitemap, social sharing and Google Search Console verification.

**Environment variables**
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
```

Use the final HTTPS production domain. Obtain the verification token from Google Search Console. Search Console itself does not require an application API key for normal site verification.

## 2. Google Maps Embed API

**Why:** interactive hotel location map.

**API / SDK:** Google Maps Embed API.

**Credentials:** create a browser key in Google Cloud Console and enable Maps Embed API.

```env
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID=
```

**Restrictions:** restrict the key by HTTP referrer to the production domain and restrict the key to Maps Embed API. Google Maps Platform requires a billing-enabled Cloud project; current pricing/credits should be checked in Google Cloud before launch.

**Fallback:** without a key the website keeps the designed location experience and opens Google Maps directions externally.

## 3. Google Places API (New) / Google Reviews

**Why:** genuine rating, review count and supported Google review content.

**API:** Places API (New), server-side Place Details.

```env
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACE_ID=
```

Create a server-side key in Google Cloud Console. Restrict it to Places API (New) and to the server environment where possible. Do not expose this key with `NEXT_PUBLIC_`.

**Fallback:** the website displays the dated Google rating snapshot plus clearly identified demo review cards. Replace the fallback automatically by supplying valid credentials.

## 4. Razorpay

**Why:** online reservation payment.

Get Test/Live API credentials from Razorpay Dashboard.

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
PAYMENT_TEST_MODE=false
```

Webhook endpoint:
```text
/api/payments/webhook
```

Configure signed webhook delivery for payment/order events used by the application. Keep the key secret and webhook secret server-only. Run in Razorpay test mode until inventory, pricing, tax and cancellation rules are approved.

Production payment also requires:
```env
BOOKING_MODE=production
BOOKING_PRODUCTION_READY=true
```

## 5. Transactional booking email — Resend

**Why:** send a confirmation after the reservation reaches a confirmed paid state.

Create an account at Resend, verify the sending domain/address and create a server API key.

```env
RESEND_API_KEY=
BOOKING_EMAIL_FROM="Tejjora Lake View <bookings@your-domain.example>"
```

The booking itself does not depend on email delivery. If email is unavailable or fails, the confirmed reservation remains valid and the guest can use Manage Booking.

## 6. Optional Gemini concierge language layer

**Why:** make structured concierge answers read more naturally while keeping rates, availability, policies and booking/payment state grounded in application data.

Create a Google Gemini API key and choose an available text model.

```env
CONCIERGE_LANGUAGE_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_CONCIERGE_MODEL=
```

If any of these are absent, the deterministic hybrid concierge remains fully functional. Never make the model the source of truth for dynamic hotel facts.

## 7. Booking persistence / future database or PMS

Current internal persistence uses a private JSON store suitable for local/single-server deployment:

```env
BOOKING_STORE_PATH=/private/persistent/path/tejjora-booking-store.json
```

Do not rely on an ephemeral serverless filesystem in production. For serverless or multi-instance deployment, replace the repository implementation with a database/PMS adapter through the existing provider boundary.

Future PMS/channel-manager placeholders:
```env
PMS_API_URL=
PMS_API_KEY=
```

The exact provider/API depends on the hotel's chosen PMS/channel manager.

## 8. Actual inventory and commercial rules

Replace development inventory with hotel-approved category counts:
```env
INVENTORY_DELUXE=
INVENTORY_SUPER_DELUXE=
INVENTORY_PREMIUM=
```

Approve and configure any applicable commercial values instead of guessing them:
```env
NEXT_PUBLIC_INCLUDED_ADULTS_PER_ROOM=
NEXT_PUBLIC_EXTRA_ADULT_CHARGE=
NEXT_PUBLIC_CHILD_CHARGE=
NEXT_PUBLIC_RATE_PLAN_CONFIG_JSON=
NEXT_PUBLIC_ADDON_CONFIG_JSON=
PROMO_CODES_JSON=
NEXT_PUBLIC_TAX_CONFIGURED=false
NEXT_PUBLIC_TAX_RATE_BPS=0
NEXT_PUBLIC_SERVICE_CHARGE_CONFIGURED=false
NEXT_PUBLIC_SERVICE_CHARGE_BPS=0
```

`PROMO_CODES_JSON` is deliberately server-only so promo codes are never published in the browser bundle. The booking page shows that an entered code will be checked; the discount is applied when the room is held.

The hotel must also provide its final cancellation/refund, check-in/check-out, ID, child and extra-person policies before they are published as contractual terms.

## 9. Admin staff access

Generate scrypt hashes with:
```bash
node scripts/generate-admin-hash.mjs "strong-password"
```

Then configure:
```env
ADMIN_USERS_JSON=
ADMIN_SESSION_SECRET=
ADMIN_ALLOW_MANUAL_CONFIRM=false
```

Use a random session secret of at least 32 characters. Keep staff credentials server-only.

## 10. Google Analytics 4

**Why:** conversion/event analytics. Existing `track()` events bridge to GA when configured.

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Create the web data stream in Google Analytics. No-op when omitted.

## 11. Public hotel email

Optional until the hotel approves a public mailbox:
```env
NEXT_PUBLIC_HOTEL_EMAIL=
```

Do not invent an address. Phone and WhatsApp remain available without this value.

## 12. WhatsApp

Current implementation uses click-to-chat (`wa.me`) and therefore needs no WhatsApp Business API credential. If automated transactional WhatsApp messages are wanted later, integrate Meta WhatsApp Cloud API separately behind a messaging provider.

## 13. CAPTCHA / bot protection

Not currently required for basic operation because sensitive endpoints have server-side validation/rate controls. If production traffic/abuse warrants it, add Cloudflare Turnstile or hCaptcha behind a verification adapter. This is not silently treated as implemented.

## 14. 360° / Marzipano media

The supplied 2:1 reference panorama is already wired into the reusable viewer. Replace reference media with genuine Tejjora 360×180 equirectangular captures (2:1) scene-by-scene. Do not use non-2:1 wide images as complete spherical panoramas.

## 15. Final content inputs to approve

Before launch, confirm:
- exact room size, bed type, occupancy and room-specific views;
- restaurant name (if distinct), cuisine, operating hours and approved menu;
- genuine offers/packages and inclusions;
- check-in/check-out and cancellation/refund policies;
- final public hotel email/social profiles;
- final room/restaurant/lake/food photography and Tejjora spherical panoramas.
