"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { hotel } from "@/data/hotel";
import { primaryNavigation, utilityNavigation } from "@/data/navigation";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => href.startsWith("/#") ? pathname === "/" : pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  const [scrolled, setScrolled] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  function openMenu() {
    dialogRef.current?.showModal();
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header className="site-header" data-home={pathname === "/" ? "true" : "false"} data-scrolled={scrolled ? "true" : "false"}>
        <div className="site-header__inner">
          <Wordmark />

          <nav className="site-header__nav" aria-label="Primary navigation">
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-header__link"
                data-active={isActive(item.href) ? "true" : "false"}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <Link className="site-header__book" href="/book">
              <span>Check dates</span>
              <span aria-hidden="true">↗</span>
            </Link>
            <button className="site-header__menu-button" type="button" onClick={openMenu} aria-haspopup="dialog">
              Menu
            </button>
          </div>
        </div>
        <span className="site-header__waterline" aria-hidden="true" />
      </header>

      <dialog ref={dialogRef} className="menu-dialog" onClick={(event) => {
        if (event.target === dialogRef.current) closeMenu();
      }}>
        <div className="menu-dialog__panel">
          <div className="menu-dialog__top">
            <Wordmark />
            <button type="button" className="menu-dialog__close" onClick={closeMenu} aria-label="Close menu">
              Close
            </button>
          </div>

          <nav className="menu-dialog__primary" aria-label="Mobile navigation">
            {primaryNavigation.map((item, index) => (
              <Link key={item.href} href={item.href} onClick={closeMenu} aria-current={isActive(item.href) ? "page" : undefined} data-active={isActive(item.href) ? "true" : "false"}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
              </Link>
            ))}
          </nav>

          <div className="menu-dialog__utility">
            {utilityNavigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMenu}>{item.label}</Link>
            ))}
          </div>

          <Link className="menu-dialog__book" href="/book" onClick={closeMenu}>
            <span>Find a stay</span><span aria-hidden="true">↗</span>
          </Link>

          <div className="menu-dialog__footer">
            <a href={`tel:${hotel.phoneE164}`}>{hotel.phoneDisplay}</a>
            <span>{hotel.address.locality}, {hotel.address.city}</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
