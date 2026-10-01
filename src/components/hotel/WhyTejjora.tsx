"use client";

import Image from "next/image";
import { useState } from "react";
import { whyTejjora } from "@/data/experience";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function WhyTejjora({ index = "07" }: { index?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = whyTejjora[activeIndex];

  return (
    <section className="why-tejjora" aria-labelledby="why-tejjora-title">
      <div className="site-container">
        <div className="why-tejjora__topline">
          <SectionLabel index={index}>WHY TEJJORA</SectionLabel>
          <span className="micro">VIEW · LOCATION · DINING · SCALE · SUPPORT</span>
        </div>

        <div className="why-tejjora__grid">
          <div className="why-tejjora__list">
            <h2 id="why-tejjora-title">The reasons are<br /><em>part of the stay.</em></h2>
            <div className="why-tejjora__items">
              {whyTejjora.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-active={activeIndex === index ? "true" : "false"}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <small>{item.label}</small>
                    <strong>{item.headline}</strong>
                  </div>
                  <i aria-hidden="true">↗</i>
                </button>
              ))}
            </div>
          </div>

          <div className="why-tejjora__visual" aria-live="polite">
            <div className="why-tejjora__media" data-placeholder={active.imageIsPlaceholder ? "true" : "false"}>
              <Image
                key={active.image}
                src={active.image}
                alt={active.imageIsPlaceholder ? "" : active.headline}
                fill
                sizes="(max-width: 900px) 100vw, 44vw"
              />
            </div>
            <p>{active.copy}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
