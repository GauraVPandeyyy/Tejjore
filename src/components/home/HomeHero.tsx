import { getImageProps } from "next/image";
import { Waterline } from "@/components/ui/Waterline";
import { HeroConsole } from "./HeroConsole";
import { assets } from "@/data/assets";
import { HeroSlides } from "./HeroSlides";

/**
 * Flagship hero. The art-directed poster is the LCP image (fetchPriority high, no lazy loading);
 * the hotel's own video only starts after load, never under reduced motion or Save-Data, and
 * pauses off-screen. A visually hidden h1 names the hotel and place. Mobile shows only the lockup — the
 * dock carries Book — while laptops add one positioning line and the booking console above the fold.
 */
export function HomeHero() {
  const common = {
    alt: "",
    sizes: "100vw",
    fetchPriority: "high" as const,
    loading: "eager" as const,
  };
  const {
    props: { srcSet: desktop },
  } = getImageProps({
    ...common,
    src: "/images/hero/video-poster-desktop.png",
    width: 1600,
    height: 900,
    quality: 72,
  });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({
    ...common,
    src: "/images/hero/video-poster-mobile.png",
    width: 720,
    height: 1280,
    quality: 70,
  });

  return (
    <section
      className="tj-hero"
      data-hero-overlay=""
      aria-labelledby="hero-title"
    >
      <div className="tj-hero__media">
        <HeroSlides
          first="The hotel"
          slides={[
            { src: assets.lobby[1], alt: "The lobby at Tejjora Lake View", label: "The lobby", position: "50% 60%" },
            { src: assets.restaurant[1], alt: "The dining room at Tejjora Lake View", label: "The restaurant", position: "50% 55%" },
            { src: assets.rooms.superDeluxe[0], alt: "A Super Deluxe Room at Tejjora Lake View", label: "The rooms", position: "50% 70%" },
          ]}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={desktop} />
            <source srcSet={mobile} />
            {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative poster; alt="" comes from getImageProps */}
            <img {...rest} className="tj-hero__poster" />
          </picture>
        </HeroSlides>
        <span className="tj-hero__shade" aria-hidden="true" />
      </div>
      <Waterline className="tj-hero__waterline" />
      <div className="tj-hero__content">
        {/* The one h1 of the page. The visible lockup is currently off, so the heading is visually hidden. */}
        <h1 id="hero-title" className="sr-only">
          Tejjora Lake View — a boutique hotel in Gomti Nagar, Lucknow
        </h1>
        {/* <h1 id="hero-title" className="tj-lockup tj-hero__lockup">
          <Image
            src="/brand/tejjora-logo.png"
            alt="Tejjora Lake View"
            width={1686}
            height={2048}
            sizes="(min-width: 1024px) 168px, 38vw"
            loading="eager"
          />
          <span className="sr-only">
            {" "}
            — a boutique hotel in Gomti Nagar, Lucknow
          </span>
        </h1>
        <p className="tj-hero__line">
          A boutique hotel in Gomti Nagar, Lucknow — rooms, a restaurant and an
          easy way into the city.
        </p> */}
        <HeroConsole />
      </div>
    </section>
  );
}
