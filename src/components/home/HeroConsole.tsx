"use client";

import { useEffect, useRef, useState } from "react";
import { DateFields, GuestStepper, guestSummary, useStayPlanner } from "@/components/layout/StayPlanner";
import { PillButton } from "@/components/ui/Buttons";
import { AskTrigger } from "@/components/ui/AskTrigger";

/**
 * Compact booking console docked in the hero on laptops and desktops (≥1024 px; below that the
 * dock carries Book). It shares dates and guests with the rest of the site through the planner.
 */
export function HeroConsole({ variant = "hero" }: { variant?: "hero" | "invitation" }) {
  const { guests, error, book } = useStayPlanner();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [showError, setShowError] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guestsOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !popoverRef.current?.contains(event.target as Node)) setGuestsOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [guestsOpen]);

  return (
    <form
      className={`tj-console tj-console--${variant}`}
      aria-label="Check availability"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setShowError(!book({ openSheetOnError: false }));
      }}
    >
      <DateFields idPrefix={variant} />
      <div className="tj-console__guests" ref={popoverRef}>
        <button type="button" className="tj-field tj-field--button" aria-expanded={guestsOpen} aria-controls={`${variant}-guests`} onClick={() => setGuestsOpen((open) => !open)}>
          <span>Guests</span>
          <strong>{guestSummary(guests)}</strong>
        </button>
        {guestsOpen ? (
          <div id={`${variant}-guests`} className="tj-console__popover" role="group" aria-label="Guests">
            <GuestStepper label="Adults" hint="Age 13+" type="adults" />
            <GuestStepper label="Children" hint="Age 0–12" type="children" />
          </div>
        ) : null}
      </div>
      {variant === "invitation" ? (
        <AskTrigger className="tj-pill tj-pill--outline">
          <span>Ask</span>
        </AskTrigger>
      ) : null}
      <PillButton type="submit" variant="lake" dot>
        Book
      </PillButton>
      {showError && error ? (
        <p className="tj-form-error tj-console__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
