"use client";

/**
 * ParallaxFrame — a photograph window with two scroll-linked behaviours (GSAP ScrollTrigger):
 *  - reveal: the frame opens upward (clip-path) the first time it enters the viewport;
 *  - parallax: the image inside drifts against the scroll, `speed` percent of the frame height each way.
 * Several frames on one composition with different speeds give real layered depth.
 *
 * GSAP owns the clip-path and the inner transform of this element only. gsap.matchMedia() reverts
 * everything under prefers-reduced-motion, leaving a plain, fully visible photograph; without
 * JavaScript the photograph is simply visible (nothing is hidden until the effect starts).
 */
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ParallaxFrame({
  children,
  className = "",
  speed = 8,
  reveal = true,
  from = "bottom",
  style,
}: {
  children: ReactNode;
  className?: string;
  /** Percent of the frame height the image travels in each direction. 0 disables parallax. */
  speed?: number;
  reveal?: boolean;
  from?: "bottom" | "left" | "right";
  style?: CSSProperties;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = frame.current;
    const img = inner.current;
    if (!el || !img) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (reveal) {
        const hidden = from === "left" ? "inset(0 100% 0 0)" : from === "right" ? "inset(0 0 0 100%)" : "inset(100% 0 0 0)";
        gsap.fromTo(
          el,
          { clipPath: hidden },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.15,
            ease: "power3.inOut",
            clearProps: "clipPath",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      }
      if (speed > 0) {
        gsap.fromTo(
          img,
          { y: () => -(el.offsetHeight * speed) / 100 },
          {
            y: () => (el.offsetHeight * speed) / 100,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
          },
        );
      }
    });
    return () => mm.revert();
  }, [speed, reveal, from]);

  return (
    <div ref={frame} className={`tj-par ${className}`.trim()} style={style}>
      <div ref={inner} className="tj-par__inner" style={{ top: `-${speed}%`, height: `${100 + speed * 2}%` }}>
        {children}
      </div>
    </div>
  );
}

export default ParallaxFrame;
