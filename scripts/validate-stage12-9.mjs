import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/lib/concierge/hybridProvider.ts",
  "src/lib/concierge/dateParser.ts",
  "src/lib/concierge/provider.ts",
  "src/lib/concierge/index.ts",
  "src/app/api/concierge/route.ts",
  "src/components/concierge/ConciergeLauncher.tsx",
  "src/data/concierge.ts",
  "docs/STAGE-12.9.md"
];
for (const file of required) await stat(path.join(root, file));

const hybrid = await readFile(path.join(root, "src/lib/concierge/hybridProvider.ts"), "utf8");
const launcher = await readFile(path.join(root, "src/components/concierge/ConciergeLauncher.tsx"), "utf8");
const index = await readFile(path.join(root, "src/lib/concierge/index.ts"), "utf8");
const data = await readFile(path.join(root, "src/data/concierge.ts"), "utf8");

for (const marker of [
  "searchAvailability",
  "effectiveRoomRate",
  "readBookingStore",
  "availability-development",
  "live-rates",
  "room-comparison",
  "booking-status-privacy",
  "extractStayDates",
]) {
  if (!hybrid.includes(marker)) throw new Error(`Missing Stage 12.9 concierge marker: ${marker}`);
}

if (!index.includes("hybridConciergeProvider")) throw new Error("Hybrid concierge is not the default provider.");
if (!launcher.includes("Current website data") || !launcher.includes("Hotel knowledge")) throw new Error("Concierge data provenance is not surfaced in the UI.");
if (!launcher.includes('usePathname')) throw new Error("Concierge launcher pathname dependency is not imported.");
if (!data.includes("Current room rates") || !data.includes("Check availability") || !data.includes("Compare rooms")) throw new Error("Operational quick prompts are incomplete.");
if (/development inventory shows:|development inventory.*available/i.test(hybrid)) throw new Error("Development inventory must not be presented as real availability.");

console.log("Stage 12.9 validator: PASS");
