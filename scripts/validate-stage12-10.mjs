import fs from "node:fs";

const css = fs.readFileSync("src/app/globals.css", "utf8");
const doc = fs.readFileSync("docs/STAGE-12.10.md", "utf8");
const required = [
  "Stage 12.10 — Premium visual productization",
  "--shadow-media",
  ".hero-kicker::before",
  ".stay-showcase__room-tab[data-active=\"true\"]::after",
  ".experience-gateway__card:nth-child(2)",
  ".reviews-section__score > span",
  ".booking-summary::before",
  "@media (min-width: 900px) and (max-height: 850px)",
  "@media (max-width: 820px)",
  "@media (prefers-reduced-motion: reduce)",
];
for (const needle of required) {
  if (!css.includes(needle)) throw new Error(`Missing Stage 12.10 CSS marker: ${needle}`);
}
if (!doc.includes("No new JS animation library")) throw new Error("Stage 12.10 performance boundary missing");
const opens = (css.match(/{/g) || []).length;
const closes = (css.match(/}/g) || []).length;
if (opens !== closes) throw new Error(`CSS brace mismatch: ${opens} vs ${closes}`);
console.log(`Stage 12.10 validator: PASS (${opens} CSS blocks balanced)`);
