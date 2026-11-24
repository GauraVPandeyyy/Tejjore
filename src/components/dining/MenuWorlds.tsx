"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { formatMoney } from "@/data/commerce";
import type { MenuCategory } from "@/lib/content/types";
import { Icon } from "@/components/ui/Icon";

const EASE = [0.22, 0.61, 0.36, 1] as const;

/**
 * The menu as a set of worlds: choose a section (hover, focus or tap) and the stage changes — the
 * restaurant photograph crossfades, the section's name, dish count, starting price and its first
 * dishes (with their prices) slide in. Every name, count and price is the live menu data. The
 * photographs show the restaurant, not the food — no dish photography exists, none is implied.
 * Motion drives the content transitions; the photograph crossfade is CSS.
 */
export function MenuWorlds({ menu, photos, hrefBase = "" }: { menu: MenuCategory[]; photos: readonly string[]; hrefBase?: string }) {
  const [active, setActive] = useState(0);
  const category = menu[active];
  if (!category) return null;
  const from = (entry: MenuCategory) => {
    const prices = entry.items.map((item) => item.priceHalf ?? item.priceFull);
    return prices.length ? Math.min(...prices) : null;
  };
  const price = from(category);
  const shown = category.items.slice(0, 6);
  const photo = active % Math.max(photos.length, 1);

  return (
    <MotionConfig reducedMotion="user">
      <div className="tj-dn-worlds">
        <ul className="tj-dn-worlds__list" aria-label="Menu sections">
          {menu.map((entry, index) => (
            <li key={entry.id}>
              <button type="button" aria-pressed={index === active} onClick={() => setActive(index)} onPointerEnter={(event) => event.pointerType === "mouse" && setActive(index)} onFocus={() => setActive(index)}>
                <span className="tj-dn-worlds__no" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="tj-dn-worlds__name">{entry.name}</span>
                <span className="tj-dn-worlds__count">{entry.items.length}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="tj-dn-worlds__stage">
          <div className="tj-dn-worlds__photos" aria-hidden="true">
            {photos.map((src, index) => (
              <Image key={src} src={src} alt="" fill sizes="(min-width: 1024px) 52vw, 100vw" data-on={index === photo ? "true" : "false"} />
            ))}
          </div>
          <span className="tj-dn-worlds__veil" aria-hidden="true" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={category.id} className="tj-dn-worlds__panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.38, ease: EASE }}>
              <p className="tj-dn-worlds__meta">
                <span>{String(active + 1).padStart(2, "0")}</span>
                {category.items.length} {category.items.length === 1 ? "dish" : "dishes"}
                {price !== null ? ` · from ${formatMoney(price)}` : ""}
              </p>
              <h3 className="tj-dn-worlds__title">{category.name}</h3>
              <ul className="tj-dn-worlds__dishes">
                {shown.map((item, index) => (
                  <motion.li key={item.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.08 + index * 0.045 }}>
                    <span>{item.name}</span>
                    <strong>
                      {item.priceHalf !== null ? <small>from </small> : null}
                      {formatMoney(item.priceHalf ?? item.priceFull)}
                    </strong>
                  </motion.li>
                ))}
              </ul>
              {category.items.length > shown.length ? <p className="tj-dn-worlds__more">and {category.items.length - shown.length} more</p> : null}
              <a className="tj-pill tj-pill--cream tj-pill--small" href={`${hrefBase}#${category.slug}`}>
                <span>Open {category.name}</span>
                <Icon name="arrow-right" size={16} />
              </a>
            </motion.div>
          </AnimatePresence>
          <p className="tj-dn-worlds__caption">The restaurant, photographed at the hotel.</p>
        </div>
      </div>
    </MotionConfig>
  );
}
