"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";
import { menuGroups, primaryNavigation } from "@/data/navigation";
import { Icon } from "@/components/ui/Icon";
import { EASE } from "@/components/ui/Motion";
import { Waterline } from "@/components/ui/Waterline";
import { useSiteChrome } from "./SiteChromeProvider";
import { Wordmark } from "./Wordmark";

/** Real hotel photography previewed beside each primary destination (desktop only). */
const PREVIEW: Record<string, { src: string; alt: string }> = {
  "/rooms": { src: assets.rooms.premium[0], alt: "Premium Room at Tejjora Lake View" },
  "/dining": { src: assets.restaurant[0], alt: "The restaurant at Tejjora Lake View" },
  "/experience": { src: assets.lobby[0], alt: "The lobby at Tejjora Lake View" },
  "/gallery": { src: assets.rooms.superDeluxe[1], alt: "Super Deluxe Room at Tejjora Lake View" },
  "/virtual-tour": { src: assets.lobby[1], alt: "Inside Tejjora Lake View" },
  "/location": { src: assets.hero.image, alt: "The front of Tejjora Lake View in Gomti Nagar" },
};
const PRIMARY_HREFS = new Set<string>(primaryNavigation.map((item) => item.href));
/** Everything the primary list does not already show, grouped as before. */
const SECONDARY = menuGroups
  .map((group) => ({ ...group, links: group.links.filter((link) => !PRIMARY_HREFS.has(link.href)) }))
  .filter((group) => group.links.length);

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The site menu: a modal sheet over a dimmed backdrop. It has its own close control, closes on
 * Escape, on a backdrop click and on navigation, traps Tab focus inside, locks page scroll
 * (keeping the scrollbar gap so nothing shifts) and returns focus to whatever opened it.
 * Desktop pairs the destinations with a real photograph of each; phones get one clean column.
 */
export function SiteMenu({ pathname }: { pathname: string }) {
  const reduce = useReducedMotion();
  const { menuOpen, closeMenu } = useSiteChrome();
  const panelRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState("/rooms");

  useEffect(() => {
    if (!menuOpen) return;
    const opener = document.activeElement;
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;
    root.dataset.menuOpen = "true";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    const focusTimer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[data-menu-close]")?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panelRef.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      delete root.dataset.menuOpen;
      document.body.style.paddingRight = "";
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, [menuOpen, closeMenu]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const fade = reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <AnimatePresence>
      {menuOpen ? (
        <motion.div key="menu" id="site-menu" className="tj-menu" role="dialog" aria-modal="true" aria-label="Site menu" {...fade} transition={{ duration: 0.28, ease: EASE }}>
          <button type="button" className="tj-menu__backdrop" aria-label="Close menu" tabIndex={-1} onClick={closeMenu} />
          <motion.div
            ref={panelRef}
            className="tj-menu__panel"
            initial={reduce ? false : { x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: 32, opacity: 0 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <div className="tj-menu__bar">
              {/* Closes even when the link points at the page already open. */}
              <span className="tj-menu__mark" onClick={closeMenu}>
                <Wordmark />
              </span>
              <div className="tj-menu__bar-actions">
                <Link href="/book" className="tj-pill tj-pill--cream tj-menu__book" onClick={closeMenu}>
                  <span>Book</span>
                  <span className="tj-pill__dot" aria-hidden="true" />
                </Link>
                <button type="button" className="tj-circle tj-circle--outline-light" data-menu-close="" onClick={closeMenu} aria-label="Close menu">
                  <Icon name="close" size={20} />
                </button>
              </div>
            </div>

            <div className="tj-menu__body">
              <div className="tj-menu__visual" aria-hidden="true">
                {Object.entries(PREVIEW).map(([href, image]) => (
                  <Image key={href} src={image.src} alt="" fill sizes="34vw" className="tj-menu__visual-image" data-active={preview === href ? "true" : "false"} />
                ))}
                <span className="tj-menu__visual-shade" />
                <Waterline variant="band" className="tj-menu__visual-line" />
              </div>

              <nav className="tj-menu__nav" aria-label="Site">
                <ol className="tj-menu__primary">
                  {primaryNavigation.map((item, index) => (
                    <motion.li
                      key={item.href}
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.48, ease: EASE, delay: 0.08 + index * 0.045 }}
                    >
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        onMouseEnter={() => setPreview(item.href)}
                        onFocus={() => setPreview(item.href)}
                        aria-current={isCurrent(item.href) ? "page" : undefined}
                      >
                        <span className="tj-menu__index" aria-hidden="true">
                          {isCurrent(item.href) ? <span className="tj-menu__dot" /> : null}
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="tj-menu__label">{item.label}</span>
                        <Icon name="arrow-right" size={20} className="tj-menu__arrow" />
                      </Link>
                    </motion.li>
                  ))}
                </ol>

                <div className="tj-menu__secondary">
                  {SECONDARY.map((group) => (
                    <div key={group.title} className="tj-menu__group">
                      <p className="tj-eyebrow">{group.title}</p>
                      <ul>
                        {group.links.map((link) => (
                          <li key={link.href}>
                            <Link href={link.href} onClick={closeMenu} aria-current={pathname === link.href ? "page" : undefined}>
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="tj-menu__contact">
                  <address>
                    {hotel.address.line1}, {hotel.address.locality}, {hotel.address.city} {hotel.address.postalCode}
                  </address>
                  <div className="tj-menu__contact-actions">
                    <a className="tj-pill tj-pill--outline-light tj-pill--small" href={`tel:${hotel.phoneE164}`}>
                      <Icon name="phone" size={16} />
                      <span>{hotel.phoneDisplay}</span>
                    </a>
                    <a className="tj-pill tj-pill--outline-light tj-pill--small" href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer">
                      <Icon name="whatsapp" size={16} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </nav>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
