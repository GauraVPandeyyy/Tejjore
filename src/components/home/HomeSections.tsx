import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { formatMoney } from "@/data/commerce";
import type { Faq, MenuCategory, Offer, RoomContent } from "@/lib/content/types";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { OfferCard } from "@/components/offers/OfferCard";
import { RoomCard } from "@/components/rooms/RoomCard";
import { ArchCarousel } from "@/components/ui/ArchCarousel";
import { PillLink } from "@/components/ui/Buttons";
import { CardCarousel } from "@/components/ui/CardCarousel";
import { FeatureBands } from "@/components/ui/FeatureBand";
import { Icon, type IconName } from "@/components/ui/Icon";
import { BlurText } from "@/components/motion/BlurText";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { ClipReveal, Reveal } from "@/components/ui/Motion";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { Ornament } from "@/components/ui/Waterline";
import { amenities } from "@/data/amenities";
import { HeroConsole } from "./HeroConsole";

/** Home blocks 2–11 (masterplan §4). Each composition reads within one viewport. */

export function HomeStory({ totalRooms }: { totalRooms: number | null }) {
  return (
    <section className="tj-section tj-story" aria-labelledby="story-title">
      <div className="tj-container tj-story__grid">
        <SectionIntro id="story-title" title={<>A calmer base<br />in Gomti Nagar</>} action={{ href: "/experience", label: "Discover the hotel" }}>
          <p>
            Tejjora Lake View is a <strong>boutique hotel in Lucknow</strong>
            {totalRooms ? <>, with {totalRooms} rooms across three categories</> : null}, a restaurant of its own and a team that knows the city. Close
            to everything, quiet when you come back.
          </p>
        </SectionIntro>
        <div className="hx-story__art">
          <ClipReveal className="tj-arch tj-story__arch">
            <Image src={assets.lobby[0]} alt="The lobby at Tejjora Lake View" fill sizes="(min-width: 1024px) 34vw, 78vw" />
          </ClipReveal>
          <ParallaxFrame className="hx-story__inset" speed={10} from="left">
            <Image src={assets.hero.alternateImages[0]} alt="The front of Tejjora Lake View" fill sizes="(min-width: 1024px) 18vw, 40vw" />
          </ParallaxFrame>
        </div>
      </div>
    </section>
  );
}

export function HomeRooms({ rooms }: { rooms: RoomContent[] }) {
  return (
    <section className="tj-section tj-home-rooms" aria-labelledby="rooms-title">
      <div className="tj-container">
        <SectionIntro id="rooms-title" title="Three ways to stay" action={{ href: "/rooms", label: "View all rooms" }}>
          <p>Deluxe, Super Deluxe and Premium — each with air conditioning, Wi-Fi and a private bathroom.</p>
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
  );
}

const FACILITY_TILES: Array<{ id: (typeof amenities)[number]["id"]; icon: IconName; image: string | null; position?: string; size: string }> = [
  { id: "front-desk", icon: "clock", image: assets.lobby[2], position: "50% 40%", size: "a" },
  { id: "parking", icon: "parking", image: assets.hero.alternateImages[0], position: "50% 92%", size: "b" },
  { id: "restaurant", icon: "dish", image: assets.restaurant[4], position: "50% 50%", size: "c" },
  { id: "room-service", icon: "tray", image: assets.rooms.deluxe[4], position: "50% 40%", size: "d" },
  { id: "breakfast", icon: "sun", image: assets.restaurant[5], position: "50% 60%", size: "e" },
  { id: "wifi", icon: "wifi", image: null, size: "f" },
];

/**
 * The hotel's verified facilities as a photographic bento: every tile's label comes from the
 * ledger-verified amenity list, and every photograph is the property. Nothing here adds a fact.
 */
