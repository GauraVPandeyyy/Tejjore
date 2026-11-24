"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * One motion vocabulary (masterplan §2.4): text and blocks rise 12 px and fade in 480 ms on one
 * easing curve; images open with a 600 ms clip. Server and client render the same markup (no
 * hydration mismatch); reduced motion is enforced in CSS, where [data-reveal] is always shown, and
 * a <noscript> rule in the root layout keeps it visible without JavaScript.
 */
export const EASE = [0.22, 0.61, 0.36, 1] as const;

type RevealTag = "div" | "li" | "article" | "figure";

export function Reveal({ children, className, delay = 0, as = "div" }: { children: ReactNode; className?: string; delay?: number; as?: RevealTag }) {
  const Component = motion[as];
  return (
    <Component
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.48, ease: EASE, delay }}
    >
      {children}
    </Component>
  );
}

/** Clip reveal for images: the mask opens upward. */
export function ClipReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ clipPath: "inset(14% 0 0 0)", opacity: 0.5 }}
      whileInView={{ clipPath: "inset(0% 0 0 0)", opacity: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
