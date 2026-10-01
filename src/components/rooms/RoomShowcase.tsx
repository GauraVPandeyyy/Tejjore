"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { rooms } from "@/data/rooms";
import { SectionLabel } from "@/components/shared/SectionLabel";

function roomCode(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function RoomShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = rooms[activeIndex];

  return (
    <section id="rooms" className="stay-showcase" aria-labelledby="stay-showcase-title">
      <div className="site-container">
        <div className="stay-showcase__topline">
          <SectionLabel index="03">STAY</SectionLabel>
          <span className="micro">29 ROOMS / 03 CATEGORIES</span>
        </div>

        <div className="stay-showcase__intro">
          <h2 id="stay-showcase-title">Three ways<br /><em>to stay.</em></h2>
          <p>Choose the room that fits the pace of your Lucknow visit. Every category keeps the essentials close; the final room-specific size, bed configuration and occupancy will be confirmed by the hotel.</p>
        </div>

        <div className="stay-showcase__experience">
          <div className="stay-showcase__selector" role="tablist" aria-label="Room categories">
            {rooms.map((room, index) => (
              <button
                key={room.id}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                className="stay-showcase__room-tab"
                data-active={activeIndex === index ? "true" : "false"}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              >
                <span>{roomCode(index)}</span>
                <strong>{room.name.replace(" Room", "")}</strong>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>

          <div className="stay-showcase__visual" role="tabpanel" aria-label={active.name}>
            <div className="stay-showcase__image-frame">
              {rooms.map((room, index) => (
                <div
                  key={room.id}
                  className="stay-showcase__image-layer"
                  data-active={activeIndex === index ? "true" : "false"}
                  aria-hidden={activeIndex !== index}
                >
                  <Image
                    src={room.imageSet[0]}
                    alt={activeIndex === index ? `${room.name} at Tejjora Lake View` : ""}
                    fill
                    sizes="(max-width: 820px) 100vw, 64vw"
                  />
                </div>
              ))}
              <div className="stay-showcase__image-index micro">ROOM / {roomCode(activeIndex)}</div>
            </div>

            <div className="stay-showcase__detail">
              <div>
                <span className="micro">{active.name}</span>
                <p>{active.shortDescription}</p>
              </div>
              <div className="stay-showcase__amenities" aria-label={`${active.name} highlights`}>
                {active.amenities.slice(0, 5).map((amenity) => (
                  <span key={amenity.id}>{amenity.label}</span>
                ))}
              </div>
              <div className="stay-showcase__actions">
                <Link href={`/rooms#${active.id}`} className="stay-showcase__link stay-showcase__link--primary">
                  <span>See the room</span><span aria-hidden="true">↗</span>
                </Link>
                <Link href={`/virtual-tour?scene=${active.id}`} className="stay-showcase__link">
                  <span>Step inside 360°</span><span aria-hidden="true">↗</span>
                </Link>
                <Link href={`/book?room=${active.id}`} className="stay-showcase__link">
                  <span>Check dates</span><span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
