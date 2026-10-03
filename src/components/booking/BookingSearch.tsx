"use client";

import {
  FormEvent,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { hotel } from "@/data/hotel";
import { useSiteChrome } from "@/components/layout/SiteChromeProvider";

type GuestState = {
  adults: number;
  children: number;
};

type Props = {
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

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

function formatDate(value: string) {
  if (!value) return "Add date";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function guestSummary({ adults, children }: GuestState) {
  if (!children) return `${adults} ${adults === 1 ? "adult" : "adults"}`;
  return `${adults} adult${adults === 1 ? "" : "s"}, ${children} child${children === 1 ? "" : "ren"}`;
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;

  input.focus({ preventScroll: true });

  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
  } catch {
    // Some browsers can reject showPicker even during a user gesture.
  }

  input.click();
}

function CalendarIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M7 3v5M17 3v5M3.5 10h17" />
    </svg>
  );
}

function SparkIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3v18M3 12h18" />
      <path d="M7 7c2.3 2.3 7.7 2.3 10 0M7 17c2.3-2.3 7.7-2.3 10 0" />
    </svg>
  );
}

function MenuIcon({ open = false }: { open?: boolean }) {
  return (
    <span className="relative block size-8" aria-hidden="true">
      <motion.span
        className="absolute left-1/2 top-[39%] h-[2px] w-[72%] -translate-x-1/2 rounded-full bg-current"
        animate={open ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      />
      <motion.span
        className="absolute left-1/2 top-[61%] h-[2px] w-[72%] -translate-x-1/2 rounded-full bg-current"
        animate={open ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      />
    </span>
  );
}

export function BookingSearch({ className = "" }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { menuOpen, toggleMenu } = useSiteChrome();
  const today = useMemo(() => toDateValue(new Date()), []);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestState>({ adults: 2, children: 0 });
  const [guestPanelOpen, setGuestPanelOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");

  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  const minimumCheckout = checkIn ? addDays(checkIn, 1) : today;

  // Do not leave a hidden planner behind the full-screen menu. In the old
  // version it could reappear after closing the menu.
  useEffect(() => {
    if (menuOpen) {
      setMobileOpen(false);
      setGuestPanelOpen(false);
    }
  }, [menuOpen]);

  function updateGuest(type: keyof GuestState, delta: number) {
    setGuests((current) => {
      const next = { ...current };
      const minimum = type === "adults" ? 1 : 0;
      const maximum = type === "adults" ? 6 : 4;
      next[type] = Math.min(maximum, Math.max(minimum, current[type] + delta));
      return next;
    });
  }

  function setCheckInSafely(value: string) {
    setCheckIn(value);
    setError("");

    if (!value) return;

    if (!checkOut || checkOut <= value) {
      setCheckOut(addDays(value, 1));
    }
  }

  function setCheckOutSafely(value: string) {
    setCheckOut(value);
    setError("");
  }

  function bookingUrl() {
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults: String(guests.adults),
      children: String(guests.children),
    });

    return `/book?${params.toString()}`;
  }

  function validate() {
    if (!checkIn || !checkOut) {
      setError("Choose your check-in and check-out dates.");
      return false;
    }

    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return false;
    }

    setError("");
    return true;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      if (window.matchMedia("(max-width: 1023px)").matches) {
        setMobileOpen(true);
      } else if (!checkIn) {
        openDatePicker(checkInRef.current);
      } else {
        openDatePicker(checkOutRef.current);
      }
      return;
    }

    setMobileOpen(false);
    setGuestPanelOpen(false);
    router.push(bookingUrl());
  }

  function enquire() {
    const dates =
      checkIn && checkOut
        ? `${formatDate(checkIn)} to ${formatDate(checkOut)}`
        : "dates not selected yet";

    const message = encodeURIComponent(
      `Hello Tejjora Lake View, I would like to enquire about a stay. Dates: ${dates}. Guests: ${guestSummary(guests)}.`,
    );

    const whatsappNumber = String(
      hotel.whatsappE164 || hotel.phoneE164 || "",
    ).replace(/\D/g, "");
    if (!whatsappNumber) return;

    window.open(
      `https://wa.me/${whatsappNumber}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleMobileMenu() {
    setMobileOpen(false);
    setGuestPanelOpen(false);
    toggleMenu();
  }

  return (
    <div data-site-chrome className={className}>
      {/* DESKTOP */}
      <form
        onSubmit={submit}
        noValidate
        className="fixed bottom-5 left-1/2 z-[145] hidden -translate-x-1/2 items-center gap-1 lg:flex"
      >
        {/* <motion.button
          type="button"
          onClick={() => router.push("/plan-your-stay")}
          aria-label="Plan your stay"
          className="grid size-[46px] shrink-0 place-items-center rounded-full bg-[#9FBED2] text-[#0D344A] shadow-[0_16px_45px_rgba(3,26,36,.28)]"
          whileHover={{ y: -3, rotate: -3 }}
          whileTap={{ scale: 0.96 }}
        >
          <SparkIcon className="size-5" />
        </motion.button> */}

        <div className="relative flex h-[50px] items-center rounded-full border border-black/5 bg-[#F7F5F1] p-[3px] text-[#0D344A] shadow-[0_18px_55px_rgba(3,26,36,.26)]">
          <DockDateField
            label="Check-in"
            value={checkIn}
            min={today}
            onChange={setCheckInSafely}
            inputRef={checkInRef}
          />

          <DockDateField
            label="Check-out"
            value={checkOut}
            min={minimumCheckout}
            onChange={setCheckOutSafely}
            inputRef={checkOutRef}
          />

          <div className="relative h-full">
            <motion.button
              type="button"
              onClick={() => setGuestPanelOpen((current) => !current)}
              className="flex h-full min-w-[150px] flex-col justify-center border-l border-[#0D344A]/12 px-5 text-left"
              whileTap={{ scale: 0.99 }}
              aria-expanded={guestPanelOpen}
            >
              <span className="text-[11px] font-semibold">Guests</span>
              <span className="mt-0.5 max-w-[150px] truncate text-[11px] text-[#0D344A]/62">
                {guestSummary(guests)}
              </span>
            </motion.button>

            <AnimatePresence>
              {guestPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE }}
                  className="absolute bottom-[calc(100%+14px)] left-1/2 z-20 w-[310px] -translate-x-1/2 rounded-[24px] bg-[#F7F5F1] p-5 shadow-[0_24px_70px_rgba(3,26,36,.3)]"
                >
                  <GuestCounter
                    label="Adults"
                    hint="Age 13+"
                    value={guests.adults}
                    onMinus={() => updateGuest("adults", -1)}
                    onPlus={() => updateGuest("adults", 1)}
                    minusDisabled={guests.adults <= 1}
                    plusDisabled={guests.adults >= 6}
                  />

                  <div className="my-4 h-px bg-[#0D344A]/10" />

                  <GuestCounter
                    label="Children"
                    hint="Age 0–12"
                    value={guests.children}
                    onMinus={() => updateGuest("children", -1)}
                    onPlus={() => updateGuest("children", 1)}
                    minusDisabled={guests.children <= 0}
                    plusDisabled={guests.children >= 4}
                  />

                  <button
                    type="button"
                    onClick={() => setGuestPanelOpen(false)}
                    className="mt-5 w-full rounded-full bg-[#0D344A] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={enquire}
            className="relative h-full min-w-[152px] overflow-hidden rounded-full bg-[#0D344A] px-7 text-[15px] font-semibold text-white"
            whileHover="hover"
            initial="idle"
            whileTap={{ scale: 0.985 }}
          >
            <motion.span
              className="absolute inset-0 origin-left bg-[#173F56]"
              variants={{ idle: { scaleX: 0 }, hover: { scaleX: 1 } }}
              transition={{ duration: 0.34, ease: EASE }}
            />
            <span className="relative z-10">Enquire</span>
          </motion.button>

          <motion.button
            type="submit"
            className="relative ml-2 h-full min-w-[152px] overflow-hidden rounded-full bg-[#9FBED2] px-7 text-[15px] font-semibold text-[#0D344A]"
            whileHover="hover"
            initial="idle"
            whileTap={{ scale: 0.985 }}
          >
            <motion.span
              className="absolute inset-0 origin-right bg-[#B9D0DE]"
              variants={{ idle: { scaleX: 0 }, hover: { scaleX: 1 } }}
              transition={{ duration: 0.34, ease: EASE }}
            />
            <span className="relative z-10">Book</span>
          </motion.button>
        </div>

        {/* <motion.button
          type="button"
          onClick={() => openDatePicker(checkInRef.current)}
          aria-label="Choose check-in date"
          className="grid size-[46px] shrink-0 place-items-center rounded-full bg-[#9FBED2] text-[#0D344A] shadow-[0_16px_45px_rgba(3,26,36,.28)]"
          whileHover={{ y: -3, rotate: 3 }}
          whileTap={{ scale: 0.96 }}
        >
          <CalendarIcon className="size-5" />
        </motion.button> */}

        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 rounded-full bg-[#7F332E] px-2 py-2 text-[11px] text-white shadow-xl"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      {/* MOBILE */}
      <div className="fixed inset-x-0 bottom-[max(10px,env(safe-area-inset-bottom))] z-[145] px-3 lg:hidden">
        <div className="mx-auto flex max-w-[430px] items-end justify-center gap-2">
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Plan your stay"
              className="grid size-[46px] place-items-center rounded-full bg-[#9FBED2] text-[#0D344A] shadow-[0_12px_35px_rgba(3,26,36,.25)]"
              whileTap={{ scale: 0.94 }}
            >
              <SparkIcon className="size-5" />
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Choose dates and guests"
              className="grid size-[46px] place-items-center rounded-full bg-[#9FBED2] text-[#0D344A] shadow-[0_12px_35px_rgba(3,26,36,.25)]"
              whileTap={{ scale: 0.94 }}
            >
              <CalendarIcon className="size-5" />
            </motion.button>
          </div>

          <div className="flex h-[46px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#F7F5F1] p-[3px] shadow-[0_12px_38px_rgba(3,26,36,.28)]">
            <motion.button
              type="button"
              onClick={enquire}
              className="flex-1 rounded-full bg-[#0D344A] px-3 text-[11px] font-semibold text-white"
              whileTap={{ scale: 0.98 }}
            >
              Enquire
            </motion.button>

            <motion.button
              type="button"
              onClick={() => {
                if (validate()) router.push(bookingUrl());
                else setMobileOpen(true);
              }}
              className="flex-1 rounded-full px-3 text-[11px] font-semibold text-[#0D344A]"
              whileTap={{ scale: 0.98 }}
            >
              Book
            </motion.button>
          </div>

          <motion.button
            type="button"
            onClick={handleMobileMenu}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="grid size-[50px] shrink-0 place-items-center rounded-full bg-[#0D344A] text-white shadow-[0_12px_38px_rgba(3,26,36,.3)]"
            whileTap={{ scale: 0.94 }}
          >
            <MenuIcon open={menuOpen} />
          </motion.button>
        </div>
      </div>

      {/* MOBILE PLANNER */}
      <AnimatePresence>
        {mobileOpen && !menuOpen && (
          <motion.div
            className="fixed inset-0 z-[150] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Choose stay dates and guests"
          >
            <motion.button
              type="button"
              aria-label="Close stay planner"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-[#071D20]/55 backdrop-blur-[5px]"
            />

            <motion.form
              onSubmit={submit}
              noValidate
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
              className="absolute inset-x-0 bottom-0 z-10 max-h-[88dvh] overflow-y-auto rounded-t-[30px] bg-[#F7F5F1] px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-4 text-[#0D344A] shadow-[0_-24px_70px_rgba(0,0,0,.28)]"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#0D344A]/18" />

              <div className="flex items-start justify-between gap-5 border-b border-[#0D344A]/10 pb-4">
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0D344A]/50">
                    Your stay
                  </span>
                  <h2 className="mt-1 font-[var(--font-display)] text-[clamp(2rem,10vw,2.8rem)] font-normal leading-[.95]">
                    Choose dates & guests.
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-[#0D344A]/15 text-[11px]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <MobileDateField
                  label="Check-in"
                  value={checkIn}
                  min={today}
                  onChange={setCheckInSafely}
                />
                <MobileDateField
                  label="Check-out"
                  value={checkOut}
                  min={minimumCheckout}
                  onChange={setCheckOutSafely}
                />
              </div>

              <div className="mt-3 rounded-[22px] border border-[#0D344A]/10 bg-white/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#0D344A]/50">
                    Guests
                  </span>
                  <span className="text-xs font-medium">
                    {guestSummary(guests)}
                  </span>
                </div>

                <GuestCounter
                  label="Adults"
                  hint="Age 13+"
                  value={guests.adults}
                  onMinus={() => updateGuest("adults", -1)}
                  onPlus={() => updateGuest("adults", 1)}
                  minusDisabled={guests.adults <= 1}
                  plusDisabled={guests.adults >= 6}
                />

                <div className="my-3 h-px bg-[#0D344A]/10" />

                <GuestCounter
                  label="Children"
                  hint="Age 0–12"
                  value={guests.children}
                  onMinus={() => updateGuest("children", -1)}
                  onPlus={() => updateGuest("children", 1)}
                  minusDisabled={guests.children <= 0}
                  plusDisabled={guests.children >= 4}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-[14px] bg-[#7F332E]/10 px-4 py-3 text-sm text-[#7F332E]"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={enquire}
                  className="min-h-14 rounded-full bg-[#0D344A] px-4 text-[12px] font-semibold text-white"
                >
                  Enquire
                </button>
                <button
                  type="submit"
                  className="min-h-14 rounded-full bg-[#9FBED2] px-4 text-[12px] font-semibold text-[#0D344A]"
                >
                  Book
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type DockDateFieldProps = {
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

function DockDateField({
  label,
  value,
  min,
  onChange,
  inputRef,
}: DockDateFieldProps) {
  return (
    <div className="relative h-full min-w-[148px]">
      <button
        type="button"
        onClick={() => openDatePicker(inputRef.current)}
        className="flex h-full w-full flex-col justify-center px-5 text-left first:pl-7"
        aria-label={`${label}: ${value ? formatDate(value) : "Add date"}`}
      >
        <span className="text-[11px] font-semibold">{label}</span>
        <span className="mt-0.5 text-[11px] text-[#0D344A]/60">
          {formatDate(value)}
        </span>
      </button>

      <input
        ref={inputRef}
        type="date"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-px -translate-x-1/2 -translate-y-1/2 opacity-0"
      />
    </div>
  );
}

type MobileDateFieldProps = {
  label: string;
  value: string;
  min: string;
  onChange: (value: string) => void;
};

function MobileDateField({
  label,
  value,
  min,
  onChange,
}: MobileDateFieldProps) {
  return (
    <label className="block rounded-[19px] border border-[#0D344A]/10 bg-white/55 p-3.5">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-[#0D344A]/50">
        {label}
      </span>
      <input
        type="date"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-8 w-full bg-transparent text-[13px] text-[#0D344A] outline-none"
      />
    </label>
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

function GuestCounter({
  label,
  hint,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: GuestCounterProps) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div>
        <strong className="block text-[13px]">{label}</strong>
        <span className="mt-0.5 block text-[10px] text-[#0D344A]/52">
          {hint}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMinus}
          disabled={minusDisabled}
          aria-label={`Remove ${label.toLowerCase()}`}
          className="grid size-9 place-items-center rounded-full border border-[#0D344A]/15 text-lg disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>

        <output
          className="min-w-5 text-center text-sm font-semibold"
          aria-live="polite"
        >
          {value}
        </output>

        <button
          type="button"
          onClick={onPlus}
          disabled={plusDisabled}
          aria-label={`Add ${label.toLowerCase()}`}
          className="grid size-9 place-items-center rounded-full border border-[#0D344A]/15 text-lg disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
