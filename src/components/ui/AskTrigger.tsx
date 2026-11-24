"use client";

import type { ReactNode } from "react";

/** Event the site dock listens for: opens the Ask sheet (WhatsApp, call, Mezbaan) with an optional topic. */
export const ASK_EVENT = "tejjora:ask";

export function openAsk(topic?: string) {
  window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: { topic } }));
}

export function AskTrigger({ topic, className, children, label }: { topic?: string; className?: string; children: ReactNode; label?: string }) {
  return (
    <button type="button" className={className} aria-label={label} aria-haspopup="dialog" onClick={() => openAsk(topic)}>
      {children}
    </button>
  );
}
