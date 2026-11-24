import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { WaterlineDay } from "@/components/home/WaterlineDay";
import {
  FacilityGrid,
  HOTEL_FACILITIES,
} from "@/components/hotel/FacilityGrid";
import { LocalDiscovery } from "@/components/hotel/LocalDiscovery";
import { StayMoments } from "@/components/hotel/StayMoments";
import { RoomCard } from "@/components/rooms/RoomCard";
import { PillAnchor, PillLink } from "@/components/ui/Buttons";
import { CardCarousel } from "@/components/ui/CardCarousel";
import { Collage } from "@/components/ui/Collage";
import { FeatureBands } from "@/components/ui/FeatureBand";
import { MaskedHeading } from "@/components/motion/MaskedHeading";
import { MorphText } from "@/components/motion/MorphText";
import { ClipReveal, Reveal } from "@/components/ui/Motion";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { Ornament, Waterline } from "@/components/ui/Waterline";
import { getPublicPropertyFacts } from "@/lib/content/facts";
import { getRestaurantMenu } from "@/lib/content/restaurant";
import { getRooms } from "@/lib/content/rooms";
import { seoMetadata } from "@/lib/content/seo";

const baseMetadata: Metadata = {
  title: "Experiences – Lucknow",
  description:
    "A stay at Tejjora Lake View in Gomti Nagar, Lucknow: the rhythm of a day, the hotel's facilities, three room categories, its own restaurant and the city close by.",
  alternates: { canonical: "/experience" },
};

/** Code-defined metadata, overridden by the admin SEO entry for this path when one exists. */
export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/experience", baseMetadata);
}

export const revalidate = 600;

/**
 * Experience — the whole stay in one page, verified facts only:
 * cinematic hero → the Waterline Day (paper → lake) → the hotel and its facilities (on lake) →
 * three ways to stay → the restaurant → out into Lucknow (nearby, live directions) → a stay from
 * booking to departure → 360° / gallery bands → plan or book.
 * Local-experience ideas, timings and distances stay out until the hotel approves them.
 */
