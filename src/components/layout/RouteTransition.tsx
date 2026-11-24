"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Route transition — one language for page-to-page navigation: a lake-teal sheet with a waterline
 * edge rises over the page, the new route renders underneath, then the sheet lifts away.
 *
 * Safe by construction:
 *  - Navigation starts at the same instant as the cover; nothing waits for the animation.
 *  - The sheet never captures pointer events and is aria-hidden.
 *  - Only plain left-clicks on same-origin internal links to a *different* page are intercepted.
 *    Modified clicks, new tabs, downloads, hash-only links, /admin, /api and anything marked
 *    data-no-transition use the browser/Next default. Back/forward is never intercepted.
 *  - A hard timeout lifts the sheet even if navigation stalls or errors, so it cannot cover an
 *    error message or block the page.
 *  - Reduced motion: no sheet at all, links behave normally.
 *
 * Motion is deliberately reserved for page changes — never for forms, date pickers, cart or
 * payment actions, which are not links to another route.
 */

const COVER_MS = 440;
const REVEAL_MS = 520;
const MAX_COVER_MS = 2600;
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

type Phase = "idle" | "covering";

export function RouteTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const backRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const phase = useRef<Phase>("idle");
  const covered = useRef<Promise<unknown>>(Promise.resolve());
  const safety = useRef(0);
  const lastPath = useRef(pathname);

  // Lift the sheet. Idempotent; always leaves the sheet hidden and the page interactive.
  const lift = useRef(() => {});
  useEffect(() => {
    lift.current = () => {
      const root = rootRef.current;
      const back = backRef.current;
      const front = frontRef.current;
      window.clearTimeout(safety.current);
      if (phase.current !== "covering" || !root || !back || !front) return;
      phase.current = "idle";
      const frontLift = front.animate([{ transform: "translateY(0)" }, { transform: "translateY(-104%)" }], { duration: REVEAL_MS, easing: EASE_IN_OUT, fill: "forwards" });
      const backLift = back.animate([{ transform: "translateY(0)" }, { transform: "translateY(-104%)" }], { duration: REVEAL_MS, delay: 70, easing: EASE_IN_OUT, fill: "forwards" });
      Promise.allSettled([frontLift.finished, backLift.finished]).then(() => {
        if (phase.current === "idle") {
          root.removeAttribute("data-active");
          frontLift.cancel();
          backLift.cancel();
        }
      });
    };
  });

  // New route committed → once the cover has closed, lift it.
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (phase.current !== "covering") return;
    let cancelled = false;
    covered.current.then(() => {
      if (cancelled) return;
      // Two frames so the new route has painted underneath before the sheet leaves.
      requestAnimationFrame(() => requestAnimationFrame(() => lift.current()));
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (event: MouseEvent) => {
      if (motion.matches || phase.current !== "idle") return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download") || anchor.hasAttribute("data-no-transition")) return;
      if (anchor.target && anchor.target !== "_self") return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // hash, query-only or same page: no new route to cover
      if (/^\/(admin|api)(\/|$)/.test(url.pathname)) return;

      const root = rootRef.current;
      const back = backRef.current;
      const front = frontRef.current;
      if (!root || !back || !front) return;

      event.preventDefault();
      phase.current = "covering";
      root.setAttribute("data-active", "");
      back.getAnimations().forEach((animation) => animation.cancel());
      front.getAnimations().forEach((animation) => animation.cancel());
      const backCover = back.animate([{ transform: "translateY(104%)" }, { transform: "translateY(0)" }], { duration: COVER_MS, easing: EASE_IN_OUT, fill: "forwards" });
      const frontCover = front.animate([{ transform: "translateY(104%)" }, { transform: "translateY(0)" }], { duration: COVER_MS, delay: 70, easing: EASE_IN_OUT, fill: "forwards" });
      covered.current = Promise.allSettled([backCover.finished, frontCover.finished]);

      // Navigation starts immediately; the animation never gates it.
      router.push(`${url.pathname}${url.search}${url.hash}`);

      // Whatever happens (slow route, error, same-path redirect), the sheet always leaves.
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => lift.current(), MAX_COVER_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(safety.current);
    };
  }, [router]);

  return (
    <div ref={rootRef} className="tj-route" aria-hidden="true">
      <div ref={backRef} className="tj-route__sheet tj-route__sheet--back">
        <svg className="tj-route__edge" viewBox="0 0 1200 80" preserveAspectRatio="none" focusable="false">
          <path d="M0 80V44C120 20 220 66 340 44S560 14 700 40 940 70 1060 40 1160 22 1200 34V80Z" />
        </svg>
      </div>
      <div ref={frontRef} className="tj-route__sheet tj-route__sheet--front">
        <svg className="tj-route__edge" viewBox="0 0 1200 80" preserveAspectRatio="none" focusable="false">
          <path d="M0 80V40C140 64 240 16 380 40S600 72 740 42 980 16 1100 44 1170 52 1200 40V80Z" />
        </svg>
        <span className="tj-route__word">Tejjora</span>
      </div>
    </div>
  );
}
