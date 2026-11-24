"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { hotel } from "@/data/hotel";
import { todayInIndia } from "@/lib/booking/validation";
import { ASK_EVENT } from "@/components/ui/AskTrigger";
import { CircleButton, PillButton } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { CONCIERGE_NAME, CONCIERGE_ROLE, ConciergeMark } from "@/components/concierge/ConciergeMark";
import { EASE } from "@/components/ui/Motion";

/**
 * Stay planner shared by the dock, the hero console, room pages and the closing invitation: one
 * set of dates and guests. Book keeps the established behaviour — it validates the dates, opens
 * the planner sheet when they are missing, and otherwise goes to /book with the stay.
 */
type Guests = { adults: number; children: number };
const ROOM_PATH = /^\/rooms\/(deluxe|super-deluxe|premium)\/?$/;

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function formatStayDate(value: string) {
  if (!value) return "Add date";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function guestSummary({ adults, children }: Guests) {
  const a = `${adults} adult${adults === 1 ? "" : "s"}`;
  return children ? `${a}, ${children} child${children === 1 ? "" : "ren"}` : a;
}

type PlannerValue = {
  today: string;
  checkIn: string;
  checkOut: string;
  guests: Guests;
  error: string;
  setCheckIn: (value: string) => void;
  setCheckOut: (value: string) => void;
  changeGuests: (type: keyof Guests, delta: number) => void;
  /** Validates and navigates to /book; returns false (with an error) when dates are missing or invalid. */
  book: (options?: { roomId?: string; openSheetOnError?: boolean }) => boolean;
  openPlanner: () => void;
  askTopic: string | null;
  openAskSheet: (topic?: string) => void;
  whatsappHref: (topic?: string | null) => string;
};

const PlannerContext = createContext<PlannerValue | null>(null);

export function useStayPlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("useStayPlanner must be used inside StayPlannerProvider");
  return value;
}

export function StayPlannerProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const today = useMemo(() => todayInIndia(), []);
  const [checkIn, setCheckInState] = useState("");
  const [checkOut, setCheckOutState] = useState("");
  const [guests, setGuests] = useState<Guests>({ adults: 2, children: 0 });
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<"planner" | "ask" | null>(null);
  const [askTopic, setAskTopic] = useState<string | null>(null);

  const setCheckIn = useCallback((value: string) => {
    setError("");
    setCheckInState(value);
    if (value) setCheckOutState((current) => (!current || current <= value ? addDays(value, 1) : current));
  }, []);
  const setCheckOut = useCallback((value: string) => {
    setError("");
    setCheckOutState(value);
  }, []);
  const changeGuests = useCallback((type: keyof Guests, delta: number) => {
    setGuests((current) => {
      const limits = type === "adults" ? [1, 6] : [0, 4];
      return { ...current, [type]: Math.min(limits[1], Math.max(limits[0], current[type] + delta)) };
    });
  }, []);

  const book = useCallback<PlannerValue["book"]>(
    ({ roomId, openSheetOnError = true } = {}) => {
      let problem = "";
      if (!checkIn || !checkOut) problem = "Choose your check-in and check-out dates.";
      else if (checkIn < today) problem = "Check-in cannot be in the past.";
      else if (checkOut <= checkIn) problem = "Check-out must be after check-in.";
      if (problem) {
        setError(problem);
        if (openSheetOnError) setSheet("planner");
        return false;
      }
      const room = roomId ?? pathname.match(ROOM_PATH)?.[1];
      const params = new URLSearchParams({ checkIn, checkOut, adults: String(guests.adults), children: String(guests.children) });
      if (room) params.set("room", room);
      setSheet(null);
      router.push(`/book?${params}`);
      return true;
    },
    [checkIn, checkOut, guests, pathname, router, today],
  );

  const whatsappHref = useCallback(
    (topic?: string | null) => {
      const dates = checkIn && checkOut ? `${formatStayDate(checkIn)} to ${formatStayDate(checkOut)}` : "dates not chosen yet";
      const about = topic ? ` about the ${topic}` : "";
      const text = `Hello Tejjora Lake View, I have a question${about}. Dates: ${dates}. Guests: ${guestSummary(guests)}.`;
      return `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent(text)}`;
    },
    [checkIn, checkOut, guests],
  );

  const openAskSheet = useCallback((topic?: string) => {
    setAskTopic(topic ?? null);
    setSheet("ask");
  }, []);
  const openPlanner = useCallback(() => setSheet("planner"), []);

  useEffect(() => {
    const onAsk = (event: Event) => openAskSheet((event as CustomEvent<{ topic?: string }>).detail?.topic);
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, [openAskSheet]);

  // A route change closes any open sheet.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setSheet(null);
  }

  const value = useMemo<PlannerValue>(
    () => ({ today, checkIn, checkOut, guests, error, setCheckIn, setCheckOut, changeGuests, book, openPlanner, askTopic, openAskSheet, whatsappHref }),
    [today, checkIn, checkOut, guests, error, setCheckIn, setCheckOut, changeGuests, book, openPlanner, askTopic, openAskSheet, whatsappHref],
  );

  return (
    <PlannerContext.Provider value={value}>
      {children}
      <Sheet open={sheet === "planner"} onClose={() => setSheet(null)} title="Your stay" eyebrow="Dates & guests">
        <PlannerForm onDone={() => book()} />
      </Sheet>
      <Sheet open={sheet === "ask"} onClose={() => setSheet(null)} title={askTopic ? `Ask about the ${askTopic}` : "Ask Tejjora"} eyebrow="We reply personally">
        <AskOptions topic={askTopic} onClose={() => setSheet(null)} />
      </Sheet>
    </PlannerContext.Provider>
  );
}

