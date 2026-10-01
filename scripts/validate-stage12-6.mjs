import fs from "node:fs";
import path from "node:path";
const root=process.cwd(); const errors=[];
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const must=f=>{if(!fs.existsSync(path.join(root,f))) errors.push(`Missing ${f}`)};
[
"src/data/commerce.ts","src/lib/booking/pricing.ts","src/lib/booking/store.ts","src/lib/booking/inventory.ts","src/lib/booking/reservations.ts","src/app/api/availability/route.ts","src/app/api/reservations/route.ts"
].forEach(must);
const commerce=read("src/data/commerce.ts");
for(const needle of ['deluxe: 2000','"super-deluxe": 2500','premium: 3500','NEXT_PUBLIC_TAX_CONFIGURED','developmentInventory']) if(!commerce.includes(needle)) errors.push(`commerce config missing ${needle}`);
const reservation=read("src/lib/booking/reservations.ts");
if(!reservation.includes('payment_pending')||!(reservation.includes('availableRoomsOnDate')||reservation.includes('configuredTotal')||reservation.includes('effectiveRoomTotal'))) errors.push("reservation lifecycle/inventory recheck missing");
const store=read("src/lib/booking/store.ts");
if(!store.includes('rename(temp, target)')) errors.push("atomic JSON store write missing");
const ui=read("src/components/booking/BookingExperience.tsx");
for(const needle of ['websiteInventoryProvider.search','Hold room & continue to payment','Configured total','Development inventory is active']) if(!ui.includes(needle)) errors.push(`booking UI missing ${needle}`);
if(errors.length){console.error("Stage 12.6 validation FAILED");errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log("Stage 12.6 validation: PASS");
