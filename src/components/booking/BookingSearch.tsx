"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GuestState = {
  adults: number;
  children: number;
};

type Props = {
  className?: string;
};

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return toDateValue(date);
}

function guestSummary({ adults, children }: GuestState) {
  const adultLabel = `${adults} ${adults === 1 ? "adult" : "adults"}`;
  if (!children) return adultLabel;
  return `${adultLabel}, ${children} ${children === 1 ? "child" : "children"}`;
}

export function BookingSearch({ className = "" }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = useMemo(() => toDateValue(new Date()), []);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestState>({ adults: 2, children: 0 });
  const [guestPanelOpen, setGuestPanelOpen] = useState(false);
  const [error, setError] = useState("");

  const minimumCheckout = checkIn ? addDays(checkIn, 1) : today;

  function updateGuest(type: keyof GuestState, delta: number) {
    setGuests((current) => {
      const next = { ...current };
      const minimum = type === "adults" ? 1 : 0;
      const maximum = type === "adults" ? 6 : 4;
      next[type] = Math.min(maximum, Math.max(minimum, current[type] + delta));
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!checkIn || !checkOut) {
      setError("Choose your check-in and check-out dates.");
      return;
    }

    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }

    setError("");
    dialogRef.current?.close();

    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults: String(guests.adults),
      children: String(guests.children),
    });

    router.push(`/book?${params.toString()}`);
  }

  const fields = (
    <>
      <label className="booking-field">
        <span className="booking-field__label">Check-in</span>
        <input
          aria-label="Check-in date"
          type="date"
          min={today}
          value={checkIn}
          onChange={(event) => {
            const next = event.target.value;
            setCheckIn(next);
            if (checkOut && checkOut <= next) setCheckOut(addDays(next, 1));
          }}
        />
      </label>

      <label className="booking-field">
        <span className="booking-field__label">Check-out</span>
        <input
          aria-label="Check-out date"
          type="date"
          min={minimumCheckout}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
        />
      </label>

      <div className="booking-guests">
        <button
          type="button"
          className="booking-field booking-field--button"
          aria-expanded={guestPanelOpen}
          onClick={() => setGuestPanelOpen((value) => !value)}
        >
          <span className="booking-field__label">Guests</span>
          <span className="booking-field__value">{guestSummary(guests)}</span>
        </button>

        {guestPanelOpen && (
          <div className="guest-popover" role="group" aria-label="Guest count">
            <GuestCounter
              label="Adults"
              hint="Age 13+"
              value={guests.adults}
              onMinus={() => updateGuest("adults", -1)}
              onPlus={() => updateGuest("adults", 1)}
              minusDisabled={guests.adults <= 1}
              plusDisabled={guests.adults >= 6}
            />
            <GuestCounter
              label="Children"
              hint="Age 0–12"
              value={guests.children}
              onMinus={() => updateGuest("children", -1)}
              onPlus={() => updateGuest("children", 1)}
              minusDisabled={guests.children <= 0}
              plusDisabled={guests.children >= 4}
            />
            <button type="button" className="guest-popover__done" onClick={() => setGuestPanelOpen(false)}>
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`booking-search ${className}`.trim()}>
      <form className="booking-dock booking-dock--desktop" onSubmit={submit} noValidate>
        {fields}
        <button className="booking-submit" type="submit">
          <span>Find a stay</span>
          <span aria-hidden="true">↗</span>
        </button>
        {error && <p className="booking-error" role="alert">{error}</p>}
      </form>

      <button className="booking-dock__mobile-trigger" type="button" onClick={() => dialogRef.current?.showModal()}>
        <span>
          <small>Plan your stay</small>
          <strong>Check dates</strong>
        </span>
        <span aria-hidden="true">↗</span>
      </button>

      <dialog ref={dialogRef} className="booking-dialog" onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}>
        <form className="booking-dialog__panel" onSubmit={submit} noValidate>
          <div className="booking-dialog__top">
            <div>
              <span className="micro">Your stay</span>
              <h2>Choose your dates.</h2>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close booking search">Close</button>
          </div>
          <div className="booking-dialog__fields">
            {fields}
          </div>
          {error && <p className="booking-dialog__error" role="alert">{error}</p>}
          <button className="booking-dialog__submit" type="submit">
            <span>Continue to rooms</span>
            <span aria-hidden="true">↗</span>
          </button>
          <p className="booking-dialog__note">Availability will be confirmed directly by Tejjora Lake View.</p>
        </form>
      </dialog>
    </div>
  );
}

type GuestCounterProps = {
  label: string;
  hint: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled: boolean;
  plusDisabled: boolean;
};

function GuestCounter({ label, hint, value, onMinus, onPlus, minusDisabled, plusDisabled }: GuestCounterProps) {
  return (
    <div className="guest-counter">
      <div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div className="guest-counter__controls">
        <button type="button" onClick={onMinus} disabled={minusDisabled} aria-label={`Remove ${label.toLowerCase()}`}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={onPlus} disabled={plusDisabled} aria-label={`Add ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}
