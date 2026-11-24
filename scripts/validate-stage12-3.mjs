import fs from "node:fs";
import path from "node:path";

// Signature scroll experience. Phase 4/5A replaced the Stage 12.3 terrace runway with the
// masterplan §5 Waterline Day; Phase 6.5 (owner request) made it a pinned scroll story on every
// width. This checks the safeguards of that design: one DOM tree, a sticky one-viewport stage on a
// capped runway, progress from passive page scroll only (nothing trapped or hijacked), chips and
// arrows always available as the alternative, a skip link, a reduced-motion step mode without a
// runway, and the illustrative disclosure.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];
const day = read("src/components/home/WaterlineDay.tsx");
const css = read("src/app/tejjora.css");

if (!day.includes('"(prefers-reduced-motion: reduce)"') || !day.includes('data-mode={story ? "story" : "steps"}')) errors.push("Reduced motion must switch the Waterline Day to step mode");
if (!day.includes("{ passive: true }")) errors.push("Scroll progress must use a passive listener");
if (/preventDefault\(\)|addEventListener\("(wheel|touchmove)"/.test(day)) errors.push("Waterline Day must not cancel or hijack scroll input");
if (!day.includes('aria-pressed={index === active}') || !day.includes('label="Next time of day"')) errors.push("Time chips and circle arrows must always be available");
if (!day.includes('href="#after-waterline-day"')) errors.push("A skip link past the scroll story is required");
if (!day.includes("Illustrative") || !day.includes("not a photograph of the hotel")) errors.push("Illustrative frames must be labelled as illustrations");
if ((day.match(/<section/g) || []).length !== 1) errors.push("Waterline Day must use one DOM tree");

const runways = [...css.matchAll(/\.tj-waterline-day\[data-mode="story"\]\s*{\s*height:\s*(\d+)svh/g)].map((match) => Number(match[1]));
if (!runways.length) errors.push("Story-mode runway missing");
if (runways.some((value) => value > 320)) errors.push("Runway above the 320svh cap (one viewport plus ~55svh per scene change)");
const sticky = css.match(/\.tj-waterline-day\[data-mode="story"\] \.tj-waterline-day__stage\s*{([^}]*)}/);
if (!sticky || !/position:\s*sticky/.test(sticky[1]) || !/height:\s*100svh/.test(sticky[1])) errors.push("Story stage must be sticky and exactly one viewport tall");
if (/\.tj-waterline-day\[data-mode="steps"\]\s*{\s*height:/.test(css)) errors.push("Step mode (reduced motion) must not have a runway");
if (!css.includes("@media (prefers-reduced-motion: reduce)")) errors.push("Reduced-motion treatment missing");

if (errors.length) {
  console.error("Stage 12.3 validation FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Stage 12.3 validation: PASS (Waterline Day pinned story: runways ${runways.join("/")}svh ≤ 320, sticky 100svh stage, passive scroll, chips + arrows + skip link, reduced-motion steps, illustrative label)`);
