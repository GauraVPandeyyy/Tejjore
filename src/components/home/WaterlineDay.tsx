"use client";

import Link from "next/link";
import { getImageProps } from "next/image";
import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { clamp, scrollRunwayTo, useRunwayProgress, useStoryMode } from "@/components/motion/useRunway";
import { CircleButton } from "@/components/ui/Buttons";
import { Ornament } from "@/components/ui/Waterline";

/**
 * The Waterline Day — Morning → Day → Evening → Night as a full-bleed, pinned scroll story, the
 * same on phones and desktops:
 * - The stage is sticky for one viewport while the section's runway scrolls past it. Scroll progress
 *   drives everything continuously: the four frames crossfade and drift, the light tint shifts, a
 *   sun that becomes a moon travels its arc, the clock ticks from 07:00 to 21:00, the stars come
 *   out, the caption card hands over and the waterline progress draws.
 * - Nothing is trapped — it is plain page scroll. Arrows, chips and swipe scroll to a scene's resting
 *   point, and a skip link jumps past the section.
 * - Reduced motion: no runway and no drift; the stage is a one-viewport step carousel (chips, arrows,
 *   swipe) with crossfades only and one live region.
 * The frames are illustrations, not property photography, and say so. Times are a suggested rhythm,
 * not service hours.
 */
const SCENES = [
  { id: "morning", label: "Morning", hour: 7, title: "A slow start", copy: "Wake without hurry and begin with breakfast before the city fills up.", link: { href: "/dining#breakfast", label: "The breakfast menu" } },
  { id: "day", label: "Day", hour: 13, title: "Out into Lucknow", copy: "Meetings, markets, monuments — Gomti Nagar keeps the city within easy reach.", link: { href: "/location", label: "Getting around" } },
  { id: "evening", label: "Evening", hour: 18, title: "The light softens", copy: "Come back as the day cools, and let the evening slow down.", link: { href: "/dining", label: "The restaurant" } },
  { id: "night", label: "Night", hour: 21, title: "A quiet night in", copy: "Dinner, then a calm room and an unhurried end to the day.", link: { href: "/rooms", label: "The rooms" } },
] as const;
const LAST = SCENES.length - 1;

/** Light laid over the frames at each scene: [r, g, b, a]. Interpolated with progress. */
const TINTS: Array<[number, number, number, number]> = [
  [255, 206, 140, 0.2],
  [255, 252, 232, 0.02],
  [255, 112, 48, 0.24],
  [4, 22, 58, 0.36],
];
/** The sun-then-moon orb: [r, g, b]. */
const ORBS: Array<[number, number, number]> = [
  [255, 226, 168],
  [255, 251, 224],
  [255, 150, 88],
  [206, 224, 255],
];

function art(index: number) {
  const common = { alt: "", sizes: "100vw", loading: "lazy" as const };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: `/d${index + 1}.png`, width: 1672, height: 941, quality: 70 });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: `/m${index + 1}.png`, width: 941, height: 1672, quality: 70 });
  return { desktop, mobile, rest };
}

function mix(values: number[][], position: number) {
  const low = Math.min(LAST - 1, Math.floor(position));
  const high = low + 1;
  const amount = clamp(position - low);
  return values[low].map((channel, index) => channel + (values[high][index] - channel) * amount);
}