export function HomeFacilities() {
  return (
    <section className="tj-section hx-facilities" aria-labelledby="facilities-title">
      <div className="tj-container">
        <SectionIntro id="facilities-title" title="At your service">
          <p>What guests ask about first, all at the hotel.</p>
        </SectionIntro>
        <ul className="hx-bento">
          {FACILITY_TILES.map((tile, index) => {
            const label = amenities.find((item) => item.id === tile.id)?.label ?? tile.id;
            return (
              <Reveal as="li" key={tile.id} className={`hx-bento__tile hx-bento__tile--${tile.size}`} delay={index * 0.06}>
                {tile.image ? <Image src={tile.image} alt="" fill sizes="(min-width: 1024px) 34vw, 50vw" style={{ objectPosition: tile.position }} /> : <span className="hx-bento__waves" aria-hidden="true" />}
                <span className="hx-bento__shade" aria-hidden="true" />
                <span className="hx-bento__icon">
                  <Icon name={tile.icon} size={22} />
                </span>
                <span className="hx-bento__label">{label}</span>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const IMPRESSIONS: [Array<{ src: string; alt: string }>, Array<{ src: string; alt: string }>] = [
  [
    { src: assets.hero.image, alt: "The front of Tejjora Lake View" },
    { src: assets.lobby[0], alt: "The lobby" },
    { src: assets.restaurant[3], alt: "The dining room" },
    { src: assets.rooms.deluxe[2], alt: "A Deluxe Room" },
    { src: assets.rooms.premium[5], alt: "A Premium Room by the window" },
    { src: assets.lobby[2], alt: "Reception" },
  ],
  [
    { src: assets.hero.alternateImages[1], alt: "The hotel against the evening sky" },
    { src: assets.rooms.superDeluxe[2], alt: "A Super Deluxe Room" },
    { src: assets.restaurant[1], alt: "The dining room, looking down its length" },
    { src: assets.rooms.premium[1], alt: "A Premium Room" },
    { src: assets.lobby[3], alt: "The arrival area" },
    { src: assets.restaurant[5], alt: "Daylight in the dining room" },
  ],
];

/** Two counter-drifting rows of property photographs in slight perspective, on lake. */
export function HomeImpressions() {
  return (
    <section className="tj-impressions hx-impressions" data-header-tone="dark" aria-labelledby="impressions-title">
      <div className="tj-container hx-impressions__head">
        <Ornament />
        <h2 id="impressions-title" className="tj-heading tj-heading--wide">
          Impressions
        </h2>
        <p>Rooms, lobby and restaurant, photographed at the hotel.</p>
      </div>
      <div className="hx-reel" aria-label="Photographs of the hotel">
        {IMPRESSIONS.map((row, rowIndex) => (
          <ul key={rowIndex} className={`hx-reel__row hx-reel__row--${rowIndex ? "back" : "fore"}`}>
            {[...row, ...row].map((photo, index) => {
              const copy = index >= row.length;
              return (
                <li key={`${photo.src}-${index}`} className="hx-reel__item" aria-hidden={copy ? true : undefined}>
                  <Image src={photo.src} alt={copy ? "" : photo.alt} fill sizes="(min-width: 1024px) 24vw, 62vw" />
                </li>
              );
            })}
          </ul>
        ))}
      </div>
      <div className="tj-container hx-impressions__foot">
        <PillLink href="/gallery" variant="outline-light">View the gallery</PillLink>
      </div>
    </section>
  );
}

export function HomeDining({ menu }: { menu: MenuCategory[] }) {
  const items = menu.flatMap((category) => category.items);
  const signature = items.filter((item) => item.signature && item.available).slice(0, 6);
  const images = assets.restaurant.slice(0, 4).map((src, index) => ({ src, alt: index === 0 ? "The restaurant at Tejjora Lake View" : "Restaurant seating at Tejjora Lake View" }));
  return (
    <section className="tj-section tj-home-dining" aria-labelledby="dining-title">
      <div className="tj-container tj-home-dining__grid">
        <Reveal className="tj-home-dining__media">
          <ArchCarousel images={images} label="the restaurant" />
        </Reveal>
        <div className="tj-home-dining__copy">
          <SectionIntro id="dining-title" title="The restaurant" action={{ href: "/dining/menu", label: "View the menu" }}>
            <p>
              From breakfast and soups to Indian and Chinese mains, breads, biryani and desserts
              {items.length ? <> — {menu.length} sections and {items.length} dishes on the hotel&rsquo;s menu</> : null}.
            </p>
          </SectionIntro>
          {signature.length ? (
            <ul className="tj-dish-list" aria-label="Signature dishes">
              {signature.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.priceFull)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="tj-chip-row" aria-label="On the menu">
              {menu.slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link className="tj-chip" href={`/dining/menu#${category.slug}`}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Rendered only when the admin has published an active, non-demo offer. */
export function HomeOffers({ offers }: { offers: Offer[] }) {
  if (!offers.length) return null;
  return (
    <section className="tj-section" aria-labelledby="offers-title">
      <div className="tj-container">
        <SectionIntro id="offers-title" title="Offers" action={{ href: "/offers", label: "All offers" }} />
        <CardCarousel label="Offers" desktopGrid>
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </CardCarousel>
      </div>
    </section>
  );
}

export function HomeExplore() {
  return (
    <section aria-labelledby="explore-title" className="tj-explore">
      <h2 id="explore-title" className="sr-only">
        Explore
      </h2>
      <FeatureBands
        label="Explore"
        bands={[
          { href: "/virtual-tour", eyebrow: "360° tour", title: "Look inside", image: assets.lobby[1], alt: "" },
          { href: "/location", eyebrow: "Location", title: "Getting here", image: assets.hero.alternateImages[0], alt: "" },
          { href: "/plan-your-stay", eyebrow: "Plan", title: "Plan your stay", image: assets.rooms.superDeluxe[2], alt: "" },
        ]}
      />
    </section>
  );
}

export function HomeFaq({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <section className="tj-section tj-faq" aria-labelledby="faq-title">
      <div className="tj-container tj-container--narrow">
        <SectionIntro id="faq-title" title="Good to know" />
        <FaqAccordion faqs={faqs.slice(0, 4)} />
        <p className="tj-faq__more">
          <Link className="tj-text-link" href="/faq">
            More questions <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </div>
    </section>
  );
}

/** The closing invitation: a cream, large-radius container that rises into the lake footer. */
export function HomeInvitation() {
  return (
    <section className="tj-invitation" aria-labelledby="invitation-title">
      <div className="tj-invitation__card">
        <Ornament />
        <h2 id="invitation-title" className="tj-heading">
          <BlurText as="span" className="tj-blur-center" text="Shall we hold your dates?" effect="focus" blur={12} distance={0} delay={120} stepDuration={0.6} />
        </h2>
        <p>Book direct with the hotel, or ask us anything first.</p>
        <HeroConsole variant="invitation" />
      </div>
    </section>
  );
}
