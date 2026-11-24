"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { assets } from "@/data/assets";
import { rooms } from "@/data/rooms";
import { arrivalOptions, preferenceOptions, tripPurposeOptions } from "@/data/planner";
import { todayInIndia } from "@/lib/booking/validation";
import { addDays, formatDate, nightsBetween, stayPresets } from "@/lib/planner/dates";
import { createStayPlan } from "@/lib/planner/rules";
import type { ArrivalSource, PlanMyStayInput, PlanMyStayResult, StayPreferences, TripPurpose } from "@/types/planner";
import { CircleButton, PillButton } from "@/components/ui/Buttons";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Ornament } from "@/components/ui/Waterline";
import { PlanResult } from "./PlanResult";

/** Real hotel photography behind each kind of trip (decorative; the room choice comes from the rules). */
const PURPOSE_ART: Record<TripPurpose, string> = {
  couple: assets.rooms.premium[1],
  family: assets.rooms.superDeluxe[2],
  business: assets.rooms.deluxe[3],
  weekend: assets.restaurant[5],
  celebration: assets.restaurant[3],
  solo: assets.rooms.deluxe[1],
};
const ARRIVAL_ICON: Record<ArrivalSource, IconName> = { airport: "compass", railway: "compass", driving: "parking", local: "pin" };
const PREFERENCE_ICON: Record<keyof StayPreferences, IconName> = { breakfast: "sun", airportPickup: "compass", earlyCheckIn: "clock", lateCheckout: "moon" };

const STEPS = ["The trip", "Arrival", "Dates & guests", "Extras"] as const;
const EMPTY_PREFERENCES: StayPreferences = { breakfast: false, airportPickup: false, earlyCheckIn: false, lateCheckout: false };

/**
 * Plan your stay — a four-step journey (trip → arrival → dates & guests → extras) that ends in a
 * personalised plan (PlanResult): rooms with live rates, a day-by-day suggested rhythm, places, and a
 * hand-off into /book. The recommendation rules are unchanged (`createStayPlan`). Every step is
 * optional beyond the defaults, and "today" is the India date so server and browser agree. Steps
 * slide in the direction of travel (not under reduced motion); a live "pass" beside the form shows the
 * trip as it is being built.
 */
