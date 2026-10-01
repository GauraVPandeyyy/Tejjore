import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/data/hotel.ts",
  "src/data/rooms.ts",
  "src/data/assets.ts",
  "src/data/experience.ts",
  "src/data/virtualTour.ts",
  "src/lib/booking/providers.ts",
  "src/app/globals.css",
];

const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error("Missing required foundation files:\n" + missing.join("\n"));
  process.exit(1);
}

const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
for (const token of ["--ink", "--ivory", "--lake-deep", "--ease-waterline"]) {
  if (!css.includes(token)) {
    console.error(`Missing design token: ${token}`);
    process.exit(1);
  }
}

console.log("Stage 1 foundation config validation passed.");