function clockText(position: number) {
  const low = Math.min(LAST - 1, Math.floor(position));
  const amount = clamp(position - low);
  const hours = SCENES[low].hour + (SCENES[low + 1].hour - SCENES[low].hour) * amount;
  const whole = Math.floor(hours);
  const minutes = Math.floor((hours - whole) * 60);
  return `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function WaterlineDay() {
  const sectionRef = useRef<HTMLElement>(null);
  const pictureRefs = useRef<Array<HTMLElement | null>>([]);
  const clockRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const story = useStoryMode();
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useRunwayProgress(sectionRef, story, (progress) => {
    const section = sectionRef.current;
    if (!section) return;
    const position = progress * LAST; // 0 … 3, continuous
    // Each scene holds near its own position, then crossfades over the middle of the gap.
    pictureRefs.current.forEach((picture, index) => {
      if (!picture) return;
      const distance = Math.abs(position - index);
      picture.style.opacity = String(clamp(1 - (distance - 0.22) / 0.56));
      const drift = (position - index) * -2.2; // % of the frame, a slow pan between scenes
      picture.style.transform = `translate3d(${drift.toFixed(2)}%, 0, 0) scale(${(1.1 - 0.05 * clamp(1 - distance)).toFixed(4)})`;
    });
    const [tr, tg, tb, ta] = mix(TINTS, position);
    const [or, og, ob] = mix(ORBS, position);
    section.style.setProperty("--wl-p", progress.toFixed(4));
    section.style.setProperty("--wl-tint", `rgba(${Math.round(tr)},${Math.round(tg)},${Math.round(tb)},${ta.toFixed(3)})`);
    section.style.setProperty("--wl-orb", `${Math.round(or)},${Math.round(og)},${Math.round(ob)}`);
    section.style.setProperty("--wl-orb-x", `${(8 + progress * 84).toFixed(2)}%`);
    section.style.setProperty("--wl-orb-y", `${(22 - 15 * Math.sin(progress * Math.PI)).toFixed(2)}%`);
    section.style.setProperty("--wl-night", clamp((position - 2) / 1).toFixed(3));
    if (clockRef.current) clockRef.current.textContent = clockText(position);
    setActive(Math.round(position));
  });

  const go = useCallback(
    (index: number) => {
      const next = clamp(index, 0, LAST);
      if (story) scrollRunwayTo(sectionRef.current, next, LAST);
      setActive(next);
    },
    [story],
  );

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    swipe.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.4) go(active + (dx < 0 ? 1 : -1));
  }

  const scene = SCENES[active];

  return (
    <section
      ref={sectionRef}
      className="hx-wl"
      data-scene={scene.id}
      data-mode={story ? "story" : "steps"}
      data-header-tone="dark"
      style={{ "--wl-step": active / LAST } as CSSProperties}
      aria-labelledby="waterline-day-title"
    >
      <noscript>
        <style>{`.hx-wl[data-mode="story"]{height:auto!important}.hx-wl[data-mode="story"] .hx-wl__stage{position:relative!important}`}</style>
      </noscript>
      <a className="hx-wl__skip" href="#after-waterline-day">
        Skip the Waterline Day
      </a>
      <div className="hx-wl__stage">
        <div className="hx-wl__frame" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
          {SCENES.map((item, index) => {
            const { desktop, mobile, rest } = art(index);
            return (
              <picture
                key={item.id}
                ref={(element) => {
                  pictureRefs.current[index] = element;
                }}
                className="hx-wl__picture"
                data-active={index === active ? "true" : "false"}
              >
                <source media="(min-width: 768px)" srcSet={desktop} />
                <source srcSet={mobile} />
                <img {...rest} alt={index === active ? `Illustration of ${item.label.toLowerCase()} at a lakeside terrace (not a photograph of the hotel)` : ""} />
              </picture>
            );
          })}
          <span className="hx-wl__tint" aria-hidden="true" />
          <span className="hx-wl__stars" aria-hidden="true" />
          <span className="hx-wl__orb" aria-hidden="true" />
          <span className="hx-wl__shade" aria-hidden="true" />
        </div>

        <div className="hx-wl__intro">
          <Ornament />
          <h2 id="waterline-day-title" className="tj-heading">
            The Waterline Day
          </h2>
          <p>A suggested rhythm for a stay, from first light to night.</p>
        </div>
        <span className="tj-tag hx-wl__tag">Illustrative</span>
        <span className="hx-wl__clock" aria-hidden="true">
          <span ref={clockRef}>07:00</span>
        </span>

        <div className="hx-wl__bottom">
          <div className="hx-wl__captions">
            {SCENES.map((item, index) => (
              <div key={item.id} className="hx-wl__caption" data-active={index === active ? "true" : "false"} aria-hidden={index === active ? undefined : true}>
                <p className="tj-eyebrow">
                  {item.label} · {String(item.hour).padStart(2, "0")}:00
                </p>
                <h3>{item.title}</h3>
                <p className="hx-wl__copy">{item.copy}</p>
                <Link className="tj-text-link" href={item.link.href} tabIndex={index === active ? undefined : -1}>
                  {item.link.label} →
                </Link>
              </div>
            ))}
            <p className="sr-only" aria-live="polite">
              {scene.label}: {scene.title}
            </p>
          </div>

          <div className="hx-wl__controls">
            <CircleButton icon="arrow-left" label="Previous time of day" tone="outline-light" onClick={() => go(active - 1)} disabled={active === 0} />
            <div className="hx-wl__chips" role="group" aria-label="Time of day">
              {SCENES.map((item, index) => (
                <button key={item.id} type="button" className="tj-chip" aria-pressed={index === active} onClick={() => go(index)}>
                  {item.label}
                </button>
              ))}
            </div>
            <CircleButton icon="arrow-right" label="Next time of day" tone="outline-light" onClick={() => go(active + 1)} disabled={active === LAST} />
            <div className="hx-wl__progress" aria-hidden="true">
              <svg viewBox="0 0 300 12" preserveAspectRatio="none">
                <path className="hx-wl__track" d="M0 6 C 25 1, 50 11, 75 6 S 125 1, 150 6 S 200 11, 225 6 S 275 1, 300 6" />
                <path className="hx-wl__drawn" pathLength={1} d="M0 6 C 25 1, 50 11, 75 6 S 125 1, 150 6 S 200 11, 225 6 S 275 1, 300 6" />
              </svg>
              <span className="hx-wl__dot" />
            </div>
          </div>
        </div>
      </div>
      <span id="after-waterline-day" className="hx-wl__end" tabIndex={-1} />
    </section>
  );
}
