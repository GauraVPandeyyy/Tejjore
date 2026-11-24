import type { Metadata } from "next";
import Image from "next/image";
import { assets } from "@/data/assets";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { StructuredData } from "@/components/seo/StructuredData";
import { operatingNotes } from "@/components/dining/diningFormat";
import { MenuExperience } from "@/components/dining/MenuExperience";
import { MenuWorlds } from "@/components/dining/MenuWorlds";
import { BlurText } from "@/components/motion/BlurText";
import { MaskedHeading } from "@/components/motion/MaskedHeading";
import { MorphText } from "@/components/motion/MorphText";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { TiltFrame } from "@/components/motion/TiltFrame";
import { ArchCarousel } from "@/components/ui/ArchCarousel";
import { PillAnchor, PillLink } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Motion";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { Waterline } from "@/components/ui/Waterline";
import { getPublicPropertyFacts } from "@/lib/content/facts";
import { getRestaurantMenu, getRestaurantSettings } from "@/lib/content/restaurant";
import { presentSchemas, restaurantSchema } from "@/lib/seo/schema";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Dining – Lucknow",
  description: "The in-house restaurant at Tejjora Lake View, Gomti Nagar, Lucknow: the full menu with current prices — breakfast, soups, Indian and Chinese mains, breads, biryani and desserts.",
  alternates: { canonical: "/dining" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/dining", baseMetadata);
}

export const revalidate = 600;

/**
 * Dining — the restaurant destination. A cinematic hero of the real restaurant (title pulled into
 * focus, the menu's own sections morphing beneath it) → the story, revealed as you scroll, with the
 * arch carousel and the verified operating facts → a masked-photograph statement → the menu as
 * worlds (every section, its first dishes and prices, on lake) → [signature dishes, only when
 * flagged] → the full menu and request-to-order in place → the room in photographs and a way to
 * ask. /dining/menu renders the same MenuExperience. Opening hours stay hidden until the hotel sets
 * them; no food photography is implied.
 */
