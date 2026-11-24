"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type HeroSlide = { src: string; alt: string; label: string; position?: string };

const INTERVAL = 6800;

/**
 * The hero's photographic cycle: the hotel's front (server-rendered `children`, the LCP image),
 * then the lobby, the dining room and a room. Each frame crossfades and pushes in slowly; a small
 * caption names it and dots step through. It pauses off-screen and while the tab is hidden, and
 * under reduced motion it never auto-advances. All frames are real property photographs.
 */
export function HeroSlides({ first, slides, children }: { first: string; slides: HeroSlide[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length + 1;
  const labels = [first, ...slides.map((slide) => slide.label)];

  useEffect(() => {
    const element = root.current;
    if (!element || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(element);
    const timer = window.setInterval(() => {
      if (visible && !document.hidden) setActive((current) => (current + 1) % count);
    }, INTERVAL);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [paused, count, active]);

  return (
    <div ref={root} className="hx-slides" data-count={count}>
      <div className="hx-slide" data-active={active === 0 ? "true" : "false"}>
        {children}
      </div>
      {slides.map((slide, index) => (
        <div key={slide.src} className="hx-slide" data-active={active === index + 1 ? "true" : "false"} aria-hidden={active === index + 1 ? undefined : true}>
          <Image src={slide.src} alt={active === index + 1 ? slide.alt : ""} fill sizes="100vw" quality={72} style={{ objectPosition: slide.position ?? "50% 50%" }} />
        </div>
      ))}
      <div className="hx-caption">
        <p className="hx-caption__place">Gomti Nagar · Lucknow</p>
        <p className="hx-caption__label" aria-live="off" key={active}>
          {labels[active]}
        </p>
        <div className="hx-caption__dots" role="group" aria-label="Hotel photographs">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={`Show ${label.toLowerCase()}`}
              aria-pressed={index === active}
              onClick={() => {
                setActive(index);
                setPaused(false);
              }}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
