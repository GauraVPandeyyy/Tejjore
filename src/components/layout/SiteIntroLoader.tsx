"use client";

import { useEffect, useState } from "react";

export function SiteIntroLoader() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem("tejjora-intro-seen") === "1";

    if (alreadySeen) {
      setVisible(false);
      return;
    }

    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
    }, 1250);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);

      sessionStorage.setItem("tejjora-intro-seen", "1");
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
