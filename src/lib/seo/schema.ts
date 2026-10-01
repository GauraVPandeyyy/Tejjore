import { hotel } from "@/data/hotel";
import { homeFaqs } from "@/data/hospitality";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://example.com";

export const hotelSchema = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  "@id": `${baseUrl}/#hotel`,
  name: hotel.name,
  url: baseUrl,
  telephone: hotel.phoneDisplay,
  address: {
    "@type": "PostalAddress",
    streetAddress: hotel.address.line1,
    addressLocality: hotel.address.city,
    addressRegion: hotel.address.state,
    postalCode: hotel.address.postalCode,
    addressCountry: "IN",
  },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Free private parking", value: true },
    { "@type": "LocationFeatureSpecification", name: "24-hour front desk", value: true },
    { "@type": "LocationFeatureSpecification", name: "On-site restaurant", value: true },
  ],
};

export const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: `Restaurant at ${hotel.name}`,
  url: `${baseUrl}/dining`,
  telephone: hotel.phoneDisplay,
  servesCuisine: "Restaurant dining",
  address: hotelSchema.address,
  parentOrganization: { "@id": `${baseUrl}/#hotel` },
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeFaqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};
