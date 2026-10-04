"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { hotel } from "@/data/hotel";
import { primaryNavigation, utilityNavigation } from "@/data/navigation";
import { useSiteChrome } from "./SiteChromeProvider";

type HeaderTone = "light" | "dark";

const EASE = [0.22, 1, 0.36, 1] as const;
const LIGHT = "#F8F5ED";
const DARK = "#0B3338";
const NAVY = "#0D344A";
const SKY = "#9FBED2";

function parseRgb(value: string) {
  const match = value.match(
    /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/i,
  );
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function luminance(r: number, g: number, b: number) {
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function inferTone(start?: Element): HeaderTone | null {
  let current: Element | null | undefined = start;

  for (
    let depth = 0;
    current && depth < 8;
    depth += 1, current = current.parentElement
  ) {
    const element = current as HTMLElement;
    const explicit = element.dataset.headerTone;
    if (explicit === "light" || explicit === "dark") return explicit;

    const background = parseRgb(
      window.getComputedStyle(element).backgroundColor,
    );
    if (background && background.a >= 0.72) {
      return luminance(background.r, background.g, background.b) > 0.5
        ? "dark"
        : "light";
    }
  }

  return null;
}

function PhoneIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.2 3.8 5.1 5.9c-1.2 1.2-.3 4.7 2.8 7.8s6.6 4 7.8 2.8l2.1-2.1-3.2-3.2-1.7 1.7c-.5.5-1.5.2-2.5-.8s-1.3-2-.8-2.5l1.7-1.7-4.1-4.1Z" />
    </svg>
  );
}

function MenuIcon({
  open = false,
  className = "size-7",
}: {
  open?: boolean;
  className?: string;
}) {
  return (
    <span className={`relative block ${className}`} aria-hidden="true">
      <motion.span
        className="absolute left-1/2 top-[38%] h-[2px] w-[72%] -translate-x-1/2 rounded-full bg-current"
        animate={open ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
      />
      <motion.span
        className="absolute left-1/2 top-[61%] h-[2px] w-[72%] -translate-x-1/2 rounded-full bg-current"
        animate={open ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
      />
    </span>
  );
}

function WaterMarkIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 5v30" />
      <path d="M19 10h10" />
      <path d="M24 5a3 3 0 1 0 0 6" />
      <path d="M10 30c4 0 6 4 14 9 8-5 10-9 14-9" />
      <path d="M11 30c1 7 7 11 13 11s12-4 13-11" />
    </svg>
  );
}

