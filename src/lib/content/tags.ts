/**
 * Cache tags, one per content domain. Phase 3 admin mutations invalidate only the domains they
 * touch (see revalidate.ts), never the whole site.
 */
export const CONTENT_TAGS = {
  rooms: "tejjora:rooms",
  media: "tejjora:media",
  facts: "tejjora:facts",
  offers: "tejjora:offers",
  faq: "tejjora:faq",
  policies: "tejjora:policies",
  testimonials: "tejjora:testimonials",
  announcements: "tejjora:announcements",
  menu: "tejjora:menu",
  restaurant: "tejjora:restaurant",
  seo: "tejjora:seo",
  tour: "tejjora:tour",
  aiKnowledge: "tejjora:ai-knowledge",
  /** Public room rates (booking operations: Admin → Rooms base rates and dated rates). */
  rates: "tejjora:rates",
} as const;

export type ContentDomain = keyof typeof CONTENT_TAGS;

/** Time-based safety net (seconds). Admin edits revalidate by tag immediately. */
export const CONTENT_REVALIDATE_SECONDS = 600;