export default async function ExperiencePage() {
  const [{ data: facts }, { data: rooms }, { data: menu }] = await Promise.all([
    getPublicPropertyFacts(),
    getRooms(),
    getRestaurantMenu(),
  ]);
  const totalRooms = facts.get("rooms.total");
  const dishes = menu.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <main className="tj-experience">
      <section
        className="tj-cine-hero"
        data-hero-overlay=""
        aria-labelledby="experience-title"
      >
        <Image
          src="/images/hero/video-poster-desktop.png"
          alt="The front of Tejjora Lake View in Gomti Nagar"
          fill
          priority
          sizes="100vw"
          className="tj-cine-hero__image"
        />
        <span className="tj-cine-hero__shade" aria-hidden="true" />
        <div className="tj-container tj-cine-hero__copy">
          <p className="tj-eyebrow">Tejjora Lake View · Gomti Nagar, Lucknow</p>
          {/* The heading is "Your day at Tejjora"; the visual word morphs through the hours of the day. */}
          <h1 id="experience-title" className="sr-only">
            Your day at Tejjora
          </h1>
          <p className="tj-cine-hero__title" aria-hidden="true">
            Your <MorphText words={["day", "morning", "afternoon", "evening", "night"]} /> at Tejjora
          </p>
          <p className="tj-cine-hero__lead">
            A boutique hotel with a restaurant of its own and the rest of
            Lucknow close by. Here is how a stay can unfold — at your own pace.
          </p>
          <div className="tj-actions-row tj-actions-row--start">
            <PillAnchor href="#waterline-day-title" variant="cream" arrow>
              Follow the day
            </PillAnchor>
            <PillLink href="/plan-your-stay" variant="outline-light">
              Plan your stay
            </PillLink>
          </div>
          <dl className="tj-cine-hero__stats">
            {typeof totalRooms === "number" ? (
              <div>
                <dt>Rooms</dt>
                <dd>{totalRooms}</dd>
              </div>
            ) : null}
            <div>
              <dt>Categories</dt>
              <dd>{rooms.length}</dd>
            </div>
            <div>
              <dt>Front desk</dt>
              <dd>24 hours</dd>
            </div>
            {dishes ? (
              <div>
                <dt>On the menu</dt>
                <dd>{dishes} dishes</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <Waterline variant="hero" className="tj-cine-hero__line" />
      </section>

      <WaterlineDay />

      <section className="tj-masked" aria-labelledby="experience-light-title">
        <div className="tj-container tj-masked__inner">
          <h2 id="experience-light-title" className="sr-only">
            Light across the water
          </h2>
          <MaskedHeading
            aria-hidden
            tag="p"
            text="Light across the water"
            src={assets.lobby[3]}
            className="tj-masked__title"
            saturation={1.2}
            weight={800}
            tracking={-0.035}
            lineHeight={1.02}
            textScale={0.09}
            fillScale={1.35}
            parallax={36}
            drift={14}
            hoverZoom={0.08}
            reveal="rise"
            outline
            outlineColor="currentColor"
            outlineWidth={1}
          />
          <p className="tj-masked__caption">Photographed at Tejjora Lake View, Gomti Nagar.</p>
        </div>
      </section>

      <section
        className="tj-impressions tj-exp-hotel"
        data-header-tone="dark"
        aria-labelledby="experience-hotel-title"
      >
        <div className="tj-container">
          <Collage
            heading={
              <h2
                id="experience-hotel-title"
                className="tj-heading tj-heading--wide"
              >
                In the hotel
              </h2>
            }
            images={[
              { src: assets.lobby[0], alt: "The lobby at Tejjora Lake View" },
              { src: assets.lobby[2], alt: "Reception at Tejjora Lake View" },
            ]}
          />
          <Reveal className="tj-exp-hotel__copy">
            <p>
              Everything a city stay needs, under one roof — and a team at the
              desk at any hour.
            </p>
          </Reveal>
          <FacilityGrid
            ids={HOTEL_FACILITIES}
            tone="lake"
            label="Hotel facilities"
            columns={6}
          />
        </div>
      </section>

      <section className="tj-section" aria-labelledby="experience-rooms-title">
        <div className="tj-container">
          <SectionIntro
            id="experience-rooms-title"
            eyebrow="Stay"
            title="Three ways to stay"
            action={{ href: "/rooms", label: "Compare the rooms" }}
          >
            <p>
              {typeof totalRooms === "number"
                ? `${totalRooms} rooms in three categories`
                : "Three room categories"}{" "}
              — Deluxe, Super Deluxe and Premium, each with air conditioning,
              free Wi-Fi and a private bathroom.
            </p>
          </SectionIntro>
        </div>
        <div className="tj-container tj-container--bleed-mobile">
          <CardCarousel label="Rooms" desktopGrid>
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </CardCarousel>
        </div>
      </section>

      <section
        className="tj-section tj-exp-dine"
        aria-labelledby="experience-dine-title"
      >
        <div className="tj-container tj-exp-dine__grid">
          <ClipReveal className="tj-exp-dine__image">
            <Image
              src={assets.restaurant[1]}
              alt="The restaurant at Tejjora Lake View"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </ClipReveal>
          <div className="tj-exp-dine__copy">
            <SectionIntro
              id="experience-dine-title"
              eyebrow="Dine"
              title={
                <>
                  Breakfast
                  <br />
                  to dessert
                </>
              }
              align="start"
              action={{ href: "/dining", label: "The restaurant" }}
            >
              <p>
                The hotel&rsquo;s own restaurant: {menu.length} sections and{" "}
                {dishes} dishes, from the breakfast plate to biryani, with room
                service when you&rsquo;d rather stay in.
              </p>
            </SectionIntro>
            <ul
              className="tj-chip-row tj-chip-row--start"
              aria-label="On the menu"
            >
              {menu.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link className="tj-chip" href={`/dining#${category.slug}`}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        className="tj-section tj-exp-city"
        aria-labelledby="experience-city-title"
      >
        <div className="tj-container">
          <SectionIntro
            id="experience-city-title"
            eyebrow="Discover"
            title="Out into Lucknow"
            action={{ href: "/location", label: "Getting here" }}
          >
            <p>
              Vikalp Khand sits in <strong>Gomti Nagar</strong>, close to
              business venues, landmarks and shopping. Each card opens live
              directions from the hotel, so times are always current.
            </p>
          </SectionIntro>
          <LocalDiscovery />
        </div>
      </section>

      <section
        className="tj-section tj-exp-moments"
        aria-labelledby="experience-moments-title"
      >
        <div className="tj-container">
          <SectionIntro
            id="experience-moments-title"
            eyebrow="Your stay"
            title="From booking to goodbye"
          >
            <p>Six moments of a stay, and where to find each on this site.</p>
          </SectionIntro>
          <StayMoments />
        </div>
      </section>

      <section aria-labelledby="experience-explore-title">
        <h2 id="experience-explore-title" className="sr-only">
          Explore
        </h2>
        <FeatureBands
          label="Explore the stay"
          bands={[
            {
              href: "/virtual-tour",
              eyebrow: "360° tour",
              title: "Look inside",
              image: assets.lobby[1],
              alt: "",
            },
            {
              href: "/gallery",
              eyebrow: "Gallery",
              title: "Every room, photographed",
              image: assets.rooms.premium[1],
              alt: "",
            },
            {
              href: "/location",
              eyebrow: "Location",
              title: "Getting here",
              image: assets.hero.image,
              alt: "",
            },
          ]}
        />
      </section>

      <section className="tj-section" aria-labelledby="experience-close-title">
        <div className="tj-container">
          <Reveal className="tj-closing">
            <Ornament />
            <h2 id="experience-close-title" className="tj-heading">
              Shall we plan it?
            </h2>
            <p>
              Tell us what the trip is for and we&rsquo;ll suggest a room and a
              shape for the stay — or go straight to dates.
            </p>
            <div className="tj-actions-row">
              <PillLink href="/book" variant="lake" dot>
                Book a stay
              </PillLink>
              <PillLink href="/plan-your-stay">Plan your stay</PillLink>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
