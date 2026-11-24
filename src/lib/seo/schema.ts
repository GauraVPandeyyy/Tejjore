import type { Faq, FactValue, PublicFacts } from "@/lib/content/types";
import { siteUrl } from "@/lib/site";

/**
 * Structured data built only from public, VERIFIED property facts (content layer) and published
 * FAQs. A fact that is not verified + public is simply omitted; no aggregateRating is emitted.
 */
type JsonLd = Record<string, unknown>;

type Address = { streetAddress: string; locality: string; city: string; region: string; postalCode: string; country: string };

const isRecord = (value: FactValue | undefined): value is { [key: string]: FactValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function address(facts: PublicFacts): JsonLd | undefined {
  const value = facts.get("address");
  if (!isRecord(value)) return undefined;
  const fields = ["streetAddress", "locality", "city", "region", "postalCode", "country"] as const;
  if (!fields.every((field) => typeof value[field] === "string")) return undefined;
  const parts = value as unknown as Address;
  return {
    "@type": "PostalAddress",
    // Locality kept in the street line so the published NAP matches the hotel's address exactly.
    streetAddress: `${parts.streetAddress}, ${parts.locality}`,
    addressLocality: parts.city,
    addressRegion: parts.region,
    postalCode: parts.postalCode,
    addressCountry: parts.country,
  };
}

function telephone(facts: PublicFacts) {
  const value = facts.get("phone");
  return isRecord(value) && typeof value.display === "string" ? value.display : undefined;
}

/** Amenities the hotel schema advertises, each emitted only while it is a verified public fact. */
const SCHEMA_AMENITIES = ["Free Wi-Fi", "Free private parking", "24-hour front desk", "On-site restaurant"];

export function hotelSchema(facts: PublicFacts): JsonLd | null {
  const name = facts.text("name");
  if (!name) return null;
  const baseUrl = siteUrl();
  const amenities = facts.get("amenities");
  const verifiedAmenities = Array.isArray(amenities) ? amenities.filter((item): item is string => typeof item === "string") : [];
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "@id": `${baseUrl}/#hotel`,
    name,
    url: baseUrl,
    telephone: telephone(facts),
    address: address(facts),
    amenityFeature: SCHEMA_AMENITIES.filter((label) => verifiedAmenities.includes(label)).map((label) => ({
      "@type": "LocationFeatureSpecification",
      name: label,
      value: true,
    })),
  };
}

export function restaurantSchema(facts: PublicFacts): JsonLd | null {
  const name = facts.text("name");
  if (!name) return null;
  const baseUrl = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    // The restaurant's own public name is unconfirmed (content ledger), so it is described by the hotel.
    name: `Restaurant at ${name}`,
    url: `${baseUrl}/dining`,
    telephone: telephone(facts),
    servesCuisine: "Restaurant dining",
    address: address(facts),
    parentOrganization: { "@id": `${baseUrl}/#hotel` },
  };
}

export function faqSchema(faqs: Faq[]): JsonLd | null {
  if (!faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export const presentSchemas = (...items: Array<JsonLd | null>) => items.filter((item): item is JsonLd => item !== null);
