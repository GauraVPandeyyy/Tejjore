import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeJourney } from "@/components/home/HomeJourney";
import { WaterlineDay } from "@/components/home/WaterlineDay";
import { HomeDining, HomeExplore, HomeFaq, HomeImpressions, HomeFacilities, HomeInvitation, HomeOffers, HomeRooms, HomeStory } from "@/components/home/HomeSections";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { SiteIntroLoader } from "@/components/layout/SiteIntroLoader";
import { StructuredData } from "@/components/seo/StructuredData";
import { faqSchema, hotelSchema, presentSchemas } from "@/lib/seo/schema";
import { getPublicPropertyFacts } from "@/lib/content/facts";
import { getPublishedFaqs } from "@/lib/content/faqs";
import { getActiveOffers } from "@/lib/content/offers";
import { getRestaurantMenu } from "@/lib/content/restaurant";
import { getRooms } from "@/lib/content/rooms";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Tejjora Lake View | Boutique Hotel in Gomti Nagar, Lucknow",
  description:
    "Stay at Tejjora Lake View, a boutique hotel in Gomti Nagar, Lucknow — three room categories, an in-house restaurant and direct booking with the hotel.",
  alternates: { canonical: "/" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/", baseMetadata);
}

// Content reads are tag-cached; this is the time-based safety net (seconds).
export const revalidate = 600;

/**
 * Home: hero (photographic cycle + booking console) → story → rooms → Arrive/Rest/Dine photo story →
 * facilities → Waterline Day (pinned scroll) → impressions → dining → [offers] → [reviews] → explore
 * bands → FAQ → invitation (into the footer). Offers and reviews render only when real, published
 * content exists.
 */
export default async function HomePage() {
  const [{ data: facts }, { data: faqs }, { data: rooms }, { data: menu }, { data: offers }] = await Promise.all([
    getPublicPropertyFacts(),
    getPublishedFaqs(),
    getRooms(),
    getRestaurantMenu(),
    getActiveOffers(),
  ]);
  const totalRooms = facts.get("rooms.total");
  const dishCount = menu.reduce((sum, category) => sum + category.items.length, 0);
  const dishNote = dishCount ? `${menu.length} sections and ${dishCount} dishes on the menu` : null;
  // Only the FAQs shown on this page are described in its FAQPage data.
  const shownFaqs = faqs.slice(0, 4);
  return (
    <main className="tj-home">
      <SiteIntroLoader />
      <StructuredData data={presentSchemas(hotelSchema(facts), faqSchema(shownFaqs))} />
      <HomeHero />
      <HomeStory totalRooms={typeof totalRooms === "number" ? totalRooms : null} />
      <HomeRooms rooms={rooms} />
      <HomeJourney totalRooms={typeof totalRooms === "number" ? totalRooms : null} dishNote={dishNote} />
      <HomeFacilities />
      <WaterlineDay />
      <HomeImpressions />
      <HomeDining menu={menu} />
      <HomeOffers offers={offers} />
      <ReviewsSection />
      <HomeExplore />
      <HomeFaq faqs={shownFaqs} />
      <HomeInvitation />
    </main>
  );
}
