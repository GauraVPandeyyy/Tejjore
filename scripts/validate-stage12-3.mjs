import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];
const hero = read("src/components/hero/HeroExperience.tsx");
const terrace = read("src/components/hotel/TerraceExperience.tsx");
const css = read("src/app/globals.css");

if (hero.includes("window.innerWidth < 820) {\n        setProgress(0)")) errors.push("Hero still disables scroll progress on mobile");
for (const token of ["--hero-desktop-clip-top", "--hero-mobile-clip-top", "--hero-mobile-clip-bottom"]) {
  if (!hero.includes(token)) errors.push(`Hero missing responsive motion variable ${token}`);
}
for (const token of ["terrace-scroll__mobile-sticky", "terrace-scroll__mobile-image-layer", "terrace-scroll__mobile-timeline", "terrace-scroll__mobile-fallback"]) {
  if (!terrace.includes(token) && !css.includes(token)) errors.push(`Missing mobile terrace motion token ${token}`);
}
if (terrace.includes("REAL FOUR-TIME SEQUENCE TO REPLACE PLACEHOLDERS")) errors.push("Developer-facing terrace placeholder copy still public");
if (!css.includes("height: 360svh") || !css.includes("position: sticky")) errors.push("Mobile terrace sticky scroll runway missing");
if (!css.includes("prefers-reduced-motion: reduce") || !css.includes("terrace-scroll__mobile-fallback")) errors.push("Reduced-motion terrace fallback missing");

if (errors.length) {
  console.error("Stage 12.3 validation FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Stage 12.3 validation: PASS");
