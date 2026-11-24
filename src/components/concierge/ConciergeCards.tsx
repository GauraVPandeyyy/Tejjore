"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/data/commerce";
import { Icon } from "@/components/ui/Icon";
import type { ConciergeCard } from "@/lib/concierge";

type Navigate = () => void;

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function External({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const web = href.startsWith("http");
  return (
    <a href={href} className={className} target={web ? "_blank" : undefined} rel={web ? "noreferrer" : undefined}>
      {children}
    </a>
  );
}

/**
 * Rich results inside a Mezbaan answer. Every number and name arrives from the server's grounded
 * builders (lib/concierge/grounded.ts); this file only lays them out.
 */
export function ConciergeCards({ cards, onNavigate }: { cards: ConciergeCard[]; onNavigate: Navigate }) {
  return (
    <div className="tj-ai-cards">
      {cards.map((card, index) => (
        <CardView key={`${card.kind}-${index}`} card={card} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function CardView({ card, onNavigate }: { card: ConciergeCard; onNavigate: Navigate }) {
  switch (card.kind) {
    case "rooms":
      return (
        <section className="tj-ai-card tj-ai-card--rooms" aria-label={card.title}>
          <ul className="tj-ai-rooms">
            {card.rooms.map((room) => (
              <li key={room.id} className="tj-ai-room">
                <Link href={room.href} className="tj-ai-room__media" onClick={onNavigate} tabIndex={-1} aria-hidden="true">
                  {room.image ? <Image src={room.image} alt="" fill sizes="220px" /> : null}
                </Link>
                <div className="tj-ai-room__body">
                  <Link href={room.href} className="tj-ai-room__name" onClick={onNavigate}>
                    {room.name}
                  </Link>
                  {room.summary ? <p className="tj-ai-room__summary">{room.summary}</p> : null}
                  {room.fromRate !== null ? (
                    <p className="tj-ai-price">
                      From <strong>{formatMoney(room.fromRate)}</strong> <span>/ night · room only</span>
                      {room.rateNote ? <small>{room.rateNote}</small> : null}
                    </p>
                  ) : (
                    <p className="tj-ai-price tj-ai-price--pending">Live rate shown for your dates</p>
                  )}
                  <div className="tj-ai-room__links">
                    <Link href={room.href} onClick={onNavigate}>View</Link>
                    <Link href={room.bookHref} onClick={onNavigate} className="tj-ai-room__book">
                      Book <span className="tj-pill__dot" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      );

    case "rates":
      return (
        <section className="tj-ai-card" aria-label={card.title}>
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">{card.title}</span>
          </header>
          <ul className="tj-ai-ledger">
            {card.rooms.map((room) => (
              <li key={room.id}>
                <Link href={room.href} onClick={onNavigate} className="tj-ai-ledger__name">
                  {room.name}
                </Link>
                <span className="tj-ai-ledger__value">
                  <small>from</small> {formatMoney(room.fromRate)}
                </span>
                {room.note ? <small className="tj-ai-ledger__note">{room.note}</small> : null}
              </li>
            ))}
          </ul>
          <p className="tj-ai-card__foot">Rates from this website’s current booking system. Your dates give the exact price.</p>
        </section>
      );

    case "availability":
      return (
        <section className="tj-ai-card" aria-label="Your dates">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">Your dates</span>
            <strong className="tj-ai-card__title">
              {formatDay(card.checkIn)} <Icon name="arrow-right" size={14} /> {formatDay(card.checkOut)}
              <span> · {card.nights} night{card.nights === 1 ? "" : "s"}</span>
            </strong>
            {card.preview ? <span className="tj-ai-badge">Preview inventory</span> : null}
          </header>
          <ul className="tj-ai-ledger">
            {card.rooms.map((room) => (
              <li key={room.id}>
                <span className="tj-ai-ledger__name">{room.name}</span>
                <span className="tj-ai-ledger__value">{formatMoney(room.stayTotal)}</span>
                <small className="tj-ai-ledger__note">
                  {card.nights > 1 ? `${formatMoney(room.averageRate)} / night on average · ` : ""}room only
                  {room.available > 0 ? " · available" : ""}
                </small>
                <Link href={room.bookHref} onClick={onNavigate} className="tj-ai-ledger__action">
                  Book
                </Link>
              </li>
            ))}
          </ul>
          <p className="tj-ai-card__foot">
            {card.preview
              ? "Prices are live; room counts are test data until the hotel switches on live inventory."
              : "Exact price for these dates, before any taxes or extras. The full total is shown before you pay."}
          </p>
        </section>
      );

    case "quote":
      return (
        <section className="tj-ai-card" aria-label="Stay cost">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">Your stay · {card.roomName}</span>
            <strong className="tj-ai-card__title">
              {formatDay(card.checkIn)} <Icon name="arrow-right" size={14} /> {formatDay(card.checkOut)}
              <span> · {card.nights} night{card.nights === 1 ? "" : "s"}</span>
            </strong>
            {card.preview ? <span className="tj-ai-badge">Availability not confirmed</span> : null}
          </header>
          <ul className="tj-ai-ledger">
            {card.nightly.length <= 7
              ? card.nightly.map((night) => (
                  <li key={night.date}>
                    <span className="tj-ai-ledger__name">{formatDay(night.date)}</span>
                    <span className="tj-ai-ledger__value">{formatMoney(night.rate)}</span>
                  </li>
                ))
              : null}
            {card.lines.map((line) => (
              <li key={line.label}>
                <span className="tj-ai-ledger__name">{line.label}</span>
                <span className="tj-ai-ledger__value">{formatMoney(line.amount)}</span>
              </li>
            ))}
            <li>
              <strong className="tj-ai-ledger__name">Total</strong>
              <strong className="tj-ai-ledger__value">{formatMoney(card.total)}</strong>
            </li>
          </ul>
          <p className="tj-ai-card__foot">{card.note}</p>
          <div className="tj-ai-card__buttons">
            <Link href={card.bookHref} onClick={onNavigate} className="tj-ai-btn tj-ai-btn--solid">
              Book this stay
            </Link>
          </div>
        </section>
      );

    case "menu":
      return (
        <section className="tj-ai-card" aria-label="The menu">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">The menu</span>
          </header>
          <ul className="tj-ai-sections">
            {card.sections.map((section) => (
              <li key={section.name}>
                <Link href={section.href} onClick={onNavigate}>
                  <strong>{section.name}</strong>
                  <small>
                    {section.count} dish{section.count === 1 ? "" : "es"}
                    {section.fromPrice !== null ? ` · from ${formatMoney(section.fromPrice)}` : ""}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
          {card.notes.length ? <p className="tj-ai-card__foot">{card.notes.join(" · ")}</p> : null}
        </section>
      );

    case "dishes":
      return (
        <section className="tj-ai-card" aria-label="From the menu">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">From the menu</span>
          </header>
          <ul className="tj-ai-ledger">
            {card.dishes.map((dish) => (
              <li key={`${dish.section}-${dish.name}`} data-unavailable={dish.available ? undefined : "true"}>
                <Link href={dish.href} onClick={onNavigate} className="tj-ai-ledger__name">
                  {dish.name}
                  {dish.containsEgg ? <span className="tj-ai-egg" title="Contains egg" aria-label="contains egg" /> : null}
                </Link>
                <span className="tj-ai-ledger__value">{formatMoney(dish.price)}</span>
                <small className="tj-ai-ledger__note">
                  {dish.section}
                  {dish.halfPrice !== null ? ` · half ${formatMoney(dish.halfPrice)}` : ""}
                  {dish.available ? "" : " · not available today"}
                </small>
              </li>
            ))}
          </ul>
        </section>
      );

    case "places":
      return (
        <section className="tj-ai-card" aria-label="Places and routes">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">Routes from the hotel</span>
          </header>
          <ul className="tj-ai-ledger">
            {card.places.map((place) => (
              <li key={place.name}>
                <span className="tj-ai-ledger__name">{place.name}</span>
                <External href={place.href} className="tj-ai-ledger__action">
                  Route <Icon name="arrow-up-right" size={14} />
                </External>
                <small className="tj-ai-ledger__note">{place.category} · live travel time in Maps</small>
              </li>
            ))}
          </ul>
        </section>
      );

    case "offers":
      return (
        <section className="tj-ai-card" aria-label="Offers">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">Published offers</span>
          </header>
          <ul className="tj-ai-ledger">
            {card.offers.map((offer) => (
              <li key={offer.title}>
                <Link href={offer.href} onClick={onNavigate} className="tj-ai-ledger__name">
                  {offer.title}
                </Link>
                <small className="tj-ai-ledger__note">
                  {offer.summary ?? ""}
                  {offer.validTo ? ` · until ${formatDay(offer.validTo)}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>
      );

    case "contact":
      return (
        <section className="tj-ai-card" aria-label="Contact the hotel">
          <header className="tj-ai-card__head">
            <span className="tj-ai-card__eyebrow">Tejjora Lake View</span>
          </header>
          <p className="tj-ai-card__address">
            <Icon name="pin" size={16} /> {card.address}
          </p>
          <div className="tj-ai-card__buttons">
            <External href={card.phoneHref} className="tj-ai-btn">
              <Icon name="phone" size={16} /> {card.phoneDisplay}
            </External>
            <External href={card.whatsappHref} className="tj-ai-btn">
              <Icon name="whatsapp" size={16} /> WhatsApp
            </External>
            <External href={card.mapsHref} className="tj-ai-btn">
              <Icon name="compass" size={16} /> Directions
            </External>
          </div>
        </section>
      );

    case "feature":
      return (
        <Link href={card.href} onClick={onNavigate} className="tj-ai-feature">
          <span className="tj-ai-feature__media">
            <Image src={card.image} alt="" fill sizes="320px" />
          </span>
          <span className="tj-ai-feature__body">
            <span className="tj-ai-card__eyebrow">{card.eyebrow}</span>
            <strong>{card.title}</strong>
            <small>{card.body}</small>
            <span className="tj-ai-feature__cta">
              {card.cta} <Icon name="arrow-right" size={14} />
            </span>
          </span>
        </Link>
      );
  }
}
