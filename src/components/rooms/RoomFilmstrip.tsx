"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Icon } from "@/components/ui/Icon";
import { Lightbox } from "@/components/ui/Lightbox";

gsap.registerPlugin(ScrollTrigger);

/**
 * The room's photographs as a film strip. From 1024 px (and without reduced motion) the section
 * pins while the scroll slides the strip sideways (GSAP ScrollTrigger, with a progress line);
 * below that — and under reduced motion — it is a plain swipeable, snapping row. Every frame opens
 * the shared full-screen Lightbox (arrows, keys, swipe, focus return).
 */
export function RoomFilmstrip({ images, roomName }: { images: string[]; roomName: string }) {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const count = images.length;
  const alt = (index: number) => `${roomName} at Tejjora Lake View, photograph ${index + 1} of ${count}`;

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
      const tween = gsap.to(trackEl, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top+=64",
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
      return () => {
        tween.kill();
        viewportEl.style.overflow = "";
        barEl.style.transform = "";
      };
    });
    return () => mm.revert();
  }, [count]);

  if (!count) return null;

  return (
    <section ref={section} id="room-film" className="tj-film" aria-label={`${roomName} photographs`}>
      <div className="tj-film__head tj-container">
        <p className="tj-eyebrow">The room, photographed</p>
        <span className="tj-film__count" aria-hidden="true">
          {String(count).padStart(2, "0")} frames
        </span>
      </div>
      <div ref={viewport} className="tj-film__viewport">
        <ul ref={track} className="tj-film__track">
          {images.map((src, index) => (
            <li key={src} className="tj-film__frame" data-tall={index % 3 === 1 ? "true" : undefined}>
              <button type="button" onClick={() => setLightbox(index)} aria-label={`Open photograph ${index + 1} of ${count} full screen`}>
                <Image src={src} alt={alt(index)} fill sizes="(min-width: 1024px) 46vw, 84vw" loading={index < 2 ? "eager" : undefined} />
                <span className="tj-film__no" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="tj-film__zoom" aria-hidden="true">
                  <Icon name="expand" size={16} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="tj-film__progress tj-container" aria-hidden="true">
        <span className="tj-film__line">
          <span ref={bar} className="tj-film__bar" />
        </span>
      </div>
      {lightbox !== null ? <Lightbox images={images.map((src, index) => ({ src, alt: alt(index) }))} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} label={`${roomName} photographs`} /> : null}
    </section>
  );
}
