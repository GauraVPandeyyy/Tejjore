"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";
import { restaurant } from "@/data/restaurant";
import { SectionLabel } from "@/components/shared/SectionLabel";

const moments = [
  {
    id: "room",
    index: "01",
    label: "Dining room",
    title: "A table that belongs to the stay.",
    copy: "Warm, contemporary and easy-going — a useful room for breakfast, a conversation, an informal meeting or an unhurried meal downstairs.",
    image: assets.restaurant[0],
  },
  {
    id: "morning",
    index: "02",
    label: "Morning",
    title: "Breakfast, without another journey.",
    copy: restaurant.vegetarianBreakfastAvailable
      ? "Breakfast is available at Tejjora, including vegetarian options. Exact timings and inclusions follow the selected stay plan."
      : "Breakfast is available at Tejjora. Exact timings and inclusions follow the selected stay plan.",
    image: assets.restaurant[5],
  },
  {
    id: "evening",
    index: "03",
    label: "Evening",
    title: "Stay downstairs when the day is done.",
    copy: "The restaurant keeps the evening straightforward: a comfortable setting inside the hotel, with the team close by for current dining details.",
    image: assets.restaurant[3],
  },
] as const;

export function RestaurantExperience({ index = "05" }: { index?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = moments[activeIndex];
  const diningWhatsapp = `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(
    "Hello Tejjora Lake View, I would like to enquire about dining at the restaurant.",
  )}`;

  return (
    <section id="restaurant" className="restaurant-experience restaurant-experience--v3" aria-labelledby="restaurant-title">
      <div className="site-container">
        <div className="restaurant-v3__topline">
          <SectionLabel index={index}>DINING</SectionLabel>
          <Link href="/dining" className="v3-inline-link">Explore dining <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="restaurant-v3__intro">
          <h2 id="restaurant-title">Come for breakfast.<br /><em>Stay for the table.</em></h2>
          <div>
            <p>Dining at Tejjora is part of the hotel rhythm, not a separate spectacle — a bright room downstairs for mornings, meetings and an easy end to the day.</p>
            <div className="restaurant-v3__actions">
              <Link className="v3-liquid-button v3-liquid-button--dark" href="/dining"><span>Explore dining</span><i aria-hidden="true">↗</i></Link>
              <a className="v3-liquid-button v3-liquid-button--light" href={diningWhatsapp}><span>Table enquiry</span><i aria-hidden="true">↗</i></a>
            </div>
          </div>
        </div>

        <div className="restaurant-v3__stage">
          <figure className="restaurant-v3__media" aria-live="polite">
            {moments.map((moment, i) => (
              <div key={moment.id} className="restaurant-v3__media-layer" data-active={i === activeIndex ? "true" : "false"} aria-hidden={i !== activeIndex}>
                <Image src={moment.image} alt={i === activeIndex ? `${moment.label} at Tejjora Lake View` : ""} fill sizes="(max-width: 820px) 100vw, 64vw" />
              </div>
            ))}
            <figcaption>
              <span>{active.index} / {active.label}</span>
              <strong>{active.title}</strong>
            </figcaption>
          </figure>

          <div className="restaurant-v3__moments" role="tablist" aria-label="Dining moments">
            {moments.map((moment, i) => (
              <button
                key={moment.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex ? "true" : "false"}
                onMouseEnter={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                onClick={() => setActiveIndex(i)}
              >
                <span className="restaurant-v3__moment-index">{moment.index}</span>
                <span className="restaurant-v3__moment-copy">
                  <small>{moment.label}</small>
                  <strong>{moment.title}</strong>
                  <p>{moment.copy}</p>
                </span>
                <i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>
        </div>

        <div className="restaurant-v3__facts" aria-label="Dining information">
          <span><small>Breakfast</small><strong>{restaurant.servesBreakfast ? "Available" : "Confirm with hotel"}</strong></span>
          <span><small>Vegetarian breakfast</small><strong>{restaurant.vegetarianBreakfastAvailable ? "Available" : "Confirm with hotel"}</strong></span>
          <span><small>Current timings</small><strong>Confirm with hotel</strong></span>
          <span><small>Table enquiry</small><strong>Direct with Tejjora</strong></span>
        </div>
      </div>
    </section>
  );
}
