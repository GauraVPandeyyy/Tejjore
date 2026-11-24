import Image from "next/image";
import Link from "next/link";
import { tripPurposeOptions } from "@/data/planner";
import type { RoomContent } from "@/lib/content/types";
import { plannerSuggestionsForRoom } from "@/lib/planner/rules";
import type { RoomId } from "@/types/hotel";
import { AskTrigger } from "@/components/ui/AskTrigger";
import { Icon } from "@/components/ui/Icon";
import { FromPrice } from "./RoomPrice";

/** "Couples · Families" — the trips the stay planner suggests this room for (never a new claim). */
export function suggestedFor(roomId: RoomId) {
  return plannerSuggestionsForRoom(roomId).map(({ purpose }) => tripPurposeOptions.find((option) => option.id === purpose)?.label ?? purpose);
}

/**
 * Shared room card (home, /rooms, room detail "other rooms"): Book and Ask sit on the image, the
 * display title overlaps the image edge, then the planner's "suggested for", capacity (only when
 * admin has set it), the live rate-card price, and one link. Unknown facts are simply not shown.
 */
export function RoomCard({ room, headingLevel = "h3", priority = false }: { room: RoomContent; headingLevel?: "h2" | "h3"; priority?: boolean }) {
  const Heading = headingLevel;
  const image = room.imageSet[0];
  const suggested = suggestedFor(room.id);
  return (
    <article className="tj-room-card" aria-labelledby={`room-${room.id}-title`}>
      <div className="tj-room-card__media">
        <Link href={`/rooms/${room.slug}`} tabIndex={-1} aria-hidden="true" className="tj-room-card__image-link">
          {image ? <Image src={image} alt="" fill sizes="(min-width: 1024px) 31vw, (min-width: 768px) 46vw, 86vw" loading={priority ? "eager" : undefined} /> : null}
        </Link>
        <div className="tj-room-card__actions">
          <AskTrigger topic={room.name} className="tj-pill tj-pill--cream tj-pill--small" label={`Ask about the ${room.name}`}>
            <span>Ask</span>
          </AskTrigger>
          <Link href={`/book?room=${room.id}`} className="tj-pill tj-pill--lake tj-pill--small" aria-label={`Book the ${room.name}`}>
            <span>Book</span>
            <span className="tj-pill__dot" aria-hidden="true" />
          </Link>
        </div>
        {room.imageSet.length > 1 ? (
          <span className="tj-room-card__count" aria-hidden="true">
            <Icon name="camera" size={14} /> {room.imageSet.length}
          </span>
        ) : null}
      </div>
      <Heading id={`room-${room.id}-title`} className="tj-room-card__title">
        <Link href={`/rooms/${room.slug}`}>{room.name}</Link>
      </Heading>
      <div className="tj-room-card__meta">
        {suggested.length ? (
          <p className="tj-room-card__for">
            <span>Suggested for</span> {suggested.join(" · ")}
          </p>
        ) : null}
        {room.maxGuests ? <p className="tj-room-card__capacity">Up to {room.maxGuests} guests</p> : null}
        <FromPrice rate={room.rate} />
        <Link href={`/rooms/${room.slug}`} className="tj-text-link">
          View room <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </article>
  );
}
