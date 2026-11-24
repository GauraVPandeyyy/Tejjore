"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { assets } from "@/data/assets";
import { clamp, scrollRunwayTo, useRunwayProgress, useStoryMode } from "@/components/motion/useRunway";
import { Ornament } from "@/components/ui/Waterline";

type Chapter = { id: string; word: string; label: string; copy: string; link: { href: string; label: string }; image: string; mobileImage?: { src: string; width: number; height: number }; alt: string; position: string };

function chapters(totalRooms: number | null, dishNote: string | null): Chapter[] {
  return [
    {
      id: "arrive",
      word: "Arrive",
      label: "The front desk",
      copy: "A 24-hour front desk, free private parking and a lobby to sit down in after the road.",
      link: { href: "/location", label: "Getting here" },
      image: assets.hero.alternateImages[0],
      // On phones the landscape front would crop to a wall; the portrait frame keeps the whole building.
      mobileImage: { src: "/images/hero/video-poster-mobile.png", width: 720, height: 1280 },
      alt: "The front of Tejjora Lake View on Vikalp Khand",
      position: "50% 40%",
    },
    {
      id: "rest",
      word: "Rest",
      label: "The rooms",
      copy: `${totalRooms ? `${totalRooms} rooms` : "Rooms"} in three categories — each with air conditioning, Wi-Fi and a private bathroom.`,
      link: { href: "/rooms", label: "See the rooms" },
      image: assets.rooms.superDeluxe[0],
      alt: "A Super Deluxe Room at Tejjora Lake View",
      position: "50% 62%",
    },
    {
      id: "dine",
      word: "Dine",
      label: "The restaurant",
      copy: `A restaurant of its own, from breakfast to dessert${dishNote ? ` — ${dishNote}` : ""}.`,
      link: { href: "/dining", label: "The restaurant" },
      image: assets.restaurant[0],
      alt: "The dining room at Tejjora Lake View",
      position: "50% 55%",
    },
  ];
}

function ChapterPhoto({ chapter, alt }: { chapter: Chapter; alt: string }) {
  if (!chapter.mobileImage) return <Image src={chapter.image} alt={alt} fill sizes="100vw" quality={75} style={{ objectPosition: chapter.position }} />;
  const { props: wide } = getImageProps({ src: chapter.image, alt, width: 2400, height: 1600, sizes: "100vw", quality: 75 });
  const {
    props: { srcSet: narrow },
  } = getImageProps({ src: chapter.mobileImage.src, alt, width: chapter.mobileImage.width, height: chapter.mobileImage.height, sizes: "100vw", quality: 72 });
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={narrow} />
      <img {...wide} alt={alt} style={{ objectPosition: chapter.position }} />
    </picture>
  );
}

/**
 * Home's visual story, replacing the text-only manifesto: three real photographs of the hotel
 * (Arrive → Rest → Dine) that open into one another through an arch as the page scrolls. The stage is
 * sticky for one viewport inside a short runway — plain page scroll, nothing hijacked. Under reduced
 * motion the chapters stack as ordinary photo-and-caption blocks.
 */
