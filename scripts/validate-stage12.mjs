import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/app/arrival/page.tsx",
  "src/components/arrival/ArrivalDashboard.tsx",
  "src/data/arrival.ts",
  "src/types/arrival.ts",
  "src/lib/arrival/providers.ts",
  "docs/STAGE-12.md",
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing Stage 12 file: ${relative}`);
  }
}

const page = fs.readFileSync(path.join(root, "src/app/arrival/page.tsx"), "utf8");
const ui = fs.readFileSync(path.join(root, "src/components/arrival/ArrivalDashboard.tsx"), "utf8");
const data = fs.readFileSync(path.join(root, "src/data/arrival.ts"), "utf8");
const providers = fs.readFileSync(path.join(root, "src/lib/arrival/providers.ts"), "utf8");
const concierge = fs.readFileSync(path.join(root, "src/components/concierge/ConciergeLauncher.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");

if (/implemented in Stage 12/i.test(page)) throw new Error("Arrival placeholder copy still present.");
if (!page.includes("index: false") || !page.includes("follow: false")) throw new Error("Arrival route must remain noindex/nofollow in this stage.");

for (const tab of ["arrival", "stay", "dining", "explore", "help"]) {
  if (!data.includes(`id: \"${tab}\"`)) throw new Error(`Missing Smart Arrival tab: ${tab}`);
}

for (const requirement of [
  "Navigate to Tejjora",
  "Call the hotel",
  "WhatsApp Tejjora",
  "Special request",
  "Ask Tejjora Concierge",
  "No booking details loaded.",
  "DEMO / NOT A LIVE BOOKING",
]) {
  if (!ui.includes(requirement)) throw new Error(`Missing Stage 12 UX requirement: ${requirement}`);
}

if (!ui.includes('searchParams.get("demo") === "1"')) throw new Error("Demo stay must be explicitly gated by ?demo=1.");
if (!data.includes('reference: "DEMO-STAY"')) throw new Error("Development demo stay is missing its non-live reference.");
if (!providers.includes("unlinkedArrivalStayProvider")) throw new Error("Current no-persistence arrival provider is missing.");
if (!concierge.includes("tejjora:concierge-open")) throw new Error("Smart Arrival concierge handoff is not wired.");

if (/localStorage|sessionStorage/.test(ui)) throw new Error("Smart Arrival must not persist guest/stay data in browser storage.");
if (/flight.*(on time|delayed|landed)|transfer.*(arriving|confirmed)/i.test(ui)) {
  throw new Error("Smart Arrival must not invent live travel/transfer status.");
}

let depth = 0;
for (const char of css) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  if (depth < 0) break;
}
if (depth !== 0) throw new Error("Stage 12 validation failed: CSS braces are unbalanced.");

console.log("Stage 12 Smart Arrival validation: PASS");
