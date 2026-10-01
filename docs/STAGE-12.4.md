# Stage 12.4 — Location + Genuine Google Review Integration

## Audit

The dedicated Location page still used a custom pseudo-map graphic. It matched the brand but did not help a guest understand the real position of the hotel. Reviews were correctly presented as a dated snapshot, but there was no production path for genuine live Google review data.

## Location strategy

Use the official Google Maps Embed API when a browser-safe restricted key is configured. The embedded map remains inside a custom Tejjora frame rather than being dropped into an unstyled page.

- Interactive place map via Maps Embed API `place` mode.
- Prefer a configured Google Place ID; fall back to the exact hotel address as the query.
- Lazy-load the iframe.
- Keep browser geolocation opt-in only for the existing “Route from my location” action.
- If no Embed API key exists, show an honest designed fallback with a direct Google Maps link; do not show a fake graphic map.

Required public configuration:

- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID` (recommended)

The Embed API key should be HTTP-referrer restricted and limited to the Maps Embed API.

## Google review strategy

Use Places API (New) Place Details on the server only. Do not scrape Google and do not put the Places server key in the browser.

The provider requests only:

- rating
- user rating count
- selected reviews
- Google Maps URI

When configured, selected review cards support:

- reviewer name
- author profile URL when returned
- author avatar when returned
- rating
- relative publish time when returned
- review text
- direct source-review link on Google Maps
- Google source attribution

If credentials or Place ID are missing, or Google returns an error, the UI automatically falls back to the existing dated rating snapshot. It does not fabricate review text.

Required server configuration:

- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_PLACE_ID`

## Provider boundary

`src/lib/reviews/provider.ts` owns the external request and fallback normalization. The presentation layer receives one `ReviewFeed` model and does not care whether it came from Google live data or the verified development snapshot.

## Production note

Google Places review content has attribution/source-link requirements. The implemented live card preserves author attribution data and the individual `googleMapsUri` when the API supplies them. Production credentials must be restricted in Google Cloud before deployment.