export default async function DiningRoute() {
  const [{ data: facts }, { data: menu }, { data: settings }] = await Promise.all([getPublicPropertyFacts(), getRestaurantMenu(), getRestaurantSettings()]);
  const items = menu.flatMap((category) => category.items);
  const signature = items.filter((item) => item.signature);
  const notes = operatingNotes(settings);
  const photos = assets.restaurant.map((src) => ({ src, alt: "The restaurant at Tejjora Lake View" }));
  const name = settings.publicName ?? "The restaurant";
  const sectionNames = menu.map((category) => category.name);

  return (
    <main className="tj-dining tj-dining--cine">
      <StructuredData data={presentSchemas(restaurantSchema(facts))} />

      <section className="tj-dining-hero" data-hero-overlay="" aria-labelledby="dining-title">
        <ParallaxFrame className="tj-dining-hero__media" speed={9} reveal={false}>
          <Image src={assets.restaurant[0]} alt="The restaurant at Tejjora Lake View" fill priority sizes="100vw" />
        </ParallaxFrame>
        <span className="tj-dining-hero__shade" aria-hidden="true" />
        <div className="tj-container tj-dining-hero__copy">
          <p className="tj-eyebrow">Tejjora Lake View · In the hotel</p>
          <h1 id="dining-title" className="sr-only">
            {name}
          </h1>
          <p className="tj-dining-hero__title" aria-hidden="true">
            <BlurText as="span" text={name} effect="focus" blur={14} distance={0} delay={150} stepDuration={0.7} trigger="load" />
          </p>
          {sectionNames.length ? (
            <p className="tj-dining-hero__morph" aria-label={`On the menu: ${sectionNames.join(", ")}`}>
              <span aria-hidden="true">On the menu — </span>
              <MorphText words={sectionNames} hold={2200} duration={760} />
            </p>
          ) : null}
          <p className="tj-dining-hero__lead">Breakfast to dessert, Indian and Chinese — the hotel&rsquo;s own restaurant, with the whole menu and its current prices right here.</p>
          <div className="tj-actions-row tj-actions-row--start">
            <PillAnchor href="#menu" variant="cream" arrow>
              Browse the menu
            </PillAnchor>
            <PillAnchor href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer" variant="outline-light" arrow={false}>
              <Icon name="whatsapp" size={16} /> Ask the restaurant
            </PillAnchor>
          </div>
          <dl className="tj-dining-hero__stats">
            <div>
              <dt>Sections</dt>
              <dd>{menu.length}</dd>
            </div>
            <div>
              <dt>Dishes</dt>
              <dd>{items.length}</dd>
            </div>
          </dl>
        </div>
        <Waterline variant="hero" className="tj-dining-hero__line" />
      </section>

      <section className="tj-section tj-dn-story" aria-labelledby="dining-story-title">
        <div className="tj-container tj-dn-story__grid">
          <div className="tj-dn-story__copy">
            <p className="tj-eyebrow">A table in the hotel</p>
            <h2 id="dining-story-title" className="sr-only">
              A table in the hotel
            </h2>
            <ScrollReveal as="p" containerClassName="tj-dn-story__statement" splitBy="words" effect="fade" baseOpacity={0.12} baseRotation={0} blurStrength={4} stagger={0.035} wordAnimationEnd="center 60%">
              Start the morning with breakfast and come back for soups, starters, Indian and Chinese mains, breads, biryani and something sweet.
            </ScrollReveal>
            <p className="tj-dn-story__note">
              Staying with us? <strong>Room service</strong> is part of the stay.
            </p>
            {notes.length ? (
              <dl className="tj-menu-facts" aria-label="Good to know">
                {notes.map((note) => (
                  <div key={note.label}>
                    <dt>{note.label}</dt>
                    <dd>{note.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <TiltFrame className="tj-dn-story__arch">
            <ArchCarousel images={photos} label="the restaurant" sizes="(min-width: 1024px) 38vw, 82vw" />
          </TiltFrame>
        </div>
      </section>

      <section className="tj-masked" aria-labelledby="dining-statement-title">
        <div className="tj-container tj-masked__inner">
          <h2 id="dining-statement-title" className="sr-only">
            From breakfast to dessert
          </h2>
          <MaskedHeading
            aria-hidden
            tag="p"
            text="From breakfast to dessert"
            src={assets.restaurant[3]}
            className="tj-masked__title"
            weight={800}
            tracking={-0.035}
            lineHeight={1.02}
            textScale={0.092}
            fillScale={1.35}
            parallax={36}
            drift={14}
            hoverZoom={0.08}
            saturation={1.15}
            reveal="rise"
            outline
            outlineColor="currentColor"
            outlineWidth={1}
          />
          <p className="tj-masked__caption">The restaurant at Tejjora Lake View, photographed at the hotel.</p>
        </div>
      </section>

      <section className="tj-dining-glance" data-header-tone="dark" aria-labelledby="dining-glance-title">
        <div className="tj-container">
          <SectionIntro id="dining-glance-title" tone="lake" title="The menu at a glance">
            <p>
              {menu.length} sections, {items.length} dishes. Choose a section to see what is in it, then open it.
            </p>
          </SectionIntro>
          <MenuWorlds menu={menu} photos={assets.restaurant} />
          {signature.length ? (
            <div className="tj-dining-glance__signature">
              <p className="tj-eyebrow">Signature dishes</p>
              <ul className="tj-dish-list tj-dish-list--light">
                {signature.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <strong>{formatMoney(item.priceFull)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section id="menu" className="tj-section tj-dining-menu" aria-labelledby="dining-menu-title">
        <div className="tj-container">
          <SectionIntro id="dining-menu-title" title="The menu">
            <p>Search a dish, pick a section, and send a request to the restaurant when ordering is open.</p>
          </SectionIntro>
          <MenuExperience menu={menu} settings={settings} />
        </div>
      </section>

      <section className="tj-section tj-dining-room" aria-labelledby="dining-room-title">
        <div className="tj-container">
          <div className="tj-dining-room__grid">
            <ParallaxFrame className="tj-dining-room__a" speed={6}>
              <Image src={assets.restaurant[3]} alt="Dining room at Tejjora Lake View" fill sizes="(min-width: 1024px) 40vw, 100vw" />
            </ParallaxFrame>
            <ParallaxFrame className="tj-dining-room__b" speed={12}>
              <Image src={assets.restaurant[5]} alt="Daylight in the restaurant at Tejjora Lake View" fill sizes="(min-width: 1024px) 28vw, 50vw" />
            </ParallaxFrame>
            <ParallaxFrame className="tj-dining-room__c" speed={18}>
              <Image src={assets.restaurant[2]} alt="Restaurant seating at Tejjora Lake View" fill sizes="(min-width: 1024px) 28vw, 50vw" />
            </ParallaxFrame>
            <Reveal className="tj-dining-room__copy">
              <h2 id="dining-room-title" className="tj-heading">
                Questions about a dish?
              </h2>
              <p>Call or message the hotel and the team will help — with the menu, a request for the table or an order to your room.</p>
              <div className="tj-actions-row tj-actions-row--start">
                <PillAnchor href={`tel:${hotel.phoneE164}`} variant="outline" arrow={false}>
                  <Icon name="phone" size={16} /> Call
                </PillAnchor>
                <PillAnchor href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer" variant="outline" arrow={false}>
                  <Icon name="whatsapp" size={16} /> WhatsApp
                </PillAnchor>
                <PillLink href="/rooms" variant="lake">
                  Stay with us
                </PillLink>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
