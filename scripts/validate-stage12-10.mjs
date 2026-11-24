import fs from "node:fs";

// Visual productisation. Updated in Phase 4/5A: the Stage 12.10 component markers (hero-kicker,
// stay-showcase, experience-gateway…) belonged to components that were replaced; the dead CSS was
// pruned. This now checks the Phase 4 design system: tokens, the ember-as-accent rule, 44 px
// targets, the breakpoint system, reduced motion and balanced braces in both stylesheets.
const globals = fs.readFileSync("src/app/globals.css", "utf8");
const css = fs.readFileSync("src/app/tejjora.css", "utf8");
const doc = fs.readFileSync("docs/STAGE-12.10.md", "utf8");
const required = [
  "--tj-lake: #022d36",
  "--tj-paper: #f8f5ed",
  "--tj-cream: #fbf3cf",
  "--tj-mist: #9fbed2",
  "--tj-sand: #d9a47a",
  "--tj-ember: #ff6437",
  "--tj-ease: cubic-bezier(0.22, 0.61, 0.36, 1)",
  "@media (min-width: 768px)",
  "@media (min-width: 1024px)",
  "@media (prefers-reduced-motion: reduce)",
  "width: 44px",
  "env(safe-area-inset-bottom)",
];
for (const needle of required) {
  if (!css.includes(needle)) throw new Error(`Missing Phase 4 design-system marker: ${needle}`);
}
// Ember is an accent: never a background fill of a pill, circle, panel or section.
for (const match of css.matchAll(/([^{}]+){([^{}]*)}/g)) {
  if (/background(-color)?:\s*var\(--tj-ember\)/.test(match[2]) && !/__dot|dot\b/.test(match[1])) {
    throw new Error(`Ember used as a fill outside an accent dot: ${match[1].trim()}`);
  }
}
if (!doc.includes("No new JS animation library")) throw new Error("Stage 12.10 performance boundary missing");
let blocks = 0;
for (const [name, text] of [["globals.css", globals], ["tejjora.css", css]]) {
  const opens = (text.match(/{/g) || []).length;
  const closes = (text.match(/}/g) || []).length;
  if (opens !== closes) throw new Error(`CSS brace mismatch in ${name}: ${opens} vs ${closes}`);
  blocks += opens;
}
console.log(`Stage 12.10 validator: PASS (Phase 4 tokens, ember accent rule, ${blocks} CSS blocks balanced)`);
