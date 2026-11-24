import Image from "next/image";
import Link from "next/link";
import type { RoomContent } from "@/lib/content/types";
import { plannerSuggestionsForRoom } from "@/lib/planner/rules";
import { AskTrigger } from "@/components/ui/AskTrigger";
import { Icon } from "@/components/ui/Icon";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { TiltFrame } from "@/components/motion/TiltFrame";
import { suggestedFor } from "./RoomCard";
import { FromPrice } from "./RoomPrice";

/**
 * One room as an editorial chapter: a large outlined numeral behind the copy; the lead photograph
 * in a tilting, parallaxing frame with up to two smaller photographs layered over its corners at
 * different scroll speeds (real depth, no WebGL); the short description revealed word by word as
 * it scrolls into view. All content is the room's own — description, planner reason, rate card.
 */
export function RoomChapter({ room, index, hasTour }: { room: RoomContent; index: number; hasTour: boolean }) {
  const reasons = plannerSuggestionsForRoom(room.id);
  const [lead, second, third] = room.imageSet;
  const flip = index % 2 === 1;
  return (
    <article className="tj-chapter tj-chapter--cine" data-flip={flip ? "true" : undefined} aria-labelledby={`chapter-${room.id}`}>
      <div className="tj-container tj-chapter__grid">
        <div className="tj-chapter__copy">
          <span className="tj-chapter__numeral" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 id={`chapter-${room.id}`} className="tj-chapter__name">
            <Link href={`/rooms/${room.slug}`}>{room.name}</Link>
          </h3>
          {room.shortDescription ? (
            <ScrollReveal as="p" containerClassName="tj-chapter__lead" splitBy="words" effect="fade" baseOpacity={0.15} baseRotation={0} enableBlur blurStrength={3} stagger={0.03} wordAnimationEnd="center 55%">
              {room.shortDescription}
            </ScrollReveal>
          ) : null}
          {reasons.length ? (
            <figure className="tj-chapter__quote">
              <blockquote>{reasons[0].reason}</blockquote>
              <figcaption>Stay planner · suggested for {suggestedFor(room.id).join(", ").toLowerCase()}</figcaption>
            </figure>
          ) : null}
          <FromPrice rate={room.rate} className="tj-price tj-chapter__price" />
          <div className="tj-chapter__actions">
            <Link href={`/book?room=${room.id}`} className="tj-pill tj-pill--lake">
              <span>Check dates</span>
              <span className="tj-pill__dot" aria-hidden="true" />
            </Link>
            <Link href={`/rooms/${room.slug}`} className="tj-pill tj-pill--outline">
              <span>View room</span>
            </Link>
          </div>
          <p className="tj-chapter__links">
            <Link className="tj-text-link" href="/gallery#chapter-Stay">
              <Icon name="camera" size={16} /> All room photographs
            </Link>
            <Link className="tj-text-link" href={hasTour ? `/virtual-tour?scene=${room.id}` : "/virtual-tour"}>
              <Icon name="orbit" size={16} /> {hasTour ? "360° view of this room" : "360° hotel tour"}
            </Link>
            <AskTrigger topic={room.name} className="tj-text-link">
              <Icon name="chat" size={16} /> Ask about this room
            </AskTrigger>
          </p>
        </div>

        <div className="tj-chapter__stage" aria-label={`${room.name} photographs`}>
          {lead ? (
            <TiltFrame className="tj-chapter__lead-frame">
              <ParallaxFrame className="tj-chapter__photo tj-chapter__photo--lead" speed={7} from={flip ? "right" : "left"}>
                <Image src={lead} alt={`${room.name} at Tejjora Lake View`} fill sizes="(min-width: 1024px) 46vw, 92vw" />
              </ParallaxFrame>
            </TiltFrame>
          ) : null}
          {second ? (
            <ParallaxFrame className="tj-chapter__photo tj-chapter__photo--second" speed={16} from="bottom">
              <Image src={second} alt={`${room.name}, second photograph`} fill sizes="(min-width: 1024px) 22vw, 46vw" />
            </ParallaxFrame>
          ) : null}
          {third ? (
            <ParallaxFrame className="tj-chapter__photo tj-chapter__photo--third" speed={22} from="bottom">
              <Image src={third} alt={`${room.name}, third photograph`} fill sizes="(min-width: 1024px) 16vw, 38vw" />
            </ParallaxFrame>
          ) : null}
        </div>
      </div>
    </article>
  );
}
