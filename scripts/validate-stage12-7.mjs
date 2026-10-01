import fs from "node:fs";
import path from "node:path";
const root=process.cwd(); const errors=[];
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
for(const f of ["src/lib/payments/razorpay.ts","src/app/api/payments/order/route.ts","src/app/api/payments/verify/route.ts","src/app/api/payments/webhook/route.ts"]) if(!fs.existsSync(path.join(root,f))) errors.push(`Missing ${f}`);
const provider=read("src/lib/payments/razorpay.ts");
for(const needle of ['api.razorpay.com/v1/orders','createHmac("sha256"','RAZORPAY_WEBHOOK_SECRET','BOOKING_PRODUCTION_READY']) if(!provider.includes(needle)) errors.push(`payment provider missing ${needle}`);
const webhook=read("src/app/api/payments/webhook/route.ts");
if(!webhook.includes('x-razorpay-signature')||!webhook.includes('processedWebhookIds')) errors.push("webhook signature/idempotency safeguards missing");
const ui=read("src/components/booking/BookingExperience.tsx");
for(const needle of ['checkout.razorpay.com/v1/checkout.js','Complete test payment','Payment has been verified','/api/payments/verify']) if(!ui.includes(needle)) errors.push(`payment UI missing ${needle}`);
if(errors.length){console.error("Stage 12.7 validation FAILED");errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log("Stage 12.7 validation: PASS");
