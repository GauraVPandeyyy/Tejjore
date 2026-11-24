"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hotel } from "@/data/hotel";
import { primaryNavigation } from "@/data/navigation";
import { Icon } from "@/components/ui/Icon";
import { SiteMenu } from "./SiteMenu";
import { Wordmark } from "./Wordmark";
import { useSiteChrome } from "./SiteChromeProvider";

/**
 * Header. Desktop (≥1024): transparent over a hero, solid lake once the hero has scrolled under it
 * (IntersectionObserver on [data-hero-overlay], no per-frame work), Book always visible. Below
 * 1024: a minimal bar — call and the Tejjora mark — because Menu, Ask and Book live in the dock.
 * The header is fixed with a constant height, so the tone change never shifts layout. The menu
 * itself is a modal sheet with its own close control (SiteMenu).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { menuOpen, closeMenu, toggleMenu } = useSiteChrome();
  // Which page the hero observation belongs to, so a stale value never carries across navigation.
  const [heroState, setHeroState] = useState<{ path: string; over: boolean }>({ path: "", over: false });
  const overHero = heroState.path === pathname && heroState.over;

  useEffect(() => {
    const hero = document.querySelector("[data-hero-overlay]");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroState({ path: pathname, over: entry.isIntersecting }), { rootMargin: "-88px 0px 0px 0px", threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  // Close the menu on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (menuOpen) closeMenu();
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header className="tj-header" data-tone={overHero ? "clear" : "solid"}>
        <div className="tj-header__inner">
          <a className="tj-circle tj-circle--outline-light tj-header__call" href={`tel:${hotel.phoneE164}`} aria-label={`Call Tejjora Lake View on ${hotel.phoneDisplay}`}>
            <Icon name="phone" size={18} />
          </a>
          <Wordmark />
          <nav className="tj-header__nav" aria-label="Primary">
            {primaryNavigation.map((item) => (
              <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="tj-header__actions">
            <a className="tj-header__phone" href={`tel:${hotel.phoneE164}`}>{hotel.phoneDisplay}</a>
            <button type="button" className="tj-circle tj-circle--outline-light tj-header__menu" onClick={toggleMenu} aria-expanded={menuOpen} aria-controls="site-menu" aria-haspopup="dialog" aria-label="Open menu">
              <Icon name="menu" size={20} />
            </button>
            <Link href="/book" className="tj-pill tj-pill--cream tj-header__book">
              <span>Book</span>
              <span className="tj-pill__dot" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>
      <SiteMenu pathname={pathname} />
    </>
  );
}
