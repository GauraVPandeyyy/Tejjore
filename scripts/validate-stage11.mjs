import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/components/virtual-tour/MarzipanoViewer.tsx",
  "src/components/virtual-tour/VirtualTourExperience.tsx",
  "src/components/virtual-tour/TourControls.tsx",
  "src/components/virtual-tour/TourSceneRail.tsx",
  "src/app/virtual-tour/page.tsx",
  "src/data/virtualTour.ts",
  "src/types/marzipano.d.ts",
  "docs/STAGE-11.md",
  "public/panoramas/README.md",
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing Stage 11 file: ${relative}`);
  }
}

const data = fs.readFileSync(path.join(root, "src/data/virtualTour.ts"), "utf8");
const viewer = fs.readFileSync(path.join(root, "src/components/virtual-tour/MarzipanoViewer.tsx"), "utf8");
const experience = fs.readFileSync(path.join(root, "src/components/virtual-tour/VirtualTourExperience.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "src/app/virtual-tour/page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

for (const scene of ["entrance", "reception", "lobby", "corridor", "deluxe", "super-deluxe", "premium", "restaurant", "lake-view"]) {
  if (!data.includes(`id: "${scene}"`)) throw new Error(`Missing virtual-tour scene: ${scene}`);
}

for (const contract of [
  'await import("marzipano")',
  "Marzipano.ImageUrlSource.fromString",
  "Marzipano.EquirectGeometry",
  "Marzipano.RectilinearView",
  "panoramaReady",
  "hotspotContainer().createHotspot",
]) {
  if (!(viewer + data).includes(contract)) throw new Error(`Missing Marzipano contract: ${contract}`);
}

for (const requirement of ["TourSceneRail", "Check this room", "Full screen", "STILL PREVIEW"]) {
  if (!(experience + viewer + fs.readFileSync(path.join(root, "src/components/virtual-tour/TourControls.tsx"), "utf8")).includes(requirement)) {
    throw new Error(`Missing Stage 11 UX requirement: ${requirement}`);
  }
}

if (!page.includes("virtualTourSceneIds.includes")) throw new Error("Virtual tour deep-link validation is missing.");

// All panoramas are currently pending. The code must not claim that missing files are ready.
const readyTrue = (data.match(/panoramaReady:\s*true/g) ?? []).length;
if (readyTrue !== 0) throw new Error("A panorama was marked ready without a supplied verified 360 asset.");

let depth = 0;
for (const char of css) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  if (depth < 0) break;
}
if (depth !== 0) throw new Error("Stage 11 validation failed: CSS braces are unbalanced.");

if (/fake 360|simulated panorama/i.test(viewer + experience)) {
  throw new Error("Virtual-tour UI must not describe still imagery as a fake/simulated panorama.");
}

console.log("Stage 11 virtual tour validation: PASS");
