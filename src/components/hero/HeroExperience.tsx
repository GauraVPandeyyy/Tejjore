"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";

type HeroStyle = CSSProperties & {
  "--hero-desktop-clip-top": string;
  "--hero-desktop-clip-right": string;
  "--hero-desktop-clip-bottom": string;
  "--hero-desktop-clip-left": string;
  "--hero-desktop-radius": string;
  "--hero-mobile-clip-top": string;
  "--hero-mobile-clip-right": string;
  "--hero-mobile-clip-bottom": string;
  "--hero-mobile-clip-left": string;
  "--hero-mobile-radius": string;
  "--hero-copy-opacity": string;
  "--hero-copy-shift": string;
  "--hero-media-scale": string;
};

export function HeroExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const measure = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section || media.matches) {
        setProgress(0);
        return;
      }

      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const next = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(next);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    media.addEventListener?.("change", measure);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      media.removeEventListener?.("change", measure);
    };
  }, []);

  const eased = 1 - Math.pow(1 - progress, 3);
  const clipFactor = 1 - eased;
  const style: HeroStyle = {
    "--hero-desktop-clip-top": `${12 * clipFactor}%`,
    "--hero-desktop-clip-right": `${3.2 * clipFactor}%`,
    "--hero-desktop-clip-bottom": `${11 * clipFactor}%`,
    "--hero-desktop-clip-left": `${51 * clipFactor}%`,
    "--hero-desktop-radius": `${22 * clipFactor}px`,
    "--hero-mobile-clip-top": `${5.1 * clipFactor}rem`,
    "--hero-mobile-clip-right": `${1 * clipFactor}rem`,
    "--hero-mobile-clip-bottom": `${43 * clipFactor}%`,
    "--hero-mobile-clip-left": `${1 * clipFactor}rem`,
    "--hero-mobile-radius": `${18 * clipFactor}px`,
    "--hero-copy-opacity": String(Math.max(0, 1 - progress * 1.34)),
    "--hero-copy-shift": `${-28 * eased}px`,
    "--hero-media-scale": String(1.04 - eased * 0.04),
  };

  return (
    <section ref={sectionRef} className="hero-experience" style={style} aria-labelledby="hero-title">
      <div className="hero-experience__sticky">
        <div className="hero-media" aria-hidden="true">
          <Image
            src={assets.hero.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-media__image"
          />
          <div className="hero-media__wash" />
          <div className="hero-media__grain" />
          <div className="hero-media__caption">
            <span>Vikalp Khand</span>
            <span>Gomti Nagar · Lucknow</span>
          </div>
        </div>

        <div className="hero-content site-container">
          <div className="hero-content__copy">
            <div className="hero-kicker">
              <span>29 rooms</span>
              <span aria-hidden="true">—</span>
              <span>3 ways to stay</span>
            </div>
            <h1 id="hero-title" className="hero-title">
              <span>Experience Lucknow</span>
              <em>by the Lake.</em>
            </h1>
            <p className="hero-intro">Contemporary stays in Gomti Nagar, with the city close and a quieter rhythm waiting inside.</p>
            <div className="hero-actions">
              <Link className="hero-link hero-link--primary" href="#rooms">
                <span>Explore rooms</span><span aria-hidden="true">↗</span>
              </Link>
              <Link className="hero-link" href="#lake-view">
                <span>See the view</span><span aria-hidden="true">↓</span>
              </Link>
            </div>
          </div>

          <div className="hero-side-note" aria-hidden="true">
            <span>TEJJORA</span>
            <span>THE WATERLINE / 00</span>
          </div>


          <div className="hero-footnote">
            <span>{hotel.address.locality}, {hotel.address.city}</span>
            <span>Direct hotel assistance · 24 hours</span>
          </div>
        </div>
      </div>
    </section>
  );
}
