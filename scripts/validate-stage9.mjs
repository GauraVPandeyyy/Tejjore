import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/components/planner/PlanMyStay.tsx",
  "src/data/planner.ts",
  "src/lib/planner/rules.ts",
  "src/types/planner.ts",
  "docs/STAGE-9.md",
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Stage 9 missing files:\n" + missing.join("\n"));
  process.exit(1);
}

const home = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
const nav = fs.readFileSync(path.join(root, "src/data/navigation.ts"), "utf8");
const plannerPage = fs.readFileSync(path.join(root, "src/app/plan-your-stay/page.tsx"), "utf8");
const planner = fs.readFileSync(path.join(root, "src/components/planner/PlanMyStay.tsx"), "utf8");
const rules = fs.readFileSync(path.join(root, "src/lib/planner/rules.ts"), "utf8");
const book = fs.readFileSync(path.join(root, "src/app/book/page.tsx"), "utf8");

for (const [name, content, needle] of [
  ["planner route integration", plannerPage, "<PlanMyStay"],
  ["navigation integration", nav, "/plan-your-stay"],
  ["planner anchor", planner, 'id="plan-my-stay"'],
  ["rule engine", rules, "createStayPlan"],
  ["booking rate prefill", book, "ratePlanId"],
  ["booking add-on prefill", book, "addonIds"],
]) {
  if (!content.includes(needle)) {
    console.error(`Stage 9 validation failed: ${name}`);
    process.exit(1);
  }
}

const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
let depth = 0;
for (const char of css) {
  if (char === "{") depth += 1;
  if (char === "}") depth -= 1;
  if (depth < 0) break;
}
if (depth !== 0) {
  console.error("Stage 9 validation failed: CSS braces are unbalanced.");
  process.exit(1);
}

const prohibited = [
  /only \d+ rooms? left/i,
  /instant confirmation/i,
  /guaranteed lowest price/i,
  /live availability confirmed/i,
];
const combined = planner + rules;
for (const pattern of prohibited) {
  if (pattern.test(combined)) {
    console.error(`Stage 9 validation failed: prohibited claim ${pattern}`);
    process.exit(1);
  }
}

console.log("Stage 9 planner integration validation passed.");