export function PlanMyStay() {
  const today = useMemo(() => todayInIndia(), []);
  const presets = useMemo(() => stayPresets(today), [today]);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [visited, setVisited] = useState(0);
  const [purpose, setPurpose] = useState<TripPurpose>("weekend");
  const [arrival, setArrival] = useState<ArrivalSource>("local");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [destination, setDestination] = useState("");
  const [preferences, setPreferences] = useState<StayPreferences>(EMPTY_PREFERENCES);
  const [result, setResult] = useState<PlanMyStayResult | null>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    // Move focus to the new step's heading after a step change (not on first render).
    if (!moved.current) return;
    stepHeading.current?.focus({ preventScroll: true });
    document.getElementById("plan-my-stay")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, result]);

  function goTo(next: number) {
    moved.current = true;
    setDirection(next >= step ? 1 : -1);
    setStep(next);
    setVisited((current) => Math.max(current, next));
  }

  function buildPlan() {
    const input: PlanMyStayInput = { purpose, arrival, checkIn, checkOut, adults, children, destination, preferences };
    moved.current = true;
    setResult(createStayPlan(input));
  }

  const trip: PlanMyStayInput = { purpose, arrival, checkIn, checkOut, adults, children, destination, preferences };

  if (result) {
    return (
      <section id="plan-my-stay" className="pl-page" aria-labelledby="plan-result-title">
        <PlanResult
          result={result}
          trip={trip}
          headingRef={stepHeading}
          onEdit={(target) => {
            setResult(null);
            goTo(target);
          }}
        />
      </section>
    );
  }

  const purposeOption = tripPurposeOptions.find((item) => item.id === purpose)!;
  const arrivalOption = arrivalOptions.find((item) => item.id === arrival)!;
  const nights = nightsBetween(checkIn, checkOut);
  const extras = preferenceOptions.filter((item) => preferences[item.id as keyof StayPreferences]).map((item) => item.label);
  const preview = createStayPlan(trip);

  function applyPreset(next: { checkIn: string; checkOut: string }) {
    setCheckIn(next.checkIn);
    setCheckOut(next.checkOut);
  }

  return (
    <section id="plan-my-stay" className="pl-page" aria-labelledby="plan-title">
      <div className="pl-shell">
        <aside className="pl-pass" aria-label="Your trip so far">
          {tripPurposeOptions.map((item) => (
            <Image key={item.id} src={PURPOSE_ART[item.id]} alt="" fill sizes="(min-width: 1024px) 42vw, 100vw" className="pl-pass__art" priority={item.id === "weekend"} data-active={item.id === purpose ? "true" : "false"} aria-hidden="true" />
          ))}
          <span className="pl-pass__shade" aria-hidden="true" />
          <div className="pl-pass__body">
            <p className="tj-eyebrow">Your trip so far</p>
            <p className="pl-pass__title" key={purpose}>
              {purposeOption.label}
            </p>
            <dl className="pl-pass__list">
              <div>
                <dt>Arriving</dt>
                <dd key={arrival}>{arrivalOption.label}</dd>
              </div>
              <div>
                <dt>Dates</dt>
                <dd key={`${checkIn}${checkOut}`}>{checkIn && checkOut ? `${formatDate(checkIn)} → ${formatDate(checkOut)} · ${nights} night${nights === 1 ? "" : "s"}` : "Open"}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd key={`${adults}-${children}`}>
                  {adults} adult{adults === 1 ? "" : "s"}
                  {children ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""}
                </dd>
              </div>
              <div>
                <dt>Extras</dt>
                <dd key={extras.join()}>{extras.length ? extras.join(", ") : "None yet"}</dd>
              </div>
            </dl>
            <p className="pl-pass__start">
              <span>Where we&rsquo;d start</span>
              <strong key={preview.recommendedRoomId}>{rooms.find((room) => room.id === preview.recommendedRoomId)?.name}</strong>
            </p>
          </div>
        </aside>

        <div className="pl-main">
          <header className="pl-head">
            <Ornament />
            <h1 id="plan-title" className="tj-heading">
              Plan your stay
            </h1>
            <p>Four short steps, every one optional. We&rsquo;ll shape a stay around them, show live rates, and hand it to booking when you&rsquo;re ready.</p>
          </header>

          <ol className="pl-steps" aria-label="Planning steps">
            {STEPS.map((label, index) => (
              <li key={label} data-state={index === step ? "current" : index <= visited ? "done" : "todo"}>
                <button type="button" onClick={() => goTo(index)} disabled={index > visited} aria-current={index === step ? "step" : undefined}>
                  <span className="pl-steps__no">{index + 1}</span>
                  <span className="pl-steps__label">{label}</span>
                </button>
              </li>
            ))}
          </ol>

          <form
            className="pl-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (step < STEPS.length - 1) goTo(step + 1);
              else buildPlan();
            }}
          >
            <div key={step} className="pl-step" data-dir={direction}>
              {step === 0 ? (
                <fieldset className="pl-fieldset">
                  <legend>
                    <h2 ref={stepHeading} tabIndex={-1} className="pl-question">
                      What is the trip for?
                    </h2>
                  </legend>
                  <div className="pl-tiles">
                    {tripPurposeOptions.map((item) => (
                      <button key={item.id} type="button" className="pl-tile" aria-pressed={purpose === item.id} onClick={() => setPurpose(item.id)}>
                        <Image src={PURPOSE_ART[item.id]} alt="" fill sizes="(min-width: 1024px) 16vw, 46vw" />
                        <span className="pl-tile__shade" aria-hidden="true" />
                        <span className="pl-tile__no" aria-hidden="true">
                          {item.index}
                        </span>
                        <span className="pl-tile__copy">
                          <strong>{item.label}</strong>
                          <small>{item.copy}</small>
                        </span>
                        <span className="pl-tile__check" aria-hidden="true">
                          <Icon name="plus" size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {step === 1 ? (
                <fieldset className="pl-fieldset">
                  <legend>
                    <h2 ref={stepHeading} tabIndex={-1} className="pl-question">
                      How are you arriving?
                    </h2>
                  </legend>
                  <div className="pl-cards">
                    {arrivalOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="pl-card"
                        aria-pressed={arrival === item.id}
                        onClick={() => {
                          setArrival(item.id);
                          if (item.id !== "airport") setPreferences((current) => ({ ...current, airportPickup: false }));
                        }}
                      >
                        <span className="pl-card__icon" aria-hidden="true">
                          <Icon name={ARRIVAL_ICON[item.id]} size={22} />
                        </span>
                        <strong>{item.label}</strong>
                        <small>{item.copy}</small>
                      </button>
                    ))}
                  </div>
                  <p className="pl-route" key={arrival} aria-live="polite">
                    <span className="tj-eyebrow">Your route</span>
                    {preview.arrivalGuidance}
                  </p>
                </fieldset>
              ) : null}

              {step === 2 ? (
                <fieldset className="pl-fieldset">
                  <legend>
                    <h2 ref={stepHeading} tabIndex={-1} className="pl-question">
                      When, and who is coming?
                    </h2>
                  </legend>
                  <div className="pl-presets" role="group" aria-label="Quick dates">
                    {presets.map((preset) => (
                      <button key={preset.id} type="button" className="tj-chip" aria-pressed={checkIn === preset.checkIn && checkOut === preset.checkOut} onClick={() => applyPreset(preset)}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="pl-dates">
                    <label className="tj-field">
                      <span>Check-in · optional</span>
                      <input
                        type="date"
                        min={today}
                        value={checkIn}
                        onChange={(event) => {
                          setCheckIn(event.target.value);
                          if (checkOut && event.target.value >= checkOut) setCheckOut(addDays(event.target.value, 1));
                        }}
                      />
                    </label>
                    <label className="tj-field">
                      <span>Check-out · optional</span>
                      <input type="date" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
                    </label>
                  </div>
                  {checkIn && checkOut && nights > 0 ? (
                    <p className="pl-nights" aria-live="polite">
                      <span className="pl-nights__dots" aria-hidden="true">
                        {Array.from({ length: Math.min(nights, 14) }, (_, index) => (
                          <i key={index} style={{ animationDelay: `${index * 40}ms` }} />
                        ))}
                      </span>
                      <strong>
                        {nights} night{nights === 1 ? "" : "s"}
                      </strong>
                      {formatDate(checkIn)} to {formatDate(checkOut)}
                    </p>
                  ) : (
                    <p className="pl-nights pl-nights--idle">Pick dates to see live rates in your plan, or skip and add them later.</p>
                  )}
                  <div className="pl-guests">
                    <PlanStepper label="Adults" value={adults} min={1} max={12} onChange={setAdults} />
                    <PlanStepper label="Children" value={children} min={0} max={8} onChange={setChildren} />
                  </div>
                  {adults + children >= 4 ? <p className="pl-hint">For a group this size you may need more than one room. Room occupancy is confirmed when you book.</p> : null}
                  <label className="tj-field pl-destination">
                    <span>Main place or meeting in Lucknow · optional</span>
                    <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="e.g. IGP, Hazratganj" maxLength={80} />
                  </label>
                </fieldset>
              ) : null}

              {step === 3 ? (
                <fieldset className="pl-fieldset">
                  <legend>
                    <h2 ref={stepHeading} tabIndex={-1} className="pl-question">
                      Anything we should arrange?
                    </h2>
                  </legend>
                  <div className="pl-cards">
                    {preferenceOptions.map((item) => {
                      const key = item.id as keyof StayPreferences;
                      const disabled = key === "airportPickup" && arrival !== "airport";
                      return (
                        <button key={item.id} type="button" className="pl-card" disabled={disabled} aria-pressed={preferences[key]} onClick={() => setPreferences((current) => ({ ...current, [key]: !current[key] }))}>
                          <span className="pl-card__icon" aria-hidden="true">
                            <Icon name={PREFERENCE_ICON[key]} size={22} />
                          </span>
                          <strong>{item.label}</strong>
                          <small>{disabled ? "Available when arriving by air." : item.copy}</small>
                        </button>
                      );
                    })}
                  </div>
                  <p className="pl-hint">Requests travel with your booking; the hotel confirms what it can arrange.</p>
                </fieldset>
              ) : null}
            </div>

            <div className="pl-nav">
              {step > 0 ? (
                <PillButton onClick={() => goTo(step - 1)}>
                  <Icon name="arrow-left" size={16} /> Back
                </PillButton>
              ) : (
                <span />
              )}
              <PillButton type="submit" variant="lake" arrow={step < STEPS.length - 1} dot={step === STEPS.length - 1}>
                {step < STEPS.length - 1 ? `Next: ${STEPS[step + 1]}` : "Build my stay plan"}
              </PillButton>
            </div>
            {step < STEPS.length - 1 ? (
              <p className="pl-skip">
                <button type="button" className="tj-text-link" onClick={buildPlan}>
                  Skip ahead and see my plan
                </button>
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

function PlanStepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="tj-stepper">
      <strong>{label}</strong>
      <div className="tj-stepper__controls">
        <CircleButton icon="minus" label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} />
        <output aria-live="polite" aria-label={label}>
          {value}
        </output>
        <CircleButton icon="plus" label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} />
      </div>
    </div>
  );
}
