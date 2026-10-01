import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];
const required = [
  "src/components/location/GoogleMapExperience.tsx",
  "src/lib/reviews/provider.ts",
  "src/types/reviews.ts",
  "docs/STAGE-12.4.md",
];
for (const file of required) if (!exists(file)) errors.push(`Missing ${file}`);

const location = read("src/components/location/LocationExperience.tsx");
const map = read("src/components/location/GoogleMapExperience.tsx");
const reviews = read("src/components/reviews/ReviewsSection.tsx");
const provider = read("src/lib/reviews/provider.ts");
const env = read(".env.example");

if (!location.includes("<GoogleMapExperience")) errors.push("Location page still lacks the real map component");
if (location.includes("location-experience__map-grid")) errors.push("Old artificial map graphic still mounted");
for (const needle of ["NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY", "www.google.com/maps/embed/v1/place", "strict-origin-when-cross-origin"]) {
  if (!map.includes(needle)) errors.push(`Map integration missing ${needle}`);
}
for (const needle of ["GOOGLE_PLACES_API_KEY", "GOOGLE_PLACE_ID", "places.googleapis.com/v1/places/", "rating,userRatingCount,reviews,googleMapsUri"]) {
  if (!provider.includes(needle)) errors.push(`Google review provider missing ${needle}`);
}
if (!reviews.includes("getReviewFeed") || !reviews.includes("View this review on Google Maps")) errors.push("Review presentation missing live provider/source review link");
for (const phrase of ["production Maps Embed API key", "production Google Places credentials"]) {
  if (map.includes(phrase) || reviews.includes(phrase)) errors.push(`Developer-facing integration copy leaked to public UI: ${phrase}`);
}

for (const key of ["NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY", "NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID", "GOOGLE_PLACES_API_KEY", "GOOGLE_PLACE_ID"]) {
  if (!env.includes(key)) errors.push(`.env.example missing ${key}`);
}

if (errors.length) {
  console.error("Stage 12.4 validation FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("Stage 12.4 validation: PASS");
