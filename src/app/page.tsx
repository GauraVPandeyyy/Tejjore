import type { Metadata } from "next";
import { HeroExperience } from "@/components/hero/HeroExperience";
import { HotelStory } from "@/components/hotel/HotelStory";
import { TerraceExperience } from "@/components/hotel/TerraceExperience";
import { RestaurantExperience } from "@/components/restaurant/RestaurantExperience";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { LocationPreview } from "@/components/location/LocationPreview";
import { FinalInvitation } from "@/components/hotel/FinalInvitation";
import {
  HomeAmenities,
  HomeFaqPreview,
  HomeGalleryPreview,
  HomeExperiencesPreview,
  HomeRoomPreview,
  HomeStayReasons,
} from "@/components/home/HomeStoryBlocks";
import { StructuredData } from "@/components/seo/StructuredData";
import { faqSchema, hotelSchema } from "@/lib/seo/schema";
import { SiteIntroLoader } from "@/components/layout/SiteIntroLoader";
import { VideoHero } from "@/components/hero/VideoHero";
import { BookingSearch } from "@/components/booking/BookingSearch";

export const metadata: Metadata = {
  title: "Tejjora Lake View | Boutique Hotel in Gomti Nagar, Lucknow",
  description:
    "Stay at Tejjora Lake View in Gomti Nagar, Lucknow — rooms, dining, terrace-led views, direct booking, location guidance and a virtual hotel preview.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="home-page home-page--v2" id="main-content">
      <SiteIntroLoader />
      <StructuredData data={[hotelSchema, faqSchema]} />
      <BookingSearch />
      <VideoHero />
      <HeroExperience />
      <HotelStory />
      <HomeRoomPreview />
      <HomeStayReasons />
      <RestaurantExperience index="05" />
      <HomeAmenities />
      <TerraceExperience />
      <HomeExperiencesPreview />
      <HomeGalleryPreview />
      <ReviewsSection index="10" />
      <LocationPreview />
      <HomeFaqPreview />
      <FinalInvitation index="12" />
    </main>
  );
}
