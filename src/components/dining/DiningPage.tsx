import Image from "next/image";
import Link from "next/link";
import { diningStory } from "@/data/dining";
import { restaurant } from "@/data/restaurant";
import { hotel } from "@/data/hotel";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function DiningPage() {
  const whatsapp = `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I would like to enquire about dining at the restaurant.")}`;
  const diningFacts = [
    ["Breakfast", restaurant.servesBreakfast ? "Available" : "Confirm with hotel"],
    ["Vegetarian breakfast", restaurant.vegetarianBreakfastAvailable ? "Available" : "Confirm with hotel"],
    ["Current menu", restaurant.menuUrl ? "View online" : "Ask the hotel"],
    ["Dining timings", restaurant.timings ?? "Confirm with hotel"],
  ] as const;

  return (
    <>
      <section className="v3-internal-hero v3-internal-hero--dining" aria-labelledby="dining-page-title">
        <div className="v3-internal-hero__media">
          <Image src={diningStory.image} alt="Dining room at Tejjora Lake View" fill priority sizes="100vw" />
          <span className="v3-internal-hero__veil" />
        </div>
        <div className="site-container v3-internal-hero__content">
          <SectionLabel index="01">DINING</SectionLabel>
          <h1 id="dining-page-title">Come for breakfast.<br /><em>Stay for the table.</em></h1>
          <p>{diningStory.intro}</p>
          <div className="restaurant-v3__actions">
            <a className="v3-liquid-button v3-liquid-button--cream" href={whatsapp}><span>Dining enquiry</span><i aria-hidden="true">↗</i></a>
            <Link className="v3-inline-link v3-inline-link--light" href="/book">Book a stay <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="v3-dining-editorial">
        <div className="site-container v3-dining-editorial__grid">
          <div>
            <SectionLabel index="02">THE ROOM</SectionLabel>
            <h2>A bright room downstairs,<br /><em>part of the rhythm of the hotel.</em></h2>
          </div>
          <div className="v3-dining-editorial__copy">
            <p>{diningStory.ambience}</p>
            <p>Tejjora lists breakfast and vegetarian breakfast options. Exact timings, current menu and inclusions are intentionally confirmed by the hotel rather than guessed on the website.</p>
          </div>
        </div>
      </section>

      <section className="v3-dining-gallery" aria-label="Tejjora dining room photography">
        <div className="site-container">
          <div className="v3-dining-gallery__lead">
            <SectionLabel index="03">AROUND THE TABLE</SectionLabel>
            <h2>See the room.<br /><em>Then decide how you want to use it.</em></h2>
          </div>
          <div className="v3-dining-gallery__grid">
            {restaurant.images.slice(0, 6).map((src, index) => (
              <figure key={src} data-index={index}>
                <Image src={src} alt={`Tejjora restaurant interior ${index + 1}`} fill sizes="(max-width:760px) 92vw, 34vw" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="v3-dining-facts">
        <div className="site-container">
          <div className="v3-dining-facts__head">
            <SectionLabel index="04">GOOD TO KNOW</SectionLabel>
            <h2>Useful details,<br /><em>without pretending.</em></h2>
          </div>
          <div className="v3-dining-facts__grid">
            {diningFacts.map(([label, value]) => (
              <div key={label}><small>{label}</small><strong>{value}</strong></div>
            ))}
          </div>
          <div className="v3-dining-facts__cta">
            <p>For the current menu, meal timings or a table enquiry, speak directly with Tejjora.</p>
            <a className="v3-liquid-button v3-liquid-button--dark" href={whatsapp}><span>Ask the hotel</span><i aria-hidden="true">↗</i></a>
          </div>
        </div>
      </section>
    </>
  );
}
