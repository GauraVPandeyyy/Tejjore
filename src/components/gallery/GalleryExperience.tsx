"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { GalleryCategoryName, GalleryImage } from "@/lib/content/types";
import { Icon } from "@/components/ui/Icon";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { Reveal } from "@/components/ui/Motion";
import { GalleryFilmstrip } from "./GalleryFilmstrip";
import { pickFeatured } from "./featured";

type Filter = "All" | GalleryCategoryName;
/** Presentation order: arrive at the hotel, retire to a room, then dine. */
const ORDER: GalleryCategoryName[] = ["Hotel", "Stay", "Dining"];

/** Each chapter's framing and where it leads next (real pages only). */
const CHAPTERS: Record<GalleryCategoryName, { title: string; copy: string; links: Array<{ href: string; label: string }> }> = {
  Hotel: { title: "The hotel", copy: "The front on Vikalp Khand, the lobby and the reception desk that greets every arrival.", links: [{ href: "/virtual-tour", label: "Take the 360° tour" }, { href: "/location", label: "Getting here" }] },
  Stay: { title: "The rooms", copy: "Deluxe, Super Deluxe and Premium — beds, desks, light and detail, as they are.", links: [{ href: "/rooms", label: "Compare the rooms" }, { href: "/book", label: "Check dates" }] },
  Dining: { title: "The restaurant", copy: "The hotel’s own dining room, from morning light to evening.", links: [{ href: "/dining", label: "See the menu" }] },
};
const FILTER_LABEL: Record<GalleryCategoryName, string> = { Stay: "Rooms", Hotel: "Hotel", Dining: "Restaurant" };
const LIGHTBOX_LINK: Record<GalleryCategoryName, { href: string; label: string }> = {
  Stay: { href: "/rooms", label: "See the rooms" },
  Hotel: { href: "/virtual-tour", label: "Look around in 360°" },
  Dining: { href: "/dining", label: "See the menu" },
};

function ChapterHead({ category, number, tone, count }: { category: GalleryCategoryName; number: number; tone: "paper" | "lake"; count: number }) {
  const chapter = CHAPTERS[category];
  return (
    <header className={`gx-head gx-head--${tone}`}>
      <span className="gx-head__no" aria-hidden="true">
        {String(number).padStart(2, "0")}
      </span>
      <div className="gx-head__copy">
        <h2 id={`chapter-${category}`} className="gx-head__title">
          {chapter.title}
        </h2>
        <p>{chapter.copy}</p>
      </div>
      <div className="gx-head__links">
        <span className="gx-head__count">
          {count} photograph{count === 1 ? "" : "s"}
        </span>
        {chapter.links.map((link) => (
          <Link key={link.href} className="tj-text-link" href={link.href}>
            {link.label} <Icon name="arrow-right" size={16} />
          </Link>
        ))}
      </div>
    </header>
  );
}

function Photo({ image, sizes, onOpen, className = "" }: { image: GalleryImage; sizes: string; onOpen: (image: GalleryImage) => void; className?: string }) {
  return (
    <button type="button" className={`gx-photo ${className}`.trim()} onClick={() => onOpen(image)} aria-label={`Open photo: ${image.alt}`}>
      <Image src={image.src} alt={image.alt} fill sizes={sizes} />
      <span className="gx-photo__caption" aria-hidden="true">
        <span>{image.alt}</span>
        <Icon name="expand" size={16} />
      </span>
    </button>
  );
}

