/** Concierge identity, used by the launcher, the dock, the panel and Ask sheets. */
export const CONCIERGE_NAME = "Mezbaan";
/** What the name means and does, for labels and screen readers. */
export const CONCIERGE_ROLE = "Tejjora's AI host";

/**
 * Mezbaan's mark, drawn for this site (no image asset, no external dependency): a Lucknowi cusped
 * arch, the lake's waterline inside it, and an ember spark at its heart for the AI. Strokes use
 * currentColor; the spark uses the ember accent. Decorative unless `title` is passed.
 */
export function ConciergeMark({ size = 28, title, className }: { size?: number; title?: string; className?: string }) {
  return (
    <svg
      className={`tj-ai-mark${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {/* Cusped arch: three lobes rising to a point, as on Lucknow's gateways. */}
      <path
        className="tj-ai-mark__arch"
        strokeWidth="1.7"
        d="M10.5 41V24.5c0-2.4 1.2-4.3 3.1-5.1-.2-2.6 1.2-4.8 3.6-5.6.9-2.6 3.4-4.6 6.8-6.3 3.4 1.7 5.9 3.7 6.8 6.3 2.4.8 3.8 3 3.6 5.6 1.9.8 3.1 2.7 3.1 5.1V41"
      />
      <path strokeWidth="1.7" d="M7.5 41h33" />
      {/* Waterline: the lake inside the arch. */}
      <path className="tj-ai-mark__wave" strokeWidth="1.5" d="M14.5 31.5c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.1-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.1 1.2" />
      <path className="tj-ai-mark__wave tj-ai-mark__wave--far" strokeWidth="1.3" opacity="0.55" d="M17 36.2c1.4 0 1.4-1 2.8-1s1.4 1 2.8 1 1.4-1 2.8-1 1.4 1 2.8 1 1.4-1 2.8-1" />
      {/* The spark: Mezbaan's attention. */}
      <path
        className="tj-ai-mark__spark"
        fill="var(--tj-ember, #ff6437)"
        stroke="none"
        d="M24 15.2c.42 2.7 1.93 4.2 4.6 4.62-2.67.42-4.18 1.93-4.6 4.62-.42-2.69-1.93-4.2-4.6-4.62 2.67-.42 4.18-1.92 4.6-4.62Z"
      />
    </svg>
  );
}
