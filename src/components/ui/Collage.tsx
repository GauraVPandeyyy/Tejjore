import Image from "next/image";
import type { ReactNode } from "react";
import { ClipReveal } from "./Motion";

/**
 * Staggered editorial pair with a heading that overlaps both photos: the left image is taller and
 * starts lower, the right is shorter and sits higher. Images stay legible at the size shown.
 */
export function Collage({ heading, images }: { heading: ReactNode; images: [{ src: string; alt: string }, { src: string; alt: string }] }) {
  return (
    <div className="tj-collage">
      <ClipReveal className="tj-collage__photo tj-collage__photo--tall">
        <Image src={images[0].src} alt={images[0].alt} fill sizes="(min-width: 1024px) 34vw, 56vw" />
      </ClipReveal>
      <ClipReveal className="tj-collage__photo tj-collage__photo--short">
        <Image src={images[1].src} alt={images[1].alt} fill sizes="(min-width: 1024px) 28vw, 44vw" />
      </ClipReveal>
      <div className="tj-collage__heading">{heading}</div>
    </div>
  );
}
