# Stage 12.2 — Information Architecture + Multi-page Restructure

## Audit

The Stage 12.1 homepage still contained nearly every major story and utility in one continuous route: hotel story, terrace sequence, rooms, comparison, virtual tour preview, restaurant, day narrative, Why Tejjora, Plan My Stay, location, reviews, gallery, direct-stay reassurance and final conversion. The content itself was useful, but concentrating all of it on `/` made the homepage feel longer than the guest decision journey required and reduced the value of deeper navigation.

The existing dedicated routes `/rooms`, `/book`, `/virtual-tour` and `/arrival` already had clear product responsibilities, so the remediation should extend that architecture rather than rebuild it.

## Architecture decision

The final public IA for this sub-stage is intentionally small:

- `/` — high-impact discovery and conversion summary
- `/rooms` — full room discovery, galleries and comparison
- `/experience` — dining, daily stay rhythm, hotel reasons, gallery and virtual-tour preview
- `/plan-your-stay` — interactive trip/stay planner
- `/location` — directions, address and nearby-place decision support
- `/virtual-tour` — immersive scene-based exploration
- `/book` — booking flow
- `/arrival` — guest utility route; retained outside primary navigation and remains noindex

### Why these pages exist

`/rooms` already has enough depth and direct booking relevance to remain dedicated.

`/experience` consolidates secondary hospitality storytelling that belongs together. Dining alone currently lacks enough verified menu/timing/food depth to justify a separate restaurant page, while gallery/reasons/day-story alone would create thin pages. Combining them creates one meaningful experiential route.

`/plan-your-stay` deserves its own route because it is an interactive conversion product, not just marketing copy. It can now be linked from rooms, navigation and concierge without forcing users back to a deep homepage anchor.

`/location` deserves a dedicated route because route planning and nearby landmarks directly affect booking confidence and will later receive the real map integration in Stage 12.4.

No separate About, Gallery, Reviews, Amenities, Contact or Restaurant routes were created because their current content is stronger when combined into the guest journey rather than split into thin pages.

## Homepage decision

The homepage is now limited to the content with the highest first-visit value:

1. Cinematic hero + booking entry
2. The Place introduction
3. Signature Morning → Day → Evening → Night terrace story
4. Three-room discovery
5. One consolidated Beyond the Room gateway
6. Google rating snapshot/trust signal
7. Compact location preview
8. Final booking/contact invitation

The following full sections were removed from the homepage and relocated rather than deleted:

- room comparison → `/rooms`
- full virtual-tour preview → `/experience` plus `/virtual-tour`
- restaurant experience → `/experience#restaurant`
- A Day at Tejjora → `/experience`
- Why Tejjora → `/experience`
- full Plan My Stay → `/plan-your-stay`
- full location experience → `/location`
- gallery → `/experience#gallery`
- separate Direct Stay strip → retained on deeper pages where it supports conversion

## Navigation

Primary navigation is now task-oriented and page-based:

- Rooms
- Experience
- Location
- Plan My Stay

The persistent `Check dates` action remains separate as the primary conversion CTA.

Secondary/mobile utility navigation contains:

- Virtual Tour
- Dining
- Gallery
- Smart Arrival

This prevents the desktop header and mobile menu from becoming a sitemap dump.

## Link migration

Old deep-home links such as `/#restaurant`, `/#plan-my-stay` and `/#location` were migrated to their new routes. Concierge actions, Smart Arrival links and room-page planner handoffs now point to the new architecture.

## What was intentionally not done

- No fake new content was added to create extra pages.
- `/arrival` was not promoted into primary navigation because it is a post-booking utility.
- The custom location diagram remains for now; Stage 12.4 owns the real map/provider replacement.
- Homepage signature hero/terrace mobile motion is unchanged here; Stage 12.3 owns that redesign.
- No SEO schema/sitemap work was mixed into this sub-stage.
