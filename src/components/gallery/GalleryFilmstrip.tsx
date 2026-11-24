"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { GalleryImage } from "@/lib/content/types";
import { Icon } from "@/components/ui/Icon";

gsap.registerPlugin(ScrollTrigger);

/**
 * The rooms as a cinematic film strip. From 1024 px (and without reduced motion) the chapter pins
 * while the scroll slides tall and wide frames sideways (GSAP ScrollTrigger, with a progress line);
 * below that — and under reduced motion — it is a plain swipeable, snapping row. Every frame opens
 * the shared full-screen viewer.
 */
export function GalleryFilmstrip({ images, header, onOpen }: { images: GalleryImage[]; header: React.ReactNode; onOpen: (image: GalleryImage) => void }) {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const sectionEl = section.current;
    const viewportEl = viewport.current;
    const trackEl = track.current;
    const barEl = bar.current;
    if (!sectionEl || !viewportEl || !trackEl || !barEl) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const distance = () => Math.max(0, trackEl.scrollWidth - viewportEl.clientWidth);
      if (distance() < 8) return;
      viewportEl.style.overflow = "hidden";
      const frames = gsap.utils.toArray<HTMLElement>(".gx-film__img", trackEl);
      const tween = gsap.to(trackEl, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top+=124",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            barEl.style.transform = `scaleX(${self.progress.toFixed(4)})`;
          },
        },
      });
      // Each photograph drifts slightly against the strip for depth.
      const drifts = frames.map((frame) =>
        gsap.fromTo(
          frame,
          { xPercent: -7 },
          {
            xPercent: 7,
            ease: "none",
            scrollTrigger: { trigger: frame, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          },
        ),
      );
      return () => {
        drifts.forEach((drift) => drift.kill());
        tween.kill();
        viewportEl.style.overflow = "";
        barEl.style.transform = "";
      };
    });
    return () => mm.revert();
  }, [images]);

  return (
    <section ref={section} className="gx-film" aria-label="The rooms, as a film strip">
      {header}
      <div ref={viewport} className="gx-film__viewport">
        <ul ref={track} className="gx-film__track">
          {images.map((image, index) => (
            <li key={image.id} className={`gx-film__frame gx-film__frame--${index % 3 === 1 ? "tall" : "wide"}`}>
              <button type="button" onClick={() => onOpen(image)} aria-label={`Open photo: ${image.alt}`}>
                <span className="gx-film__window">
                  <Image className="gx-film__img" src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 46vw, 80vw" />
                </span>
                <span className="gx-film__caption">
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {image.alt}
                  <Icon name="expand" size={16} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="gx-film__progress" aria-hidden="true">
        <span ref={bar} />
      </div>
    </section>
  );
}
