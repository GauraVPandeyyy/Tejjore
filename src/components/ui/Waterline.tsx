/**
 * Tejjora's waterline: three loose strokes echoing the water beneath the boat in the logo, drawn
 * for this site (not traced from any reference). One motif opens and closes every page: the hero,
 * the Waterline Day progress line and the footer. CSS drifts it slowly; reduced motion stills it.
 */
const STROKES = [
  "M0 30 C 90 14, 170 44, 260 28 S 430 12, 520 30 S 690 46, 800 26",
  "M0 52 C 110 40, 190 66, 300 50 S 470 34, 560 52 S 720 64, 800 48",
  "M40 72 C 140 62, 220 84, 320 72 S 480 60, 580 74 S 730 82, 780 70",
];

export function Waterline({ className = "", variant = "hero" }: { className?: string; variant?: "hero" | "footer" | "loader" | "band" }) {
  return (
    <svg className={`tj-waterline tj-waterline--${variant} ${className}`} viewBox="0 0 800 96" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {STROKES.map((d, index) => (
        <path key={d} d={d} pathLength={1} style={{ ["--i" as string]: index }} />
      ))}
    </svg>
  );
}

/** Section ornament: a short waterline with the ember dot (the logo's fruit). Rhythm marker above headings. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg className={`tj-ornament ${className}`} viewBox="0 0 64 20" width="64" height="20" aria-hidden="true" focusable="false">
      <path d="M2 12c6-5 11 4 17-1s11-5 17 0 11 4 17-1 8-3 9-2" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M12 17c5-3 9 2 14-1s9-3 13 0" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".55" />
      <circle cx="47" cy="5" r="2.6" className="tj-ornament__dot" />
    </svg>
  );
}
