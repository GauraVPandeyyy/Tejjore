"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { assets } from "@/data/assets";
import { formatMoney } from "@/data/commerce";
import type { MenuCategory, MenuItem, RestaurantSettings } from "@/lib/content/types";
import { orderingWindow, type OrderSize } from "@/lib/restaurant/rules";
import { OrderCart } from "./OrderCart";
import { useCart } from "./useCart";
import { Icon } from "@/components/ui/Icon";
import { matchesQuery } from "./menuSearch";

/**
 * The complete hotel menu. Phones: a sticky search + category rail (chips never shrink, the rail
 * scrolls itself, never the page). From 1024 px: a sticky category index with dish counts beside
 * the list. Forgiving search, variants as chips, half prices only where the menu prints one, the
 * egg marker only where flagged, unavailable dishes dimmed. Request-to-order: dishes go into a cart
 * (see OrderCart); the server decides availability, prices and whether ordering is open.
 */
export function MenuBrowser({ menu, settings }: { menu: MenuCategory[]; settings: RestaurantSettings }) {
  const cart = useCart(menu);
  const [cartOpen, setCartOpen] = useState(false);
  // Re-evaluated every minute so the opening time applies without a reload.
  const [clock, setClock] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(new Date());
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const ordering = clock ? orderingWindow(settings, clock) : orderingWindow({ ...settings, openingTime: null }, new Date());
  const orderingMessage = ordering.open ? null : ordering.message;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(menu[0]?.slug ?? "");
  const chipsRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return menu;
    return menu
      .map((category) => ({ ...category, items: category.items.filter((item) => matchesQuery([item.name, item.sourceName, item.description, ...item.variants, category.name].filter(Boolean).join(" "), query)) }))
      .filter((category) => category.items.length);
  }, [menu, query]);
  const resultCount = filtered.reduce((sum, category) => sum + category.items.length, 0);
  const total = menu.reduce((sum, category) => sum + category.items.length, 0);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-menu-section]")];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-180px 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [filtered]);

  useEffect(() => {
    // Scroll only the chip rail (never the page) so the active section's chip stays visible.
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    if (row && chip && row.scrollWidth > row.clientWidth) row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.offsetWidth / 2, behavior: "smooth" });
  }, [active]);

  const position = (slug: string) => String(menu.findIndex((category) => category.slug === slug) + 1).padStart(2, "0");

  return (
    <div className="tj-menu-browser">
      <aside className="tj-menu-browser__index" aria-label="Menu sections">
        <p className="tj-eyebrow">{query.trim() ? `${resultCount} of ${total} dishes` : `${menu.length} sections · ${total} dishes`}</p>
        <ol>
          {filtered.map((category) => (
            <li key={category.id}>
              <a href={`#${category.slug}`} aria-current={active === category.slug ? "true" : undefined}>
                <span className="tj-menu-browser__index-no" aria-hidden="true">
                  {position(category.slug)}
                </span>
                <span>{category.name}</span>
                <span className="tj-menu-browser__index-count">{category.items.length}</span>
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <div className="tj-menu-browser__main">
        <div className="tj-menu-browser__bar">
          <label className="tj-search">
            <Icon name="search" size={18} />
            <span className="sr-only">Search the menu</span>
            <input type="search" placeholder="Search dishes — paneer, biryani, soup…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
            {query ? (
              <button type="button" className="tj-search__clear" onClick={() => setQuery("")} aria-label="Clear the search">
                <Icon name="close" size={16} />
              </button>
            ) : null}
          </label>
          <div className="tj-menu-browser__chips" ref={chipsRef} role="navigation" aria-label="Menu sections">
            {filtered.map((category) => (
              <a key={category.id} href={`#${category.slug}`} data-slug={category.slug} className="tj-chip" aria-current={active === category.slug ? "true" : undefined}>
                {category.name}
              </a>
            ))}
          </div>
        </div>

        {orderingMessage ? (
          <p className="tj-menu-browser__status" role="status">
            <Icon name="clock" size={18} />
            <span>{orderingMessage}</span>
          </p>
        ) : (
          <p className="tj-menu-browser__status tj-menu-browser__status--open">
            <Icon name="tray" size={18} />
            <span>Ordering is open. Add dishes, then send the request; the restaurant confirms it.</span>
          </p>
        )}

        <p className="sr-only" aria-live="polite">
          {query.trim() ? `${resultCount} dishes match “${query.trim()}”.` : ""}
        </p>

        {filtered.length === 0 ? (
          <p className="tj-menu-browser__empty">
            Nothing matches “{query}”. Try another word, <button type="button" className="tj-text-link" onClick={() => setQuery("")}>clear the search</button>, or{" "}
            <button type="button" className="tj-text-link" onClick={() => window.dispatchEvent(new CustomEvent("tejjora:concierge-open", { detail: { topic: "menu" } }))}>
              ask Mezbaan
            </button>
            , who reads the same menu.
          </p>
        ) : null}

        {filtered.map((category) => (
          <section key={category.id} id={category.slug} data-menu-section="" className="tj-menu-section" aria-labelledby={`menu-${category.slug}`}>
            <div className="tj-menu-section__top">
              {/* The restaurant, not the food: decorative interior photograph behind the section title. */}
              <span className="tj-menu-section__banner" aria-hidden="true">
                <Image src={assets.restaurant[menu.findIndex((entry) => entry.slug === category.slug) % assets.restaurant.length]} alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" />
              </span>
              <header className="tj-menu-section__head">
                <span className="tj-menu-section__no" aria-hidden="true">
                  {position(category.slug)}
                </span>
                <h2 id={`menu-${category.slug}`} className="tj-menu-section__title">
                  {category.name}
                </h2>
                <span className="tj-menu-section__count">
                  {category.items.length} {category.items.length === 1 ? "dish" : "dishes"}
                </span>
              </header>
            </div>
            {category.note ? <p className="tj-menu-section__note">{category.note}</p> : null}
            <ul className="tj-menu-list">
              {category.items.map((item) => (
                <MenuRow key={item.id} item={item} canOrder={!orderingMessage} inCart={cart.inCart(item.id)} onAdd={(variant, size) => cart.add(item.id, variant, size)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <OrderCart cart={cart} settings={settings} orderingMessage={orderingMessage} open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}

function MenuRow({ item, canOrder, inCart, onAdd }: { item: MenuItem; canOrder: boolean; inCart: number; onAdd: (variant: string | null, size: OrderSize | null) => void }) {
  const [variant, setVariant] = useState<string | null>(item.variants.length === 1 ? item.variants[0] : null);
  const [size, setSize] = useState<OrderSize>("full");
  const [added, setAdded] = useState(false);
  const needsVariant = item.variants.length > 1 && !variant;
  const ordering = item.available && canOrder;

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <li className="tj-menu-item" data-available={item.available ? "true" : "false"} data-in-cart={inCart > 0 ? "true" : undefined}>
      <div className="tj-menu-item__main">
        <h3 className="tj-menu-item__name">
          {item.name}
          {item.signature ? <span className="tj-badge">Signature</span> : null}
          {item.containsEgg ? (
            <span className="tj-egg" title="Contains egg">
              <span aria-hidden="true">E</span>
              <span className="sr-only">Contains egg</span>
            </span>
          ) : null}
        </h3>
        {item.description ? <p className="tj-menu-item__desc">{item.description}</p> : null}
        {/* Options shown as text while ordering is closed; as choices when it is open. */}
        {!ordering && (item.variants.length || item.portion) ? (
          <p className="tj-menu-item__variants">
            {item.portion ? <span className="tj-variant">{item.portion}</span> : null}
            {item.variants.map((option) => (
              <span key={option} className="tj-variant">
                {option}
              </span>
            ))}
          </p>
        ) : null}
        {ordering ? (
          <div className="tj-menu-item__order">
            {item.portion ? <span className="tj-variant">{item.portion}</span> : null}
            {item.variants.length > 1 ? (
              <div className="tj-option-row" role="group" aria-label={`Option for ${item.name}`}>
                {item.variants.map((option) => (
                  <button key={option} type="button" className="tj-option" aria-pressed={variant === option} onClick={() => setVariant(option)}>
                    {option}
                  </button>
                ))}
              </div>
            ) : item.variants.length === 1 ? (
              <span className="tj-variant">{item.variants[0]}</span>
            ) : null}
            {item.priceHalf !== null ? (
              <div className="tj-option-row" role="group" aria-label={`Portion for ${item.name}`}>
                {(["half", "full"] as const).map((option) => (
                  <button key={option} type="button" className="tj-option" aria-pressed={size === option} onClick={() => setSize(option)}>
                    {option === "half" ? "Half" : "Full"}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="tj-menu-item__add">
              <button
                type="button"
                className="tj-pill tj-pill--small tj-pill--outline tj-menu-item__add-btn"
                disabled={needsVariant}
                onClick={() => {
                  onAdd(variant, item.priceHalf !== null ? size : null);
                  setAdded(true);
                }}
              >
                {needsVariant ? null : <Icon name="plus" size={14} />}
                <span>{needsVariant ? "Choose an option" : "Add to order"}</span>
              </button>
              {inCart > 0 ? (
                <span className="tj-menu-item__incart" data-pulse={added ? "true" : undefined} aria-live="polite">
                  {inCart} in your order
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        {!item.available ? <p className="tj-menu-item__unavailable">Not available today</p> : null}
      </div>
      <p className="tj-menu-item__price">
        {item.priceHalf !== null ? (
          <>
            <span>
              Half <strong>{formatMoney(item.priceHalf)}</strong>
            </span>
            <span>
              Full <strong>{formatMoney(item.priceFull)}</strong>
            </span>
          </>
        ) : (
          <strong>{formatMoney(item.priceFull)}</strong>
        )}
      </p>
    </li>
  );
}
