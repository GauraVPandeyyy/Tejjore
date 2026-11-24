import Image from "next/image";
import Link from "next/link";
import type { RoomContent } from "@/lib/content/types";
import { BlurText } from "@/components/motion/BlurText";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { Icon } from "@/components/ui/Icon";
import { Waterline } from "@/components/ui/Waterline";
import { FromPrice } from "./RoomPrice";

/**
 * Room detail opening: the room's lead photograph full-bleed behind a parallax frame, the name
 * pulled into focus, the short description, the live "from" price (rate card) and two ways on —
 * check dates (jumps to the booking rail) or look through the photographs. The visible name is
 * inside the single <h1>; nothing here invents a fact.
 */
export function RoomHero({ room }: { room: RoomContent }) {
  const lead = room.imageSet[0];
  return (
    <section className="tj-room-hero" data-hero-overlay="" aria-labelledby="room-title">
      {lead ? (
        <ParallaxFrame className="tj-room-hero__media" speed={9} reveal={false}>
          <Image src={lead} alt={`${room.name} at Tejjora Lake View`} fill priority sizes="100vw" />
        </ParallaxFrame>
      ) : null}
      <span className="tj-room-hero__shade" aria-hidden="true" />
      <div className="tj-container tj-room-hero__copy">
        <Link className="tj-room-hero__back" href="/rooms">
          <Icon name="arrow-left" size={16} /> All rooms
        </Link>
        <p className="tj-eyebrow">Tejjora Lake View · Stay</p>
        <h1 id="room-title" className="sr-only">
          {room.name}
        </h1>
        <p className="tj-room-hero__title" aria-hidden="true">
          <BlurText as="span" text={room.name} effect="focus" blur={14} distance={0} delay={150} stepDuration={0.7} trigger="load" />
        </p>
        {room.shortDescription ? <p className="tj-room-hero__lead">{room.shortDescription}</p> : null}
        <FromPrice rate={room.rate} className="tj-room-hero__price" showNote={false} />
        <div className="tj-room-hero__actions">
          <a href="#room-booking" className="tj-pill tj-pill--cream">
            <span>Check dates</span>
            <span className="tj-pill__dot" aria-hidden="true" />
          </a>
          {room.imageSet.length > 1 ? (
            <a href="#room-film" className="tj-pill tj-pill--outline-light">
              <Icon name="camera" size={16} />
              <span>{room.imageSet.length} photographs</span>
            </a>
          ) : null}
        </div>
      </div>
      <Waterline variant="hero" className="tj-room-hero__line" />
    </section>
  );
}
