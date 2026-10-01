import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/components/concierge/ConciergeLauncher.tsx",
  "src/app/api/concierge/route.ts",
  "src/data/concierge.ts",
  "src/lib/concierge/provider.ts",
  "src/lib/concierge/knowledge.ts",
  "src/lib/concierge/ruleBasedProvider.ts",
  "src/lib/concierge/index.ts",
  "docs/STAGE-10.md",
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing Stage 10 file: ${relative}`);
  }
}

const shell = fs.readFileSync(path.join(root, "src/components/layout/SiteShell.tsx"), "utf8");
if (!shell.includes("<ConciergeLauncher />")) throw new Error("Concierge launcher is not mounted globally.");

const knowledge = fs.readFileSync(path.join(root, "src/lib/concierge/knowledge.ts"), "utf8");
for (const safeguard of ["I do not have a confirmed pet policy", "will not invent unconfigured inclusions", "will not invent a live travel time", "Room-specific lake views have not been confirmed"]) {
  if (!knowledge.includes(safeguard)) throw new Error(`Missing concierge truth safeguard: ${safeguard}`);
}

const analytics = fs.readFileSync(path.join(root, "src/lib/analytics/track.ts"), "utf8");
for (const event of ["ai_open", "ai_message"]) {
  if (!analytics.includes(`\"${event}\"`)) throw new Error(`Missing analytics event: ${event}`);
}

console.log("Stage 10 validation: PASS");
