import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "public/brand/tejjora-logo.png",
  "public/brand/tejjora-mark.png",
  "src/app/icon.png",
  "src/components/layout/Wordmark.tsx",
  "docs/STAGE-12.1.md",
];

for (const file of required) {
  if (!existsSync(join(root, file))) throw new Error(`Missing Stage 12.1 file: ${file}`);
}

const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
for (const token of ["--section-y-xl", "--section-gap-lg", "--page-top", "--brand-cream", "--brand-orange"]) {
  if (!css.includes(token)) throw new Error(`Missing density/brand token: ${token}`);
}
if (!css.includes("STAGE 12.1 — DESIGN DENSITY + OFFICIAL BRAND RESET")) throw new Error("Missing Stage 12.1 CSS layer");
if (!css.includes("max-height: 850px")) throw new Error("Missing shorter-laptop density tuning");

const wordmark = readFileSync(join(root, "src/components/layout/Wordmark.tsx"), "utf8");
if (!wordmark.includes("/brand/tejjora-mark.png")) throw new Error("Header does not use official mark");

const footer = readFileSync(join(root, "src/components/layout/SiteFooter.tsx"), "utf8");
if (!footer.includes("/brand/tejjora-logo.png")) throw new Error("Footer does not use official full logo");

const booking = readFileSync(join(root, "src/components/booking/BookingExperience.tsx"), "utf8");
if (!booking.includes("booking-brand") || !booking.includes("/brand/tejjora-mark.png")) throw new Error("Booking flow missing official identity treatment");

console.log("Stage 12.1 validation: PASS");
