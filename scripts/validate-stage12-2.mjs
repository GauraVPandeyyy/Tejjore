import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];
const mustExist = [
  "src/app/experience/page.tsx",
  "src/app/location/page.tsx",
  "src/app/plan-your-stay/page.tsx",
  "src/components/hotel/ExperienceGateway.tsx",
  "src/components/location/LocationPreview.tsx",
  "docs/STAGE-12.2.md",
];
for (const file of mustExist) if (!exists(file)) errors.push(`Missing ${file}`);

const home = read("src/app/page.tsx");
for (const wanted of ["HeroExperience", "HotelStory", "TerraceExperience", "RoomShowcase", "ExperienceGateway", "ReviewsSection", "LocationPreview", "FinalInvitation"]) {
  if (!home.includes(wanted)) errors.push(`Homepage missing ${wanted}`);
}
for (const removed of ["RoomComparison", "RestaurantExperience", "DayAtTejjora", "WhyTejjora", "PlanMyStay", "LocationExperience", "GalleryExperience", "DirectStayBanner", "VirtualTourPreview"]) {
  if (home.includes(removed)) errors.push(`Homepage still includes full ${removed}`);
}

const nav = read("src/data/navigation.ts");
for (const route of ["/rooms", "/experience", "/location", "/plan-your-stay", "/virtual-tour", "/experience#restaurant"]) {
  if (!nav.includes(route)) errors.push(`Navigation missing ${route}`);
}

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, "src"));
const stale = ["/#restaurant", "/#plan-my-stay", "/#location", "/#explore"];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const value of stale) {
    if (text.includes(value)) errors.push(`Stale IA link ${value} in ${path.relative(root, file)}`);
  }
}

if (errors.length) {
  console.error("Stage 12.2 validation FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Stage 12.2 validation PASS — ${sourceFiles.length} TS/TSX source files scanned`);
