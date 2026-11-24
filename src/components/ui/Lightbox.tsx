"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { CircleButton } from "./Buttons";
import { Icon } from "./Icon";

export type LightboxImage = { src: string; alt: string; eyebrow?: string; link?: { href: string; label: string } };

/**
 * Full-screen viewer on lake shared by the room and gallery pages: circle arrows, arrow keys,
 * swipe, a live counter, a thumbnail strip, an optional true-fullscreen toggle, captions (with an
 * optional eyebrow and contextual link), Escape to close, Tab kept inside, and focus returned to
 * whatever opened it.
 */
export function Lightbox({ images, index, onIndex, onClose, label }: { images: LightboxImage[]; index: number; onIndex: (next: number) => void; onClose: () => void; label: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const count = images.length;
  const go = (next: number) => {
    setDir(next > index || (index === count - 1 && next === 0) ? 1 : -1);
    setZoom(false);
    onIndex((next + count) % count);
  };
  // Latest handlers for the key listener, so it is attached once per opening and focus returns once.
  const keys = useRef({ go, onClose, index });
  useEffect(() => {
    keys.current = { go, onClose, index };
  });

  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("[data-lightbox-close]")?.focus();
    document.documentElement.dataset.sheetOpen = "true";
    setCanFullscreen(Boolean(dialog?.requestFullscreen));
    const onKey = (event: KeyboardEvent) => {
      const { go, onClose, index } = keys.current;
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      if (event.key === "z" || event.key === "Z") setZoom((value) => !value);
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "Tab" && dialog) {
        const items = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const onFullscreen = () => setFullscreen(document.fullscreenElement === dialog);
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (document.fullscreenElement === dialog) void document.exitFullscreen().catch(() => {});
      delete document.documentElement.dataset.sheetOpen;
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    // Keep the current thumbnail in view without moving the page.
    const strip = thumbsRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.offsetWidth / 2, behavior: "smooth" });
  }, [index]);

  async function toggleFullscreen() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await dialog.requestFullscreen();
    } catch {
      /* fullscreen is optional */
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    swipe.current = event.pointerType === "mouse" || zoom ? null : event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (swipe.current === null) return;
    const dx = event.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };
  // Zoom follows the pointer, so the whole frame can be explored without a separate pan control.
  const trackZoom = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--zx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty("--zy", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
  };
  const neighbours = count > 1 ? [images[(index + 1) % count], images[(index - 1 + count) % count]] : [];

  const image = images[index];
  if (!image) return null;

  return (
    <div ref={dialogRef} className="tj-lightbox" role="dialog" aria-modal="true" aria-label={label} data-fullscreen={fullscreen ? "true" : undefined}>
      <div className="tj-lightbox__top">
        <span aria-live="polite" className="tj-lightbox__count">
          {String(index + 1).padStart(2, "0")} <span aria-hidden="true">/</span>
          <span className="sr-only">of</span> {String(count).padStart(2, "0")}
        </span>
        <div className="tj-lightbox__tools">
          <CircleButton icon={zoom ? "minus" : "plus"} label={zoom ? "Zoom out (Z)" : "Zoom in (Z)"} tone="outline-light" onClick={() => setZoom((value) => !value)} />
          {canFullscreen ? <CircleButton icon="expand" label={fullscreen ? "Exit full screen" : "Full screen"} tone="outline-light" onClick={toggleFullscreen} /> : null}
          <CircleButton icon="close" label="Close gallery" tone="outline-light" onClick={onClose} data-lightbox-close="" />
        </div>
      </div>
      <div className="tj-lightbox__image" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div
          className="tj-lightbox__stage"
          data-dir={dir}
          data-zoom={zoom ? "true" : "false"}
          onClick={(event) => {
            trackZoom(event as unknown as PointerEvent<HTMLDivElement>);
            setZoom((value) => !value);
          }}
          onPointerMove={zoom ? trackZoom : undefined}
        >
          <Image key={image.src} src={image.src} alt={image.alt} fill sizes="100vw" className="tj-lightbox__img" />
        </div>
        <div className="tj-lightbox__preload" aria-hidden="true">
          {neighbours.map((item) => (
            <Image key={item.src} src={item.src} alt="" width={16} height={16} sizes="100vw" loading="eager" />
          ))}
        </div>
      </div>
      <div className="tj-lightbox__caption">
        {image.eyebrow ? <p className="tj-eyebrow">{image.eyebrow}</p> : null}
        <p>{image.alt}</p>
        {image.link ? (
          <Link className="tj-text-link" href={image.link.href} onClick={onClose}>
            {image.link.label} <Icon name="arrow-right" size={16} />
          </Link>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="tj-lightbox__arrows">
          <CircleButton icon="arrow-left" label="Previous photo" tone="outline-light" onClick={() => go(index - 1)} />
          <CircleButton icon="arrow-right" label="Next photo" tone="outline-light" onClick={() => go(index + 1)} />
        </div>
      ) : null}
      {count > 1 ? (
        <div className="tj-lightbox__thumbs" ref={thumbsRef} role="group" aria-label="All photos">
          {images.map((item, thumb) => (
            <button key={`${item.src}-${thumb}`} type="button" data-index={thumb} aria-current={thumb === index ? "true" : undefined} aria-label={`Photo ${thumb + 1}: ${item.alt}`} onClick={() => onIndex(thumb)}>
              <Image src={item.src} alt="" fill sizes="96px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
