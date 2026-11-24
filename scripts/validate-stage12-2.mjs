import fs from "node:fs";
import path from "node:path";

// Information architecture and home composition. Updated in Phase 4/5A: the Stage 12.2 home
// (HeroExperience, RoomShowcase, ExperienceGateway, LocationPreview) was replaced by the masterplan
// §4 home — 9 core blocks + 2 conditional — so this checks the new composition and the same IA rules.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];
const mustExist = [
  "src/app/experience/page.tsx",
  "src/app/location/page.tsx",
  "src/app/plan-your-stay/page.tsx",
  "src/app/rooms/[slug]/page.tsx",
  "src/app/dining/menu/page.tsx",
  "src/components/home/HomeHero.tsx",
  "src/components/home/HomeSections.tsx",
  "src/components/home/WaterlineDay.tsx",
  "docs/STAGE-12.2.md",
];
for (const file of mustExist) if (!exists(file)) errors.push(`Missing ${file}`);

const home = read("src/app/page.tsx");
const order = ["HomeHero", "HomeStory", "HomeRooms", "WaterlineDay", "HomeImpressions", "HomeDining", "HomeOffers", "ReviewsSection", "HomeExplore", "HomeFaq", "HomeInvitation"];
let last = -1;
for (const block of order) {
  const index = home.indexOf(`<${block}`);
  if (index === -1) errors.push(`Homepage missing ${block}`);
  else if (index < last) errors.push(`Homepage block out of order: ${block}`);
  else last = index;
}
for (const removed of ["RoomComparison", "RestaurantExperience", "DayAtTejjora", "WhyTejjora", "PlanMyStay", "LocationExperience", "GalleryExperience", "DirectStayBanner", "VirtualTourPreview", "HeroExperience"]) {
  if (home.includes(removed)) errors.push(`Homepage still includes full ${removed}`);
}

const nav = read("src/data/navigation.ts");
for (const route of ["/rooms", "/dining", "/dining/menu", "/experience", "/location", "/plan-your-stay", "/virtual-tour", "/gallery"]) {
  if (!nav.includes(`"${route}"`)) errors.push(`Navigation missing ${route}`);
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
const stale = ["/#restaurant", "/#plan-my-stay", "/#location", "/#explore", "/rooms#"];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const value of stale) {
    if (text.includes(`"${value}`) || text.includes(`\`${value}`)) errors.push(`Stale IA link ${value} in ${path.relative(root, file)}`);
  }
}

if (errors.length) {
  console.error("Stage 12.2 validation FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Stage 12.2 validation PASS — home composition + IA, ${sourceFiles.length} TS/TSX source files scanned`);