const menuColumns = [
  {
    title: "Tejjora",
    links: [
      { label: "Gallery", href: "/gallery" },
      { label: "Location & directions", href: "/location" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Stay",
    links: [
      { label: "Book a stay", href: "/book" },
      { label: "Rooms", href: "/rooms" },
      { label: "Plan your stay", href: "/plan-your-stay" },
      { label: "Manage booking", href: "/manage-booking" },
      { label: "Smart arrival", href: "/arrival" },
    ],
  },
  {
    title: "Dining",
    links: [{ label: "Restaurant & dining", href: "/dining" }],
  },
  {
    title: "Experiences",
    links: [
      { label: "The lake view", href: "/experience" },
      { label: "Virtual tour", href: "/virtual-tour" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Gomti Nagar", href: "/location" },
      { label: "Photography", href: "/gallery" },
    ],
  },
] as const;

// Mobile menu's large links: the primary sections plus a direct booking entry point.
const mobileMenuLinks = [
  ...primaryNavigation,
  { label: "Book a Stay", href: "/book" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { menuOpen, openMenu, closeMenu } = useSiteChrome();
  const [tone, setTone] = useState<HeaderTone>(
    pathname === "/" ? "light" : "dark",
  );
  const [scrolled, setScrolled] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => closeMenu(), [pathname, closeMenu]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const sample = () => {
      frameRef.current = null;
      const nextScrolled = window.scrollY > 52;
      setScrolled(nextScrolled);

      const probeY = Math.min(
        window.innerHeight - 1,
        window.innerWidth < 768 ? 48 : 62,
      );
      const layers = document.elementsFromPoint(
        Math.round(window.innerWidth * 0.5),
        probeY,
      );
      const underlying = layers.find(
        (element) => !element.closest("[data-site-chrome]"),
      );
      const inferred = inferTone(underlying);

      if (inferred) setTone(inferred);
      else if (window.scrollY < 180 && pathname === "/") setTone("light");
    };

    const schedule = () => {
      if (frameRef.current === null)
        frameRef.current = window.requestAnimationFrame(sample);
    };

    sample();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frameRef.current !== null)
        window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, closeMenu]);

  if (pathname.startsWith("/admin")) return null;

  const color = menuOpen ? LIGHT : tone === "light" ? LIGHT : DARK;
  const backgroundColor = menuOpen
    ? "rgba(13, 52, 74, 0.96)"
    : tone === "light"
      ? "rgba(13, 52, 74, 0.76)"
      : "rgba(248, 245, 237, 0.82)";

  return (
    <>
      <motion.header
        data-site-chrome
        className="pointer-events-none fixed inset-x-0 top-0 z-[140] border-b border-current/10 backdrop-blur-xl"
        animate={{ color, backgroundColor }}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
      >
        <div className="relative mx-auto h-[72px] w-full max-w-[1920px] px-4 sm:px-7 lg:h-[92px] lg:px-12">
          {/* Desktop left utility */}
          <motion.div
            className="pointer-events-auto absolute left-12 top-1/2 hidden -translate-y-1/2 items-center gap-4 lg:flex"
            animate={{
              opacity: menuOpen ? 1 : scrolled ? 0.92 : 1,
              y: scrolled && !menuOpen ? -1 : 0,
            }}
          >
            <a
              href={`tel:${hotel.phoneE164}`}
              className="text-[12px] font-medium tracking-[0.18em] xl:text-[13px]"
            >
              T: {hotel.phoneDisplay}
            </a>
            <span className="h-4 w-px bg-current/60" aria-hidden="true" />
            {/* <span className="flex items-center gap-2 text-[12px] tracking-[0.16em]" aria-label="Language: English">
              English
            </span> */}
          </motion.div>

          {/* Mobile utilities */}
          <a
            href={`tel:${hotel.phoneE164}`}
            aria-label={`Call ${hotel.name}`}
            className="pointer-events-auto absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center lg:hidden"
          >
            <PhoneIcon />
          </a>
          <motion.button
            type="button"
            onClick={menuOpen ? closeMenu : openMenu}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            className="pointer-events-auto absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center lg:hidden"
            whileTap={{ scale: 0.94 }}
          >
            <MenuIcon open={menuOpen} className="size-8" />
          </motion.button>

          {/* Centered brand */}
          <motion.div
            className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{
              scale: menuOpen ? 1.04 : scrolled ? 0.78 : 1,
              y: menuOpen ? 2 : 0,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
          >
            <Link
              href="/"
              onClick={closeMenu}
              aria-label="Tejjora Lake View home"
              className="block text-center"
            >
              <span className="font-[var(--font-display)] text-[27px] font-extralight tracking-[0.16em] sm:text-[32px] lg:text-[48px] lg:tracking-[0.2em]">
                TEJJORA
              </span>
              <span className="mt-0.5 block text-[7px] font-medium tracking-[0.34em] sm:text-[8px] lg:text-[10px]">
                LAKE VIEW
              </span>
            </Link>
          </motion.div>

          {/* Desktop controls */}
          <div className="pointer-events-auto absolute right-12 top-1/2 hidden -translate-y-1/2 items-stretch lg:flex">
            <motion.div
              className={`grid size-[64px] place-items-center bg-[#0D344A] text-white xl:size-[70px] ${menuOpen ? "pointer-events-none" : ""}`}
              animate={{ opacity: menuOpen ? 0 : 1 }}
              whileHover={{ backgroundColor: "#12465F" }}
            >
              {/* Header booking CTA: same tile, now a real link to the booking flow. */}
              <Link
                href="/book"
                aria-label="Book a stay"
                title="Book a stay"
                tabIndex={menuOpen ? -1 : undefined}
                className="grid size-full place-items-center"
              >
                <WaterMarkIcon className="size-8 xl:size-9" />
              </Link>
            </motion.div>
            <motion.button
              type="button"
              onClick={menuOpen ? closeMenu : openMenu}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="grid size-[64px] place-items-center bg-[#9FBED2] text-white xl:size-[70px]"
              whileHover={{ backgroundColor: "#AEC9DA" }}
              whileTap={{ scale: 0.98 }}
            >
              <MenuIcon open={menuOpen} className="size-9" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            data-site-chrome
            className="pointer-events-auto fixed inset-0 z-[130] overflow-y-auto bg-[#0D344A] text-[#F5F3EE]"
            id="site-menu"
            initial={{ clipPath: "circle(0% at 94% 8%)" }}
            animate={{ clipPath: "circle(150% at 94% 8%)" }}
            exit={{ clipPath: "circle(0% at 94% 8%)" }}
            transition={{ duration: reduceMotion ? 0 : 0.78, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            {/* soft water lines */}
            {/* <div
              className="pointer-events-none absolute inset-x-0 top-[43%] h-[38%] opacity-[0.15]"
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                <motion.div
                  key={index}
                  className="absolute left-[-5%] h-px w-[110%] bg-[#9FBED2]"
                  style={{ top: `${index * 34}%` }}
                  initial={{ x: index % 2 ? 30 : -30, scaleX: 0.82 }}
                  animate={{ x: index % 2 ? -20 : 20, scaleX: 1 }}
                  transition={{
                    duration: 6 + index,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div> */}

            {/* Desktop mega menu */}
            <div className="relative mx-auto hidden min-h-dvh max-w-[1920px] px-12 pb-12 pt-[154px] lg:block">
              <div className="grid grid-cols-5 gap-8 xl:gap-12">
                {menuColumns.map((column, columnIndex) => (
                  <motion.div
                    key={column.title}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.16 + columnIndex * 0.05,
                      ease: EASE,
                    }}
                  >
                    <h2 className="font-[var(--font-display)] text-[clamp(1.9rem,2.7vw,3.6rem)] font-normal tracking-[0.03em] text-[#B7C4C9]">
                      {column.title}
                    </h2>
                    <div className="mt-7 grid gap-4">
                      {column.links.map((link) => (
                        <Link
                          key={`${column.title}-${link.href}-${link.label}`}
                          href={link.href}
                          onClick={closeMenu}
                          className="group w-fit text-[13px] tracking-[0.12em] text-[#F5F3EE]/78 transition-colors hover:text-white"
                        >
                          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
                            {link.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.28, ease: EASE }}
                className="absolute bottom-[74px] left-0 flex min-h-[126px] w-[47%] items-center rounded-r-full bg-[#9FBED2] px-14 text-[#0D344A]"
              >
                <Link
                  href="/plan-your-stay"
                  onClick={closeMenu}
                  className="block w-full"
                >
                  <span className="block font-[var(--font-display)] text-[clamp(2.4rem,4vw,5rem)] leading-none">
                    PLAN YOUR STAY
                  </span>
                  <span className="mt-2 block text-[12px] tracking-[0.18em]">
                    Rooms · dining · lake view
                  </span>
                </Link>
              </motion.div>
            </div>

            {/* Mobile menu */}
            <div className="relative flex min-h-dvh flex-col px-5 pb-[118px] pt-[106px] lg:hidden">
              <div className="grid gap-0 border-t border-white/10">
                {mobileMenuLinks.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: 0.1 + index * 0.045,
                      ease: EASE,
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className="flex min-h-[64px] items-center justify-between border-b border-white/10 font-[var(--font-display)] text-[clamp(1.8rem,8vw,2.6rem)] text-[#F5F3EE]"
                    >
                      <span>{item.label}</span>
                      <span className="text-[18px] font-light text-[#9FBED2]">
                        ↗
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-6 rounded-r-full bg-[#9FBED2] px-5 py-4 text-[#0D344A]"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
              >
                <Link href="/plan-your-stay" onClick={closeMenu}>
                  <span className="font-[var(--font-display)] text-2xl">
                    PLAN YOUR STAY
                  </span>
                  <span className="mt-1 block text-[9px] tracking-[0.18em]">
                    A simpler way to begin
                  </span>
                </Link>
              </motion.div>

              <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-8 text-[10px] uppercase tracking-[0.13em] text-white/62">
                {utilityNavigation.slice(0, 4).map((item) => (
                  <Link key={item.href} href={item.href} onClick={closeMenu}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
