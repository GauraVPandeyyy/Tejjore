"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { formatMoney } from "@/data/commerce";
import { hotel } from "@/data/hotel";
import { arrivalOptions, preferenceOptions, tripPurposeOptions } from "@/data/planner";
import { nearbyPlaces } from "@/data/nearby";
import { rooms } from "@/data/rooms";
import { websiteInventoryProvider } from "@/lib/booking/providers";
import { averageNightlyRate, stayRoomSubtotal } from "@/lib/booking/rateCard";
import { occupancyError, todayInIndia } from "@/lib/booking/validation";
import { addDays, formatDate, formatDay, formatWeekdayMonth, nightsBetween } from "@/lib/planner/dates";
import { buildItinerary, type ItineraryBlock } from "@/lib/planner/itinerary";
import type { PublicAvailabilityRoom } from "@/types/booking";
import type { RoomId } from "@/types/hotel";
import type { PlanMyStayInput, PlanMyStayResult, StayPreferences } from "@/types/planner";
import { PillAnchor, PillButton, PillLink } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Motion";
import { Ornament } from "@/components/ui/Waterline";

type Rates = { status: "idle" | "loading" | "ready" | "error"; rooms: PublicAvailabilityRoom[]; message: string };
/** The outcome of one availability request, tagged with the request it answers. */
type Fetched = { key: string; rooms: PublicAvailabilityRoom[]; message: string | null };

const mapsSearchUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The personalised stay plan: a room starting point with live rates for the dates (from the same
 * availability service and admin rate configuration the booking uses, so the numbers cannot differ),
 * a day-by-day suggested rhythm, places for the trip, and a hand-off into /book carrying the chosen
 * room, dates, guests, breakfast and requests. Without dates it says so and offers to add them here.
 */
