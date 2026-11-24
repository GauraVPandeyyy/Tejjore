"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True unless the visitor asks for reduced motion. It starts true so the server and first client
 * render share the pinned-story markup (no layout jump after hydration); only reduced-motion
 * visitors switch to the step layout.
 */
export function useStoryMode() {
  const [story, setStory] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia(REDUCE_QUERY);
    const update = () => setStory(!reduce.matches);
    update();
    reduce.addEventListener("change", update);
    return () => reduce.removeEventListener("change", update);
  }, []);
  return story;
}

/**
 * Scroll progress (0 → 1) through a "runway": a tall section whose child stage is sticky for one
 * viewport. Plain page scroll — nothing is trapped or hijacked. Calls `onProgress` once per frame
 * while the page scrolls or resizes, and once on mount.
 */
export function useRunwayProgress(ref: RefObject<HTMLElement | null>, enabled: boolean, onProgress: (progress: number) => void) {
  const callback = useRef(onProgress);
  useEffect(() => {
    callback.current = onProgress;
  });

  useEffect(() => {
    const section = ref.current;
    if (!section || !enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      callback.current(clamp(-rect.top / travel));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, enabled]);
}

/** Scrolls the page so a runway rests on scene `index` of `last` (used by arrows, chips and swipe). */
export function scrollRunwayTo(section: HTMLElement | null, index: number, last: number) {
  if (!section) return;
  const travel = section.offsetHeight - window.innerHeight;
  const top = section.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top + (index / last) * travel, behavior: "smooth" });
}
