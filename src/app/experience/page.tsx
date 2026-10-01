import type { Metadata } from "next";
import { ExperiencePageHero } from "@/components/hotel/ExperiencePageHero";
import { DayAtTejjora } from "@/components/hotel/DayAtTejjora";
import { WhyTejjora } from "@/components/hotel/WhyTejjora";
import { VirtualTourPreview } from "@/components/virtual-tour/VirtualTourPreview";
import { DirectStayBanner } from "@/components/hotel/DirectStayBanner";
import { HomeStayReasons } from "@/components/home/HomeStoryBlocks";
import { LocalExperiences } from "@/components/hotel/LocalExperiences";

export const metadata: Metadata = {
  title: "Experiences | Tejjora Lake View, Lucknow",
  description: "Explore ways to spend a stay at Tejjora Lake View, from business trips and city time to terrace moments and local Lucknow experiences.",
  alternates: { canonical: "/experience" },
};

export default function ExperiencePage() {
  return <main className="experience-page experience-page--v2">
    <ExperiencePageHero />
    <DayAtTejjora index="02" />
    <HomeStayReasons />
    <LocalExperiences index="04" />
    <WhyTejjora index="05" />
    <VirtualTourPreview index="06" />
    <DirectStayBanner index="07" />
  </main>;
}
