"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { terraceViewSequence } from "@/data/experience";
import { SectionLabel } from "@/components/shared/SectionLabel";

type TerraceStyle = CSSProperties & {
  "--terrace-progress": string;
};

const desktopTerraceImages = ["/d1.png", "/d2.png", "/d3.png", "/d4.png"];

const mobileTerraceImages = ["/m1.png", "/m2.png", "/m3.png", "/m4.png"];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function TerraceExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const measure = () => {
      frame = 0;

      const section = sectionRef.current;

      if (!section || reduce.matches) {
        setProgress(0);
        return;
      }

      const rect = section.getBoundingClientRect();

      const travel = Math.max(1, section.offsetHeight - window.innerHeight);

      const next = clamp(-rect.top / travel);

      setProgress(next);
    };

    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    measure();

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    window.addEventListener("resize", onScroll);

    reduce.addEventListener?.("change", measure);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);

      reduce.removeEventListener?.("change", measure);
    };
  }, []);

  const position = progress * (terraceViewSequence.length - 1);

  const activeIndex = Math.min(
    terraceViewSequence.length - 1,
    Math.max(0, Math.round(position)),
  );

  const active = terraceViewSequence[activeIndex];

  const style: TerraceStyle = {
    "--terrace-progress": String(progress),
  };

  return (
    <section
      ref={sectionRef}
      id="lake-view"
      className="terrace-scroll"
      style={style}
      aria-labelledby="terrace-title"
    >
      {/* =====================================================
          DESKTOP / LAPTOP
      ====================================================== */}

      <div className="terrace-scroll__desktop">
        <div
          className={`terrace-scroll__sticky terrace-scroll__sticky--${active.tone}`}
        >
          <div className="terrace-scroll__media" aria-hidden="true">
            {terraceViewSequence.map((state, index) => {
              const distance = Math.abs(position - index);

              const opacity = clamp(1 - distance);

              const scale = 1.035 - opacity * 0.035;

              return (
                <div
                  key={state.id}
                  className="terrace-scroll__image-layer"
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                  }}
                >
                  <Image
                    src={desktopTerraceImages[index]}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={index === 0}
                    className="terrace-scroll__photo"
                  />
                </div>
              );
            })}

            <div className="terrace-scroll__veil" />

            <div className="terrace-scroll__grain" />
          </div>

          <div className="terrace-scroll__chrome site-container">
            <div className="terrace-scroll__heading">
              <SectionLabel index="02">THE VIEW</SectionLabel>

              <h2 id="terrace-title">
                From the terrace,
                <br />
                <em>time moves differently.</em>
              </h2>
            </div>

            <div
              className="terrace-scroll__timeline"
              aria-label="Terrace view times"
            >
              <span
                className="terrace-scroll__timeline-track"
                aria-hidden="true"
              >
                <span className="terrace-scroll__timeline-progress" />
              </span>

              {terraceViewSequence.map((state, index) => (
                <div
                  key={state.id}
                  className="terrace-scroll__time"
                  data-active={index === activeIndex ? "true" : "false"}
                >
                  <span>{state.timeLabel}</span>

                  <strong>{state.label}</strong>
                </div>
              ))}
            </div>

            <div className="terrace-scroll__caption" aria-live="polite">
              <span className="micro">
                {active.timeLabel} / {active.label}
              </span>

              <h3>{active.headline}</h3>

              <p>{active.copy}</p>
            </div>

            <div className="terrace-scroll__replacement-note micro">
              MORNING · DAY · EVENING · NIGHT
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          MOBILE
      ====================================================== */}

      <div className="terrace-scroll__mobile">
        <div
          className={`terrace-scroll__mobile-sticky terrace-scroll__sticky--${active.tone}`}
        >
          <div className="terrace-scroll__mobile-media" aria-hidden="true">
            {terraceViewSequence.map((state, index) => {
              const distance = Math.abs(position - index);

              const opacity = clamp(1 - distance);

              const scale = 1.045 - opacity * 0.045;

              return (
                <div
                  key={state.id}
                  className="terrace-scroll__mobile-image-layer"
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                  }}
                >
                  <Image
                    src={mobileTerraceImages[index]}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={index === 0}
                    className="terrace-scroll__photo"
                  />
                </div>
              );
            })}

            <div className="terrace-scroll__mobile-veil" />

            <div className="terrace-scroll__grain" />
          </div>

          <div className="terrace-scroll__mobile-chrome site-container">
            <div className="terrace-scroll__mobile-heading">
              <SectionLabel index="02">THE VIEW</SectionLabel>

              <h2>
                From the terrace,
                <br />
                <em>time moves differently.</em>
              </h2>
            </div>

            <div className="terrace-scroll__mobile-caption" aria-live="polite">
              <span className="micro">
                {active.timeLabel} / {active.label}
              </span>

              <h3>{active.headline}</h3>

              <p>{active.copy}</p>
            </div>

            <div
              className="terrace-scroll__mobile-timeline"
              aria-label="Terrace view time progression"
            >
              {terraceViewSequence.map((state, index) => (
                <span
                  key={state.id}
                  data-active={index === activeIndex ? "true" : "false"}
                >
                  <i aria-hidden="true" />

                  <strong>{state.label}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
