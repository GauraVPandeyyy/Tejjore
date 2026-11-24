"use client";

import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CircleButton } from "./Buttons";

/**
 * One carousel for rooms, dishes and other card rows: native scroll-snap (swipe on touch), the
 * next card always peeks, 44 px circle arrows and arrow keys when focused. `desktopGrid` turns it
 * into a static row of cards at ≥1024 px when everything fits (e.g. the three rooms).
 */
export function CardCarousel({
  label,
  children,
  tone = "paper",
  desktopGrid = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  tone?: "paper" | "lake";
  desktopGrid?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      track.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  function step(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>(":scope > li");
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: reduce ? "auto" : "smooth" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  }

  const single = edges.start && edges.end;

  return (
    <div className={`tj-carousel tj-carousel--${tone} ${desktopGrid ? "tj-carousel--grid" : ""} ${className}`} role="region" aria-roledescription="carousel" aria-label={label}>
      <ul ref={trackRef} className="tj-carousel__track" tabIndex={0} onKeyDown={onKeyDown} aria-label={`${label}: ${items.length} items. Use the arrow keys to browse.`}>
        {items.map((child, index) => (
          <li key={index} className="tj-carousel__item" aria-roledescription="slide" aria-label={`${index + 1} of ${items.length}`}>
            {child}
          </li>
        ))}
      </ul>
      {!single ? (
        <div className="tj-carousel__controls">
          <CircleButton icon="arrow-left" label={`Previous in ${label}`} tone={tone === "lake" ? "outline-light" : "outline"} onClick={() => step(-1)} disabled={edges.start} />
          <CircleButton icon="arrow-right" label={`Next in ${label}`} tone={tone === "lake" ? "outline-light" : "outline"} onClick={() => step(1)} disabled={edges.end} />
        </div>
      ) : null}
    </div>
  );
}