/** The hotel: four photographs in a layered, asymmetric collage at different scroll depths. */
function HotelCollage({ images, onOpen }: { images: GalleryImage[]; onOpen: (image: GalleryImage) => void }) {
  const speeds = [7, 12, 9, 6];
  return (
    <div className="gx-collage">
      {images.map((image, index) => (
        <ParallaxFrame key={image.id} className={`gx-collage__frame gx-collage__frame--${index + 1}`} speed={speeds[index] ?? 8} from={index % 2 ? "right" : "left"}>
          <Photo image={image} onOpen={onOpen} sizes={index === 0 ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 40vw, 80vw"} />
        </ParallaxFrame>
      ))}
    </div>
  );
}

/** The restaurant: a depth stage — the lead photograph square-on, the others turned away in perspective. */
function DepthStage({ images, onOpen }: { images: GalleryImage[]; onOpen: (image: GalleryImage) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = stage.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--dx", (((event.clientX - rect.left) / rect.width - 0.5) * 2).toFixed(3));
        element.style.setProperty("--dy", (((event.clientY - rect.top) / rect.height - 0.5) * 2).toFixed(3));
      });
    };
    const onLeave = () => {
      element.style.setProperty("--dx", "0");
      element.style.setProperty("--dy", "0");
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return (
    <div ref={stage} className="gx-depth">
      {images.map((image, index) => (
        <Reveal key={image.id} className={`gx-depth__panel gx-depth__panel--${index + 1}`} delay={index * 0.07}>
          <Photo image={image} onOpen={onOpen} sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 26vw, 46vw"} />
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Gallery — an editorial walk through the property (hotel → rooms → restaurant) that features the
 * strongest photograph of each subject in its own composition: a layered collage, a pinned film
 * strip, a 3D depth stage. Below sits the complete set, so every photograph stays one click away.
 * A sticky filter narrows chapters and the set; the shared full-screen viewer walks the shown
 * photographs in order. Images come from the content layer (property photos only).
 */
export function GalleryExperience({ items }: { items: GalleryImage[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [open, setOpen] = useState<number | null>(null);
  const chapters = ORDER.filter((category) => items.some((item) => item.category === category));
  const filters: Filter[] = ["All", ...chapters];
  const shownChapters = filter === "All" ? chapters : chapters.filter((category) => category === filter);
  // The viewer walks the photos in the order they are shown: chapter by chapter, featured first.
  const sequence = shownChapters.flatMap((category) => {
    const featured = pickFeatured(items, category);
    return [...featured, ...items.filter((item) => item.category === category && !featured.includes(item))];
  });
  const indexOf = new Map(sequence.map((item, index) => [item.id, index]));
  const lightboxImages: LightboxImage[] = sequence.map((item) => ({ src: item.src, alt: item.alt, eyebrow: CHAPTERS[item.category].title, link: LIGHTBOX_LINK[item.category] }));
  const openImage = (image: GalleryImage) => setOpen(indexOf.get(image.id) ?? 0);

  function chapterBody(category: GalleryCategoryName, number: number): ReactNode {
    const featured = pickFeatured(items, category);
    const total = items.filter((item) => item.category === category).length;
    if (category === "Stay") {
      return <GalleryFilmstrip images={featured} onOpen={openImage} header={<ChapterHead category={category} number={number} tone="lake" count={total} />} />;
    }
    return (
      <>
        <ChapterHead category={category} number={number} tone="paper" count={total} />
        {category === "Hotel" ? <HotelCollage images={featured} onOpen={openImage} /> : <DepthStage images={featured} onOpen={openImage} />}
      </>
    );
  }

  return (
    <>
      {filters.length > 2 ? (
        <div className="gx-filter"><div className="tj-container">
          <div className="tj-chip-row gx-filter__row" role="group" aria-label="Show photos of">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                className="tj-chip"
                aria-pressed={filter === item}
                onClick={() => {
                  setFilter(item);
                  setOpen(null);
                  document.getElementById("gallery-chapters")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {item === "All" ? "All" : FILTER_LABEL[item]}
                <span className="tj-gallery-filter__count">{item === "All" ? items.length : items.filter((photo) => photo.category === item).length}</span>
              </button>
            ))}
          </div>
        </div>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {sequence.length} photos
      </p>

      <div id="gallery-chapters" className="gx-chapters">
        {shownChapters.map((category, chapterIndex) => (
          <section key={category} className={`gx-chapter gx-chapter--${category.toLowerCase()}`} aria-labelledby={`chapter-${category}`}>
            {chapterBody(category, chapterIndex + 1)}
          </section>
        ))}
      </div>

      <section className="gx-archive" aria-labelledby="archive-title">
        <div className="tj-container">
          <header className="gx-archive__head">
            <h2 id="archive-title" className="gx-head__title">
              The full set
            </h2>
            <p>
              Every photograph, {sequence.length} in all. Open any to see it full screen.
            </p>
          </header>
          <ul className="gx-archive__grid">
            {sequence.map((item, index) => (
              <li key={item.id}>
                <button type="button" onClick={() => setOpen(index)} aria-label={`Open photo ${index + 1}: ${item.alt}`}>
                  <Image src={item.src} alt="" fill sizes="(min-width: 1024px) 16vw, 33vw" />
                  <span className="gx-archive__tag" aria-hidden="true">
                    {FILTER_LABEL[item.category]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {open !== null ? <Lightbox images={lightboxImages} index={open} onIndex={setOpen} onClose={() => setOpen(null)} label="Gallery" /> : null}
    </>
  );
}
