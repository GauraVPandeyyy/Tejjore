import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const must=[
  "src/app/dining/page.tsx","src/app/experience/page.tsx","src/app/offers/page.tsx","src/app/gallery/page.tsx","src/app/contact/page.tsx","src/app/policies/page.tsx",
  "src/components/home/HomeStoryBlocks.tsx","src/components/dining/DiningPage.tsx","src/components/restaurant/RestaurantExperience.tsx",
  "src/lib/email/provider.ts","src/lib/email/confirmation.ts","src/lib/concierge/languageLayer.ts","src/lib/seo/schema.ts",
  "src/app/sitemap.ts","src/app/robots.ts","src/lib/database/postgres.ts","db/migrations/001_booking_core.sql","docs/MANUAL-SETUP-AND-APIS.md","docs/DEMO-DATA-AND-ASSET-REPLACEMENT.md","docs/V2-CRITICAL-AUDIT.md"
];
const missing=must.filter(f=>!fs.existsSync(path.join(root,f)));
if(missing.length){console.error("Missing V2 files:\n"+missing.join("\n"));process.exit(1)}
const booking=fs.readFileSync(path.join(root,"src/types/booking.ts"),"utf8");
if(!booking.includes('"stay"')||!booking.includes('"room"')||!booking.includes('"checkout"')){console.error("3-step booking type model missing");process.exit(1)}
const nav=fs.readFileSync(path.join(root,"src/data/navigation.ts"),"utf8");
for(const route of ["/dining","/experience","/gallery","/location"]){if(!nav.includes(route)){console.error("Navigation missing "+route);process.exit(1)}}
const vt=fs.readFileSync(path.join(root,"src/data/virtualTour.ts"),"utf8");
if(!vt.includes('id: "demo-room"')||!vt.includes('panoramaReady: true')){console.error("Public reference panorama not active");process.exit(1)}
const env=fs.readFileSync(path.join(root,".env.example"),"utf8");
for(const key of ["DATABASE_URL","RESEND_API_KEY","BOOKING_EMAIL_FROM","OPENAI_API_KEY","OPENAI_CONCIERGE_MODEL","NEXT_PUBLIC_SITE_URL"]){if(!env.includes(key+"=")){console.error("Env example missing "+key);process.exit(1)}}
console.log(`V2 redesign validation PASS (${must.length} required files + IA/booking/panorama/env checks)`);
