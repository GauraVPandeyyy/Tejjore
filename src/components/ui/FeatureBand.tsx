import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";

export type Band = { href: string; title: string; eyebrow: string; image: string; alt: string };

/**
 * Gap-less full-bleed photo strips that act as compact links to real sub-pages: stacked (≈38svh)
 * on mobile, three across on desktop. The whole band is the link; the title sits bottom-left.
 */
export function FeatureBands({ bands, label }: { bands: Band[]; label: string }) {
  return (
    <nav className="tj-bands" aria-label={label}>
      {bands.map((band) => (
        <Link key={band.href} href={band.href} className="tj-band">
          <Image src={band.image} alt={band.alt} fill sizes="(min-width: 1024px) 34vw, 100vw" className="tj-band__image" />
          <span className="tj-band__shade" aria-hidden="true" />
          <span className="tj-band__copy">
            <span className="tj-eyebrow">{band.eyebrow}</span>
            <span className="tj-band__title">{band.title}</span>
          </span>
          <span className="tj-band__arrow" aria-hidden="true">
            <Icon name="arrow-right" size={18} />
          </span>
        </Link>
      ))}
    </nav>
  );
}
