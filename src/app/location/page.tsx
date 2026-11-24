import type { Metadata } from "next";
import { LocationExperience } from "@/components/location/LocationExperience";
import { ArrivalSteps } from "@/components/location/ArrivalSteps";
import { PillLink } from "@/components/ui/Buttons";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Location – Gomti Nagar, Lucknow",
  description: "Find Tejjora Lake View in Vikalp Khand, Gomti Nagar, Lucknow, with directions and useful nearby places.",
  alternates: { canonical: "/location" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/location", baseMetadata);
}

/** Location: arrival hero, interactive map, nearby destinations, the hotel at a glance, then the photographed arrival steps on lake. */
export default function LocationPage() {
  return (
    <main className="tj-page">
      <LocationExperience />
      <section className="tj-impressions lx-arrival" data-header-tone="dark" aria-labelledby="journey-title">
        <div className="tj-container">
          <SectionIntro id="journey-title" title="Your arrival" tone="lake" />
          <ArrivalSteps />
          <div className="tj-actions-row">
            <PillLink href="/book" variant="cream" dot>
              Book a stay
            </PillLink>
            <PillLink href="/arrival" variant="outline-light">
              Smart arrival
            </PillLink>
          </div>
        </div>
      </section>
    </main>
  );
}
