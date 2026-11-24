import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfferCard } from "@/components/offers/OfferCard";
import { PillLink } from "@/components/ui/Buttons";
import { CardCarousel } from "@/components/ui/CardCarousel";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getActiveOffers } from "@/lib/content/offers";

export const metadata: Metadata = {
  title: "Offers",
  description: "Current direct-booking offers at Tejjora Lake View, Gomti Nagar, Lucknow.",
  alternates: { canonical: "/offers" },
};

export const revalidate = 600;

/**
 * Offers (masterplan §4): the card grammar with validity dates, shown only while the admin has a
 * published, non-demo offer inside its window. Otherwise the route keeps its old redirect.
 * Display only — the booking pricing engine applies codes when a room is held.
 */
export default async function OffersRoute() {
  const { data: offers } = await getActiveOffers();
  if (!offers.length) redirect("/experience");
  return (
    <main className="tj-page">
      <section className="tj-section tj-section--first" aria-labelledby="offers-page-title">
        <div className="tj-container">
          <SectionIntro id="offers-page-title" as="h1" title="Offers">
            <p>Direct with the hotel. Codes are checked and applied when your room is held.</p>
          </SectionIntro>
          <CardCarousel label="Offers" desktopGrid>
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} headingLevel="h2" showTerms />
            ))}
          </CardCarousel>
          <div className="tj-actions-row">
            <PillLink href="/book" variant="lake" dot>
              Book a stay
            </PillLink>
          </div>
        </div>
      </section>
    </main>
  );
}