export function PlanResult({ result, trip, onEdit, headingRef }: { result: PlanMyStayResult; trip: PlanMyStayInput; onEdit: (step: number) => void; headingRef: RefObject<HTMLHeadingElement | null> }) {
  const today = useMemo(() => todayInIndia(), []);
  const [roomId, setRoomId] = useState<RoomId>(result.recommendedRoomId);
  const [dates, setDates] = useState({ checkIn: trip.checkIn, checkOut: trip.checkOut });
  const [draftDates, setDraftDates] = useState({ checkIn: "", checkOut: "" });
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);

  const datesValid = Boolean(dates.checkIn && dates.checkOut && dates.checkOut > dates.checkIn && dates.checkIn >= today);
  const nights = nightsBetween(dates.checkIn, dates.checkOut);
  const purpose = tripPurposeOptions.find((item) => item.id === trip.purpose)!;
  const arrivalLabel = arrivalOptions.find((item) => item.id === trip.arrival)?.label ?? "";
  const extras = preferenceOptions.filter((item) => trip.preferences[item.id as keyof StayPreferences]).map((item) => item.label);
  const recommended = rooms.find((item) => item.id === result.recommendedRoomId) ?? rooms[0];
  const chosen = rooms.find((item) => item.id === roomId) ?? recommended;
  const ordered = [recommended, ...rooms.filter((item) => item.id !== recommended.id)];
  const itinerary = useMemo(() => buildItinerary({ ...trip, ...dates }, result), [trip, dates, result]);
  const nearby = nearbyPlaces.filter((place) => result.nearbyPlaceIds.includes(place.id));

  // Live rates for the dates, from the booking's own availability service. The status is derived: an
  // answer counts only while it belongs to the dates (and retry) currently shown, otherwise it is loading.
  const requestKey = `${dates.checkIn}|${dates.checkOut}|${attempt}`;
  useEffect(() => {
    if (!datesValid) return;
    let cancelled = false;
    websiteInventoryProvider
      .search(dates.checkIn, dates.checkOut)
      .then((data) => {
        if (!cancelled) setFetched({ key: requestKey, rooms: data.rooms, message: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setFetched({ key: requestKey, rooms: [], message: error instanceof Error ? error.message : "Live rates could not be checked." });
      });
    return () => {
      cancelled = true;
    };
  }, [datesValid, dates.checkIn, dates.checkOut, requestKey]);
  const answered = datesValid && fetched?.key === requestKey ? fetched : null;
  const rates: Rates = !datesValid ? { status: "idle", rooms: [], message: "" } : !answered ? { status: "loading", rooms: [], message: "" } : answered.message !== null ? { status: "error", rooms: [], message: answered.message } : { status: "ready", rooms: answered.rooms, message: "" };

  const bookingHref = useMemo(() => {
    const params = new URLSearchParams({ adults: String(trip.adults), children: String(trip.children), room: roomId });
    if (datesValid) {
      params.set("checkIn", dates.checkIn);
      params.set("checkOut", dates.checkOut);
    }
    if (result.ratePlanId) params.set("rate", result.ratePlanId);
    if (result.addonIds.length) params.set("addons", result.addonIds.join(","));
    return `/book?${params.toString()}`;
  }, [trip.adults, trip.children, roomId, datesValid, dates, result.ratePlanId, result.addonIds]);

  const summary = [
    `Stay plan — ${purpose.label}`,
    `Room: ${chosen.name}`,
    datesValid ? `Dates: ${formatDate(dates.checkIn)} to ${formatDate(dates.checkOut)} (${plural(nights, "night")})` : "Dates: to be decided",
    `Guests: ${plural(trip.adults, "adult")}${trip.children ? `, ${plural(trip.children, "child").replace("childs", "children")}` : ""}`,
    `Arriving: ${arrivalLabel}`,
    extras.length ? `Requests: ${extras.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsappHref = `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(`Hello Tejjora Lake View, I am planning a stay.\n${summary}`)}`;

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(`${summary}\n\nBook: ${window.location.origin}${bookingHref}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked: the WhatsApp and booking buttons still carry the plan */
    }
  }

  return (
    <div className="pl-result">
      <div className="pl-hero">
        {ordered.map((room) => (
          <Image key={room.id} src={room.imageSet[0]} alt={room.id === chosen.id ? `${room.name} at Tejjora Lake View` : ""} fill priority={room.id === recommended.id} sizes="100vw" className="pl-hero__image" data-active={room.id === chosen.id ? "true" : "false"} />
        ))}
        <span className="pl-hero__shade" aria-hidden="true" />
        <div className="tj-container pl-hero__copy">
          <p className="tj-eyebrow">Your stay plan · {purpose.label}</p>
          <h1 id="plan-result-title" ref={headingRef} tabIndex={-1} className="pl-hero__title">
            Start with the {recommended.name}
          </h1>
          <p className="pl-hero__reason">{result.roomReason}</p>
          <div className="tj-actions-row tj-actions-row--start">
            <PillLink href={bookingHref} variant="cream" dot>
              Check this stay
            </PillLink>
            <PillAnchor href="#plan-rooms" variant="outline-light">
              Compare rooms
            </PillAnchor>
          </div>
        </div>
      </div>

      <div className="tj-container">
        <dl className="pl-ticket">
          {[
            { label: "Trip", value: purpose.label, step: 0 },
            { label: "Arriving", value: arrivalLabel, step: 1 },
            { label: "Dates", value: datesValid ? `${formatDate(dates.checkIn)} → ${formatDate(dates.checkOut)} · ${plural(nights, "night")}` : "Open", step: 2 },
            { label: "Guests", value: `${plural(trip.adults, "adult")}${trip.children ? ` · ${trip.children} ${trip.children === 1 ? "child" : "children"}` : ""}`, step: 2 },
            { label: "Extras", value: extras.length ? extras.join(", ") : "None", step: 3 },
          ].map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
              <button type="button" className="tj-text-link" onClick={() => onEdit(item.step)} aria-label={`Change ${item.label.toLowerCase()}`}>
                Change
              </button>
            </div>
          ))}
        </dl>
        <p className="pl-note">{result.fitNote}</p>

        <section id="plan-rooms" className="pl-rooms" aria-labelledby="plan-rooms-title">
          <header className="pl-section-head">
            <p className="tj-eyebrow">The rooms</p>
            <h2 id="plan-rooms-title" className="pl-section-title">
              {datesValid ? "Live rates for your dates" : "Pick a room, then add dates"}
            </h2>
            {datesValid ? <p>Room only, per room. Taxes and any extras are added in the final quote when you book.</p> : null}
          </header>

          {!datesValid ? (
            <form
              className="pl-adddates"
              onSubmit={(event) => {
                event.preventDefault();
                if (draftDates.checkIn && draftDates.checkOut > draftDates.checkIn) setDates(draftDates);
              }}
            >
              <p>Add dates to see what is available and what each room costs.</p>
              <label className="tj-field">
                <span>Check-in</span>
                <input type="date" min={today} value={draftDates.checkIn} onChange={(event) => setDraftDates({ checkIn: event.target.value, checkOut: draftDates.checkOut && draftDates.checkOut > event.target.value ? draftDates.checkOut : addDays(event.target.value, 1) })} />
              </label>
              <label className="tj-field">
                <span>Check-out</span>
                <input type="date" min={draftDates.checkIn ? addDays(draftDates.checkIn, 1) : today} value={draftDates.checkOut} onChange={(event) => setDraftDates({ ...draftDates, checkOut: event.target.value })} />
              </label>
              <PillButton type="submit" variant="lake" disabled={!draftDates.checkIn || draftDates.checkOut <= draftDates.checkIn}>
                Show live rates
              </PillButton>
            </form>
          ) : null}

          {rates.status === "error" ? (
            <div className="pl-ratesfail" role="alert">
              <p>
                <strong>Live rates are not available right now.</strong> {rates.message}
              </p>
              <div className="tj-actions-row tj-actions-row--start">
                <PillButton onClick={() => setAttempt((value) => value + 1)}>Try again</PillButton>
                <PillAnchor href={whatsappHref} target="_blank" rel="noreferrer" variant="outline">
                  Ask the hotel on WhatsApp
                </PillAnchor>
              </div>
            </div>
          ) : null}

          <ul className="pl-roomlist">
            {ordered.map((room, index) => {
              const inventory = rates.rooms.find((item) => item.roomId === room.id);
              const soldOut = Boolean(inventory && inventory.available < 1);
              const limited = Boolean(inventory && inventory.available >= 1 && inventory.available <= 2);
              const occupancy = inventory ? occupancyError({ maxAdults: inventory.maxAdults ?? null, maxChildren: inventory.maxChildren ?? null }, trip.adults, trip.children, 1) : null;
              const total = inventory?.nightlyRates?.length ? stayRoomSubtotal(inventory.nightlyRates) : null;
              const selected = roomId === room.id;
              return (
                <Reveal as="li" key={room.id} className="pl-room" delay={index * 0.07}>
                  <button type="button" className="pl-room__button" aria-pressed={selected} disabled={soldOut} onClick={() => setRoomId(room.id)}>
                    <span className="pl-room__photo">
                      <Image src={room.imageSet[0]} alt="" fill sizes="(min-width: 1024px) 30vw, 92vw" />
                      {index === 0 ? <span className="pl-room__badge">Recommended for your trip</span> : null}
                    </span>
                    <span className="pl-room__body">
                      <span className="pl-room__name">{room.name}</span>
                      <span className="pl-room__blurb">{index === 0 ? result.roomReason : room.shortDescription}</span>
                      <span className="pl-room__price" data-state={rates.status}>
                        {rates.status === "loading" ? (
                          <span className="pl-skeleton" aria-label="Checking the rate" role="status" />
                        ) : soldOut ? (
                          <strong>Not available for these dates</strong>
                        ) : total !== null && inventory?.nightlyRates ? (
                          <>
                            <strong>{formatMoney(total)}</strong>
                            <small>
                              for {plural(inventory.nightlyRates.length, "night")}
                              {inventory.nightlyRates.length > 1 ? ` · ${formatMoney(averageNightlyRate(inventory.nightlyRates))} / night on average` : ""} · room only
                            </small>
                          </>
                        ) : (
                          <small>{datesValid ? "Rate shown at booking" : "Add dates for the live rate"}</small>
                        )}
                      </span>
                      {limited && !soldOut ? <span className="pl-room__flag">Only {inventory!.available} left for these dates</span> : null}
                      {occupancy && !soldOut ? <span className="pl-room__flag pl-room__flag--warn">{occupancy}</span> : null}
                      <span className="pl-room__select">{selected ? <><span className="tj-pill__dot" aria-hidden="true" /> Chosen for your plan</> : soldOut ? "Unavailable" : "Plan with this room"}</span>
                    </span>
                  </button>
                  <Link className="tj-text-link pl-room__more" href={`/rooms/${room.id}`}>
                    About the {room.name} <Icon name="arrow-right" size={16} />
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        </section>

        <section className="pl-days" aria-labelledby="plan-days-title">
          <header className="pl-section-head">
            <p className="tj-eyebrow">{datesValid ? "Your days" : "A sample rhythm"}</p>
            <h2 id="plan-days-title" className="pl-section-title">
              Your stay, day by day
            </h2>
            <p>{datesValid ? "A suggested rhythm for the dates you chose — a prompt for the trip, not a schedule." : "Add dates and these become your own days. It is a suggested rhythm, not a schedule."}</p>
          </header>
          <ol className="pl-daylist">
            {itinerary.map((day) => (
              <Reveal as="li" key={`${day.kind}-${day.number}`} className="pl-day" delay={0.04}>
                <div className="pl-day__rail" aria-hidden="true">
                  <span className="pl-day__no">{day.date ? formatDay(day.date) : `0${day.number}`}</span>
                  <span className="pl-day__month">{day.date ? formatWeekdayMonth(day.date) : `Day ${day.number}`}</span>
                </div>
                <div className="pl-day__card">
                  <p className="tj-eyebrow">
                    {day.kind === "arrival" ? "Arrival" : day.kind === "departure" ? "Departure" : `Day ${day.number}`}
                    {day.date ? ` · ${formatDate(day.date)}` : ""}
                  </p>
                  <h3>{day.heading}</h3>
                  <ul>
                    {day.blocks.map((block) => (
                      <DayBlock key={`${block.part}-${block.title}`} block={block} />
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {nearby.length ? (
          <section className="pl-places" aria-labelledby="plan-places-title">
            <h2 id="plan-places-title" className="pl-section-title">
              Places for this trip
            </h2>
            <ul>
              {nearby.map((place) => (
                <li key={place.id}>
                  <a href={mapsSearchUrl(place.mapsQuery)} target="_blank" rel="noreferrer" aria-label={`${place.name} in Google Maps`}>
                    <span className="tj-eyebrow">{place.category}</span>
                    <strong>{place.name}</strong>
                    <span className="pl-places__go">
                      Maps <Icon name="arrow-up-right" size={16} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="pl-handoff" aria-labelledby="plan-handoff-title">
          <Ornament />
          <h2 id="plan-handoff-title" className="tj-heading">
            Ready when you are
          </h2>
          <p>
            Booking opens with the {chosen.name}, your guests{datesValid ? ", your dates" : ""}
            {result.ratePlanId ? ", breakfast" : ""}
            {result.addonIds.length ? " and your requests" : ""} already in place.
          </p>
          <div className="tj-actions-row">
            <PillLink href={bookingHref} variant="cream" dot>
              Check this stay
            </PillLink>
            <PillAnchor href={whatsappHref} target="_blank" rel="noreferrer" variant="outline-light" arrow={false}>
              <Icon name="whatsapp" size={16} /> Send this plan to the hotel
            </PillAnchor>
            <PillButton variant="outline-light" onClick={copyPlan}>
              {copied ? "Plan copied" : "Copy plan"}
            </PillButton>
            <PillButton variant="outline-light" onClick={() => onEdit(0)}>
              Start over
            </PillButton>
          </div>
          <span className="sr-only" aria-live="polite">
            {copied ? "Plan copied to the clipboard" : ""}
          </span>
        </section>
      </div>
    </div>
  );
}

function DayBlock({ block }: { block: ItineraryBlock }) {
  return (
    <li className="pl-block">
      <span className="pl-block__part">{block.part}</span>
      <span className="pl-block__text">
        <strong>{block.title}</strong>
        <span>{block.copy}</span>
        {block.link ? (
          block.link.external ? (
            <a className="tj-text-link" href={block.link.href} target="_blank" rel="noreferrer">
              {block.link.label} <Icon name="arrow-up-right" size={14} />
            </a>
          ) : (
            <Link className="tj-text-link" href={block.link.href}>
              {block.link.label} <Icon name="arrow-right" size={14} />
            </Link>
          )
        ) : null}
      </span>
    </li>
  );
}
