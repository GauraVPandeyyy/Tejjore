import type { AiKnowledgeEntry, Announcement, MediaProvenance, Offer, Policy, PropertyFact, Testimonial } from "./types";

/**
 * Publication rules. Every public getter applies these to database rows AND to fallback data,
 * so neither path can expose content the content ledger forbids. SQL filters are an
 * optimisation; these functions are the authority.
 */

/** Calendar date in India (the hotel's time zone), YYYY-MM-DD. */
export function indiaDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Facts: verified AND public. Provisional, placeholder and conflict facts never go public. */
export const isPublicFact = (fact: Pick<PropertyFact, "status" | "public">) => fact.status === "verified" && fact.public === true;

/** Offers: published, not demo, and today (India) inside the validity window. */
export function isActiveOffer(offer: Pick<Offer, "published" | "isDemo" | "validFrom" | "validTo">, now: Date) {
  if (!offer.published || offer.isDemo) return false;
  const today = indiaDate(now);
  if (offer.validFrom && today < offer.validFrom) return false;
  if (offer.validTo && today > offer.validTo) return false;
  return true;
}

/** Testimonials: genuine (never demo), published, with the guest's consent. */
export function isPublicTestimonial(item: Pick<Testimonial, "published" | "consent" | "source" | "sourceUrl">) {
  if (!item.published || !item.consent || item.source === "demo") return false;
  if ((item.source === "google" || item.source === "tripadvisor") && !item.sourceUrl) return false;
  return true;
}

/** Policies are hotel policy only once published AND approved. */
export const isPublicPolicy = (policy: Pick<Policy, "published" | "approvedAt">) => policy.published && Boolean(policy.approvedAt);

/** AI knowledge: public AND approved. */
export const isUsableKnowledge = (entry: Pick<AiKnowledgeEntry, "public" | "approved">) => entry.public && entry.approved;

/** Announcements: published and inside the publication window. */
export function isLiveAnnouncement(item: Pick<Announcement, "published" | "publishFrom" | "publishUntil">, now: Date) {
  if (!item.published) return false;
  const time = now.getTime();
  if (item.publishFrom && time < Date.parse(item.publishFrom)) return false;
  if (item.publishUntil && time >= Date.parse(item.publishUntil)) return false;
  return true;
}

/** Media that may be shown as Tejjora property photography (rooms, gallery). */
export const isPropertyMedia = (provenance: MediaProvenance) => provenance === "tejjora" || provenance === "licensed";
