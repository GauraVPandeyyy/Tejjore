"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { GalleryImage } from "@/lib/content/types";

/**
 * Hero photography: three tall arch-topped frames fanned in perspective (the hotel, a room, the
 * restaurant). The fan leans toward the pointer, each frame at its own depth. Touch and reduced
 * motion get the still composition. Decorative: every photograph is also in the gallery below.
 */
export function GalleryHeroFan({ images }: { images: GalleryImage[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.setProperty("--fx", x.toFixed(3));
        element.style.setProperty("--fy", y.toFixed(3));
      });
    };
    const onLeave = () => {
      element.style.setProperty("--fx", "0");
      element.style.setProperty("--fy", "0");
    };
    const host = element.closest("section") ?? element;
    host.addEventListener("pointermove", onMove as EventListener);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove as EventListener);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={root} className="gx-fan" aria-hidden="true">
      {images.slice(0, 3).map((image, index) => (
        <figure key={image.id} className={`gx-fan__frame gx-fan__frame--${index + 1}`}>
          <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 22vw, 36vw" priority={index === 0} />
        </figure>
      ))}
    </div>
  );
}
