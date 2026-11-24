import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { RoomContent } from "@/lib/content/types";
import { Icon } from "@/components/ui/Icon";
import { suggestedFor } from "./RoomCard";
import { FromPrice } from "./RoomPrice";

type Row = { label: string; values: React.ReactNode[] };

/**
 * Rows only where every room has a known value (masterplan §4): the planner's suggestion, specs
 * once the hotel has set them for all three rooms, what is in the room, and the photographs and
 * 360° stop that exist. The price row is the shared rate card, never a separate number.
 */
function compareRows(rooms: RoomContent[], tourRooms: Set<string>): Row[] {
  const rows: Row[] = [];
  const suggestions = rooms.map((room) => suggestedFor(room.id));
  if (suggestions.every((list) => list.length)) rows.push({ label: "Suggested for", values: suggestions.map((list) => list.join(" · ")) });
  if (rooms.every((room) => room.maxGuests)) rows.push({ label: "Guests", values: rooms.map((room) => `Up to ${room.maxGuests}`) });
  if (rooms.every((room) => room.bedType)) rows.push({ label: "Bed", values: rooms.map((room) => room.bedType!) });
  if (rooms.every((room) => room.sizeSqFt)) rows.push({ label: "Size", values: rooms.map((room) => `${room.sizeSqFt} sq ft`) });
  if (rooms.every((room) => room.view)) rows.push({ label: "View", values: rooms.map((room) => room.view!) });
  rows.push({
    label: "In the room",
    values: rooms.map((room) => (
      <ul key={room.id} className="tj-compare__checks">
        {room.amenities.map((amenity) => (
          <li key={amenity.id}>
            <span aria-hidden="true">✓</span> {amenity.label}
          </li>
        ))}
      </ul>
    )),
  });
  rows.push({
    label: "See it first",
    values: rooms.map((room) => `${room.imageSet.length} photograph${room.imageSet.length === 1 ? "" : "s"}${tourRooms.has(room.id) ? " · 360° stop" : ""}`),
  });
  return rows;
}

export function RoomCompare({ rooms, tourRooms = new Set<string>(), highlight, tone = "paper" }: { rooms: RoomContent[]; tourRooms?: Set<string>; highlight?: string; tone?: "paper" | "lake" }) {
  const rows = compareRows(rooms, tourRooms);
  return (
    <div className="tj-compare" data-tone={tone} style={{ "--tj-compare-rows": rows.length } as CSSProperties} role="list" aria-label="Room comparison">
      {rooms.map((room, column) => (
        <article key={room.id} className="tj-compare__col" role="listitem" aria-labelledby={`compare-${room.id}`} data-current={highlight === room.id ? "true" : undefined}>
          <div className="tj-compare__head">
            <Link href={`/rooms/${room.slug}`} className="tj-compare__media" tabIndex={-1} aria-hidden="true">
              {room.imageSet[0] ? <Image src={room.imageSet[0]} alt="" fill sizes="(min-width: 1024px) 26vw, 80vw" /> : null}
            </Link>
            {highlight === room.id ? <span className="tj-compare__current">This room</span> : null}
            <h3 id={`compare-${room.id}`} className="tj-compare__name">
              <Link href={`/rooms/${room.slug}`}>{room.name}</Link>
            </h3>
            <FromPrice rate={room.rate} className="tj-price tj-compare__price" />
          </div>
          {rows.map((row) => (
            <div key={row.label} className="tj-compare__cell">
              <span className="tj-compare__label">{row.label}</span>
              <div className="tj-compare__value">{row.values[column]}</div>
            </div>
          ))}
          <div className="tj-compare__cta">
            <Link href={`/book?room=${room.id}`} className={`tj-pill tj-pill--${tone === "lake" ? "cream" : "lake"} tj-pill--small`}>
              <span>Check dates</span>
              <span className="tj-pill__dot" aria-hidden="true" />
            </Link>
            <Link href={`/rooms/${room.slug}`} className="tj-text-link">
              View room <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
