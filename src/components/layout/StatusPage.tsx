import type { ReactNode } from "react";
import { Ornament, Waterline } from "@/components/ui/Waterline";

/** Calm, centred status block for 404, error and route-loading states, in the section grammar. */
export function StatusPage({ eyebrow, title, children, actions, busy = false }: { eyebrow: string; title: string; children?: ReactNode; actions?: ReactNode; busy?: boolean }) {
  return (
    <main className="tj-page tj-status" aria-busy={busy || undefined}>
      <section className="tj-container tj-container--narrow tj-status__inner">
        <Ornament />
        <p className="tj-eyebrow">{eyebrow}</p>
        <h1 className="tj-heading" role={busy ? "status" : undefined}>
          {title}
        </h1>
        {children ? <div className="tj-status__text">{children}</div> : null}
        {actions ? <div className="tj-actions-row">{actions}</div> : null}
      </section>
      <Waterline variant="band" className="tj-status__waterline" />
    </main>
  );
}
