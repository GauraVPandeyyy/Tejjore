"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Waterline } from "@/components/ui/Waterline";

const SEEN_KEY = "tejjora-intro-seen";

// Runs synchronously while the HTML is parsed, before first paint: repeat visits in the same
// session, reduced-motion users and Save-Data users never see the overlay.
const skipScript = `try{var e=document.getElementById("site-intro");if(e){var c=navigator.connection;if(sessionStorage.getItem("${SEEN_KEY}")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches||(c&&c.saveData)){e.setAttribute("data-skip","")}else{sessionStorage.setItem("${SEEN_KEY}","1")}}}catch(_){}`;

// Survives client-side navigations within this page load, so returning to "/" does not replay it.
let introHandled = false;

/**
 * Waterline loader (masterplan §2.6). The waterline draws behind the Tejjora lockup on lake, then
 * the overlay fades in ~600 ms total, revealing the hero lockup in the same position — the loader
 * becomes the hero. Safe by construction: pointer events are always off, it is a pure CSS
 * animation (it clears even if JavaScript fails), it never delays navigation, and it is skipped
 * on repeat visits, under reduced motion and with Save-Data.
 */
export function SiteIntroLoader() {
  const skip = typeof window !== "undefined" && introHandled;

  useEffect(() => {
    introHandled = true;
  }, []);

  if (skip) return null;

  return (
    <>
      <div id="site-intro" className="tj-loader" aria-hidden="true" suppressHydrationWarning>
        <div className="tj-lockup tj-loader__lockup">
          <Image src="/brand/tejjora-logo.png" alt="" width={1686} height={2048} sizes="(min-width: 1024px) 168px, 38vw" loading="eager" />
        </div>
        <Waterline variant="loader" className="tj-loader__waterline" />
      </div>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: skipScript }}
      />
    </>
  );
}
