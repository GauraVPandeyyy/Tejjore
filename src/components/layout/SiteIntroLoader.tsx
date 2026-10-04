"use client";

import { useEffect, useRef, useState } from "react";

export function SiteIntroLoader() {
  const startedRef = useRef(false);
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // startedRef survives StrictMode's dev-only effect re-run, so the flag written below
    // is not mistaken for a previous visit.
    if (!startedRef.current) {
      // Storage can throw (blocked site data, some private modes); the intro then just plays.
      let alreadySeen = false;
      try {
        alreadySeen = sessionStorage.getItem("tejjora-intro-seen") === "1";
        // Mark as seen once it starts, so navigating away mid-intro does not replay it.
        if (!alreadySeen) sessionStorage.setItem("tejjora-intro-seen", "1");
      } catch {
        // Ignore storage failures.
      }

      if (alreadySeen) {
        setVisible(false);
        return;
      }
      startedRef.current = true;
    }

    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
    }, 1250);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, 1850);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`site-intro ${leaving ? "site-intro--leave" : ""}`}
      aria-hidden="true"
    >
      <div className="site-intro__brand">
        <div className="site-intro__mark">
          <img src="/brand/tejjora-logo.png" alt="" />
        </div>

        <span>TEJJORA LAKE VIEW</span>

        <small>A BOUTIQUE HOTEL</small>
      </div>

      <div className="site-intro__lake">
        <span />
        <span />
        <span />
      </div>

      <div className="site-intro__line" />
    </div>
  );
}