export function HomeJourney({ totalRooms, dishNote }: { totalRooms: number | null; dishNote: string | null }) {
  const list = chapters(totalRooms, dishNote);
  const last = list.length - 1;
  const story = useStoryMode();
  const section = useRef<HTMLElement>(null);
  const layers = useRef<Array<HTMLDivElement | null>>([]);
  const words = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);

  useRunwayProgress(section, story, (progress) => {
    const position = progress * last;
    const width = window.innerWidth;
    layers.current.forEach((layer, index) => {
      if (!layer) return;
      if (index === 0) {
        // The first photograph settles back a little as the next one opens over it.
        const gone = clamp(position / 0.85);
        layer.style.transform = `scale(${(1 + 0.06 * gone).toFixed(4)})`;
        return;
      }
      // Chapter `index` opens between (index-1)+0.2 and index-0.2; it holds fully open either side.
      const t = clamp((position - (index - 1) - 0.18) / 0.64);
      const eased = t * t * (3 - 2 * t);
      const inset = (1 - eased) * 36; // % of width on each side
      const top = (1 - eased) * 16;
      const radius = (1 - eased ** 3) * ((width * (100 - 2 * inset)) / 200);
      layer.style.clipPath = t <= 0 ? "inset(100% 0 0 0)" : `inset(${top.toFixed(2)}% ${inset.toFixed(2)}% 0 ${inset.toFixed(2)}% round ${radius.toFixed(1)}px ${radius.toFixed(1)}px 0 0)`;
      const image = layer.firstElementChild as HTMLElement | null;
      if (image) image.style.transform = `scale(${(1.16 - 0.16 * eased).toFixed(4)})`;
      const after = index < last ? clamp((position - index - 0.18) / 0.64) : 0;
      layer.style.transform = `scale(${(1 + 0.06 * after).toFixed(4)})`;
    });
    words.current.forEach((word, index) => {
      if (!word) return;
      const distance = position - index;
      word.style.opacity = String(clamp(1 - Math.abs(distance) * 2.6));
      word.style.transform = `translate3d(0, ${(-distance * 56).toFixed(1)}px, 0)`;
    });
    setActive(Math.round(position));
  });

  if (!story) {
    return (
      <section className="hx-journey hx-journey--stack" aria-labelledby="journey-title">
        <h2 id="journey-title" className="sr-only">
          The hotel in three moments
        </h2>
        {list.map((chapter, index) => (
          <article key={chapter.id} className="hx-journey__block">
            <div className="hx-journey__photo">
              <Image src={chapter.image} alt={chapter.alt} fill sizes="100vw" style={{ objectPosition: chapter.position }} />
            </div>
            <div className="hx-journey__copy">
              <p className="tj-eyebrow">
                {String(index + 1).padStart(2, "0")} · {chapter.label}
              </p>
              <p className="hx-journey__word" aria-hidden="true">
                {chapter.word}
              </p>
              <p>{chapter.copy}</p>
              <Link className="tj-text-link" href={chapter.link.href}>
                {chapter.link.label} →
              </Link>
            </div>
          </article>
        ))}
      </section>
    );
  }

  return (
    <section ref={section} className="hx-journey" data-header-tone="dark" aria-labelledby="journey-title" data-active={list[active].id}>
      <h2 id="journey-title" className="sr-only">
        The hotel in three moments: arrive, rest, dine
      </h2>
      <div className="hx-journey__stage">
        {list.map((chapter, index) => (
          <div
            key={chapter.id}
            ref={(element) => {
              layers.current[index] = element;
            }}
            className="hx-journey__layer"
            data-first={index === 0 ? "true" : undefined}
          >
            <div className="hx-journey__img">
              <ChapterPhoto chapter={chapter} alt={index === active ? chapter.alt : ""} />
            </div>
          </div>
        ))}
        <span className="hx-journey__shade" aria-hidden="true" />

        <div className="hx-journey__top" aria-hidden="true">
          <Ornament />
          <span>Tejjora Lake View</span>
        </div>

        <div className="hx-journey__words" aria-hidden="true">
          {list.map((chapter, index) => (
            <div
              key={chapter.id}
              ref={(element) => {
                words.current[index] = element;
              }}
              className="hx-journey__word"
            >
              {chapter.word}
            </div>
          ))}
        </div>

        <div className="hx-journey__captions">
          {list.map((chapter, index) => (
            <div key={chapter.id} className="hx-journey__caption" data-active={index === active ? "true" : "false"} aria-hidden={index === active ? undefined : true}>
              <p className="tj-eyebrow">
                {String(index + 1).padStart(2, "0")} · {chapter.label}
              </p>
              <p>{chapter.copy}</p>
              <Link className="tj-text-link" href={chapter.link.href} tabIndex={index === active ? undefined : -1}>
                {chapter.link.label} →
              </Link>
            </div>
          ))}
        </div>

        <ol className="hx-journey__rail" aria-label="Chapters">
          {list.map((chapter, index) => (
            <li key={chapter.id}>
              <button type="button" aria-current={index === active ? "step" : undefined} onClick={() => scrollRunwayTo(section.current, index, last)}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="sr-only">{chapter.word}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
