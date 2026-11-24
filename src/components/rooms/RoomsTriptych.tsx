"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { RoomRateCard } from "@/lib/booking/rateCard";
import { Icon } from "@/components/ui/Icon";
import { FromPrice } from "./RoomPrice";

export type TriptychPanel = {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  image: string;
  photoCount: number;
  suggested: string[];
  rate: RoomRateCard | null;
};

/**
 * The Rooms hero: the three categories as full-height photographic panels. From 900 px the active
 * panel opens (hover, focus or tap) while the others fold to a vertical name tab; on phones the
 * panels stack as tall cards with everything visible. Each panel's title link covers the panel
 * (so the whole photograph navigates) while Ask/Book sit above it; the price is the shared rate
 * card via FromPrice — never a number of its own.
 */
export function RoomsTriptych({ panels }: { panels: TriptychPanel[] }) {
  const [active, setActive] = useState(0);
  return (
    <ul className="tj-trip" role="list">
      {panels.map((panel, index) => (
        <li key={panel.id} className="tj-trip__panel" data-active={active === index ? "true" : "false"} onPointerEnter={(event) => event.pointerType === "mouse" && setActive(index)} onFocusCapture={() => setActive(index)}>
          <article aria-labelledby={`trip-${panel.id}`} className="tj-trip__card">
            <Image src={panel.image} alt="" fill priority={index === 0} sizes="(min-width: 900px) 60vw, 100vw" className="tj-trip__image" />
            <span className="tj-trip__veil" aria-hidden="true" />
            <span className="tj-trip__no" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="tj-trip__tab" aria-hidden="true">
              {panel.name}
            </span>
            <div className="tj-trip__body">
              <h2 id={`trip-${panel.id}`} className="tj-trip__title">
                <Link href={`/rooms/${panel.slug}`} onClick={() => setActive(index)}>
                  {panel.name}
                </Link>
              </h2>
              <div className="tj-trip__details">
                {panel.blurb ? <p className="tj-trip__blurb">{panel.blurb}</p> : null}
                {panel.suggested.length ? (
                  <p className="tj-trip__for">
                    <span>Suggested for</span> {panel.suggested.join(" · ")}
                  </p>
                ) : null}
                <FromPrice rate={panel.rate} className="tj-trip__price" showNote={false} />
                <div className="tj-trip__actions">
                  <Link href={`/book?room=${panel.id}`} className="tj-pill tj-pill--cream tj-pill--small" aria-label={`Check dates for the ${panel.name}`}>
                    <span>Check dates</span>
                    <span className="tj-pill__dot" aria-hidden="true" />
                  </Link>
                  <span className="tj-trip__count">
                    <Icon name="camera" size={14} /> {panel.photoCount} photographs
                  </span>
                </div>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
