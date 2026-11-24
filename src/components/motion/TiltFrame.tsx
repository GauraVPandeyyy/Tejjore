"use client";

/**
 * TiltFrame — a few degrees of pointer-following 3D depth on a photograph (fine pointers only).
 * Pure CSS transforms driven by two custom properties; throttled to one write per animation frame;
 * off for touch input and under reduced motion. No dependencies.
 */
import { useEffect, useRef, type ReactNode } from "react";

export function TiltFrame({ children, className = "", max = 4 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || calm.matches) return undefined;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = el.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        el.style.setProperty("--tilt-x", `${(-y * max).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${(x * max).toFixed(2)}deg`);
      });
    };
    const reset = () => {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", reset);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", reset);
    };
  }, [max]);

  return (
    <div ref={ref} className={`tj-tilt ${className}`.trim()}>
      {children}
    </div>
  );
}

export default TiltFrame;
