"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { galleryCategories, galleryItems, type GalleryCategory } from "@/data/gallery";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function GalleryExperience({ index = "11" }: { index?: string }) {
  const [category, setCategory] = useState<GalleryCategory>("All");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const filtered = useMemo(
    () => category === "All" ? galleryItems : galleryItems.filter((item) => item.category === category),
    [category],
  );

  useEffect(() => {
    if (activeIndex === null) {
      dialogRef.current?.close();
      return;
    }
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, [activeIndex]);

  function close() {
    setActiveIndex(null);
  }

  function move(direction: 1 | -1) {
    setActiveIndex((current) => {
      if (current === null || filtered.length === 0) return current;
      return (current + direction + filtered.length) % filtered.length;
    });
  }

  const active = activeIndex === null ? null : filtered[activeIndex];

  return (
    <section id="gallery" className="gallery-experience" aria-labelledby="gallery-title">
      <div className="site-container">
        <div className="gallery-experience__topline">
          <SectionLabel index={index}>FRAGMENTS</SectionLabel>
          <span className="micro">REAL PROPERTY PHOTOGRAPHY · CURATED</span>
        </div>

        <div className="gallery-experience__intro">
          <h2 id="gallery-title">Not everything needs<br /><em>an explanation.</em></h2>
          <div className="gallery-experience__filters" aria-label="Gallery filters">
            {galleryCategories.map((item) => (
              <button key={item} type="button" data-active={category === item ? "true" : "false"} onClick={() => {
                setCategory(item);
                setActiveIndex(null);
              }}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="gallery-experience__grid">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`gallery-experience__item gallery-experience__item--${item.shape}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Open image: ${item.alt}`}
            >
              <Image src={item.src} alt={item.alt} fill sizes="(max-width: 760px) 50vw, 30vw" />
              <span className="micro">{item.category}</span>
            </button>
          ))}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="gallery-lightbox"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        {active ? (
          <div className="gallery-lightbox__panel">
            <div className="gallery-lightbox__top">
              <span className="micro">{String((activeIndex ?? 0) + 1).padStart(2, "0")} / {String(filtered.length).padStart(2, "0")}</span>
              <button type="button" onClick={close}>Close</button>
            </div>
            <div className="gallery-lightbox__media">
              <Image src={active.src} alt={active.alt} fill sizes="95vw" />
            </div>
            <div className="gallery-lightbox__bottom">
              <span>{active.alt}</span>
              <div>
                <button type="button" onClick={() => move(-1)} aria-label="Previous image">← Prev</button>
                <button type="button" onClick={() => move(1)} aria-label="Next image">Next →</button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