/** Bottom sheet (mobile) / centred panel (desktop): Escape and backdrop close it, focus returns to the opener. */
function Sheet({ open, onClose, title, eyebrow, children }: { open: boolean; onClose: () => void; title: string; eyebrow: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const focusable = () => panelRef.current?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea") ?? [];
    const first = window.setTimeout(() => focusable()[0]?.focus(), 30);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = [...focusable()];
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    document.documentElement.dataset.sheetOpen = "true";
    return () => {
      window.clearTimeout(first);
      document.removeEventListener("keydown", onKey);
      delete document.documentElement.dataset.sheetOpen;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="tj-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.24 }}>
          <button type="button" className="tj-sheet__backdrop" aria-label="Close" tabIndex={-1} onClick={onClose} />
          <motion.div
            ref={panelRef}
            className="tj-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tj-sheet-title"
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 40, opacity: 0 }}
            transition={{ duration: 0.36, ease: EASE }}
          >
            <div className="tj-sheet__head">
              <div>
                <p className="tj-eyebrow">{eyebrow}</p>
                <h2 id="tj-sheet-title" className="tj-sheet__title">{title}</h2>
              </div>
              <CircleButton icon="close" label="Close" onClick={onClose} />
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function GuestStepper({ label, hint, type }: { label: string; hint: string; type: keyof Guests }) {
  const { guests, changeGuests } = useStayPlanner();
  const value = guests[type];
  const [min, max] = type === "adults" ? [1, 6] : [0, 4];
  return (
    <div className="tj-stepper">
      <div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <div className="tj-stepper__controls">
        <CircleButton icon="minus" label={`Fewer ${label.toLowerCase()}`} onClick={() => changeGuests(type, -1)} disabled={value <= min} />
        <output aria-live="polite" aria-label={label}>{value}</output>
        <CircleButton icon="plus" label={`More ${label.toLowerCase()}`} onClick={() => changeGuests(type, 1)} disabled={value >= max} />
      </div>
    </div>
  );
}

export function DateFields({ idPrefix }: { idPrefix: string }) {
  const { today, checkIn, checkOut, setCheckIn, setCheckOut } = useStayPlanner();
  return (
    <div className="tj-dates">
      <label className="tj-field" htmlFor={`${idPrefix}-in`}>
        <span>Check-in</span>
        <input id={`${idPrefix}-in`} type="date" min={today} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
      </label>
      <label className="tj-field" htmlFor={`${idPrefix}-out`}>
        <span>Check-out</span>
        <input id={`${idPrefix}-out`} type="date" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
      </label>
    </div>
  );
}

function PlannerForm({ onDone }: { onDone: () => void }) {
  const { error } = useStayPlanner();
  return (
    <form
      className="tj-planner"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onDone();
      }}
    >
      <DateFields idPrefix="sheet" />
      <div className="tj-planner__guests">
        <GuestStepper label="Adults" hint="Age 13+" type="adults" />
        <GuestStepper label="Children" hint="Age 0–12" type="children" />
      </div>
      {error ? <p className="tj-form-error" role="alert">{error}</p> : null}
      <PillButton type="submit" variant="lake" dot className="tj-pill--block">
        See rooms & rates
      </PillButton>
    </form>
  );
}

function AskOptions({ topic, onClose }: { topic: string | null; onClose: () => void }) {
  const { whatsappHref } = useStayPlanner();
  return (
    <div className="tj-ask">
      <a className="tj-ask__option" href={whatsappHref(topic)} target="_blank" rel="noreferrer" onClick={onClose}>
        <Icon name="whatsapp" size={22} />
        <span>
          <strong>WhatsApp</strong>
          <small>Message the hotel team</small>
        </span>
      </a>
      <a className="tj-ask__option" href={`tel:${hotel.phoneE164}`} onClick={onClose}>
        <Icon name="phone" size={22} />
        <span>
          <strong>Call {hotel.phoneDisplay}</strong>
          <small>Speak to the front desk</small>
        </span>
      </a>
      <button
        type="button"
        className="tj-ask__option"
        onClick={() => {
          onClose();
          window.dispatchEvent(new CustomEvent("tejjora:concierge-open", { detail: { topic: topic ?? undefined } }));
        }}
      >
        <ConciergeMark size={24} />
        <span>
          <strong>Ask {CONCIERGE_NAME}</strong>
          <small>{CONCIERGE_ROLE}: live rates, dates, dining and directions</small>
        </span>
      </button>
    </div>
  );
}
