"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { CircleButton } from "./Buttons";

/**
 * The Awadh arch: a rounded-top mask referencing Lucknow's architecture, used at most once or
 * twice per page. Here it holds a short crossfading carousel of real photographs, with the circle
 * arrows overlapping its lower edge. Swipe on touch, arrows everywhere.
 */
export function ArchCarousel({ images, label, sizes = "(min-width: 1024px) 40vw, 82vw" }: { images: { src: string; alt: string }[]; label: string; sizes?: string }) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const go = (next: number) => setIndex((next + images.length) % images.length);

  return (
    <div className="tj-arch-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        className="tj-arch"
        onPointerDown={(event: PointerEvent) => (start.current = event.pointerType === "mouse" ? null : event.clientX)}
        onPointerUp={(event: PointerEvent) => {
          if (start.current === null) return;
          const dx = event.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {images.map((image, imageIndex) => (
          <Image key={image.src} src={image.src} alt={imageIndex === index ? image.alt : ""} fill sizes={sizes} data-active={imageIndex === index ? "true" : "false"} aria-hidden={imageIndex === index ? undefined : true} />
        ))}
      </div>
      {images.length > 1 ? (
        <div className="tj-arch-carousel__controls">
          <CircleButton icon="arrow-left" label={`Previous photo of ${label}`} tone="cream" onClick={() => go(index - 1)} />
          <span className="tj-arch-carousel__count" aria-live="polite">
            {index + 1} / {images.length}
          </span>
          <CircleButton icon="arrow-right" label={`Next photo of ${label}`} tone="cream" onClick={() => go(index + 1)} />
        </div>
      ) : null}
    </div>
  );
}
