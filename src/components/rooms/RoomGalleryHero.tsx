"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type PointerEvent } from "react";
import { CircleButton } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { Lightbox } from "@/components/ui/Lightbox";

/**
 * Room gallery that fits the viewport: one large image plus a thumbnail strip, opening the shared
 * lightbox on lake (circle arrows, arrow keys, swipe, a counter and focus return to the opener).
 */
export function RoomGalleryHero({ images, roomName }: { images: string[]; roomName: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const swipe = useRef<number | null>(null);
  const count = images.length;
  const go = useCallback((next: number) => setActive((next + count) % count), [count]);
  const alt = (index: number) => `${roomName} at Tejjora Lake View, photo ${index + 1} of ${count}`;

  const onPointerDown = (event: PointerEvent) => {
    swipe.current = event.pointerType === "mouse" ? null : event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (swipe.current === null) return;
    const dx = event.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
  };

  if (!count) return null;

  return (
    <div className="tj-room-gallery">
      <div className="tj-room-gallery__main" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <Image src={images[active]} alt={alt(active)} fill sizes="(min-width: 1024px) 62vw, 100vw" preload={active === 0} />
        <button type="button" className="tj-circle tj-circle--cream tj-room-gallery__expand" onClick={() => setLightbox(true)} aria-label={`Open full-screen gallery (${count} photos)`}>
          <Icon name="expand" size={18} />
        </button>
        {count > 1 ? (
          <div className="tj-room-gallery__arrows">
            <CircleButton icon="arrow-left" label="Previous photo" tone="cream" onClick={() => go(active - 1)} />
            <CircleButton icon="arrow-right" label="Next photo" tone="cream" onClick={() => go(active + 1)} />
          </div>
        ) : null}
      </div>
      {count > 1 ? (
        <ul className="tj-room-gallery__thumbs" aria-label="Room photos">
          {images.map((src, index) => (
            <li key={src}>
              <button type="button" aria-label={`Show photo ${index + 1}`} aria-current={index === active ? "true" : undefined} onClick={() => setActive(index)}>
                <Image src={src} alt="" fill sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox ? <Lightbox images={images.map((src, index) => ({ src, alt: alt(index) }))} index={active} onIndex={setActive} onClose={() => setLightbox(false)} label={`${roomName} photos`} /> : null}
    </div>
  );
}
