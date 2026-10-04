import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];

const requiredFiles = [
  "src/app/manage-booking/page.tsx",
  "src/components/booking/ManageBooking.tsx",
  "src/app/api/reservations/retrieve/route.ts",
  "src/lib/booking/access.ts",
  "src/lib/booking/public.ts",
  "src/lib/booking/capacity.ts",
  "src/lib/security/rateLimit.ts",
  "src/lib/booking/validation.ts",
  "src/app/api/payments/order/route.ts",
  "src/app/api/payments/verify/route.ts",
  "src/app/api/payments/webhook/route.ts",
];
for (const file of requiredFiles) if (!exists(file)) errors.push(`Missing required final-audit file: ${file}`);

const bookingTypes = read("src/types/booking.ts");
const reservations = read("src/lib/booking/reservations.ts");
const store = read("src/lib/booking/store.ts");
const validation = read("src/lib/booking/validation.ts");
const orderRoute = read("src/app/api/payments/order/route.ts");
const verifyRoute = read("src/app/api/payments/verify/route.ts");
const webhook = read("src/app/api/payments/webhook/route.ts");
const retrieve = read("src/app/api/reservations/retrieve/route.ts");
const availability = read("src/app/api/availability/route.ts");
const adminOps = read("src/lib/admin/operations.ts");
const manage = read("src/components/booking/ManageBooking.tsx");
const experience = read("src/components/booking/BookingExperience.tsx");
const concierge = read("src/lib/concierge/hybridProvider.ts");
const commerce = read("src/data/commerce.ts");
const pricing = read("src/lib/booking/pricing.ts");

for (const [label, haystack, needles] of [
  ["reservation state", bookingTypes, ["payment_review", "PublicReservationView", "accessTokenHash"]],
  ["secure reservation access", reservations, ["hashReservationAccessToken", "guestCredentialsMatch", "activeGuestHoldCount", "applyVerifiedPaymentToStore"]],
  ["safe booking store", store, ["ENOENT", "acquireStoreLock", "0o600", "0o700"]],
  ["booking payload validation", validation, ["validateStayDates", "30 nights", "next 12 months", "validIsoDate"]],
  ["atomic payment order", orderRoute, ["withBookingStore", "reservationAccessMatches", "paymentOrderId", "HOLD_EXPIRED"]],
  ["payment verification", verifyRoute, ["reservationAccessMatches", "verifyRazorpaySignature", "settleVerifiedPayment"]],
  ["webhook reconciliation", webhook, ["verifyWebhookSignature", "payment_review", "processedWebhookIds", "Reservation is not available for webhook reconciliation yet"]],
  ["secure retrieval", retrieve, ["reference", "email", "phone", "retrieveReservationWithCredentials", "Cache-Control"]],
  ["public availability", availability, ["roomId, available, baseRate, nightlyRates"]],
  ["admin capacity guards", adminOps, ["requiredInventory", "availableRoomsOnDate", "validIsoDate", "paymentReviews"]],
  ["manage booking", manage, ["Booking email", "Booking phone", "accessToken", "startPayment"]],
  ["booking success", experience, ["Manage booking", "promoCode", "Hold room & continue to payment"]],
  ["concierge current-data guardrails", concierge, ["validateStayDates", "Manage booking", "availability-development", "live-rates"]],
  ["commercial configuration", commerce, ["NEXT_PUBLIC_RATE_PLAN_CONFIG_JSON", "NEXT_PUBLIC_ADDON_CONFIG_JSON", "PROMO_CODES_JSON", "includedAdultsPerRoom"]],
  ["pricing engine", pricing, ["extraGuestCharge", "childrenCharge", "Promotional code is invalid", "discount"]],
]) {
  for (const needle of needles) if (!haystack.includes(needle)) errors.push(`${label} missing marker: ${needle}`);
}

// The public availability API may expose sellable count and current price, but never the
// internal booked/held/blocked accounting that belongs in staff operations.
const availabilityReturn = availability.slice(availability.indexOf("const rooms ="));
for (const forbidden of ["booked", "held", "blocked", "total:"]) {
  if (availabilityReturn.includes(forbidden)) errors.push(`Public availability leaks internal inventory field: ${forbidden}`);
}

// Payment endpoints must always bind privileged payment actions to the per-reservation token.
if (!orderRoute.includes("accessToken") || !verifyRoute.includes("accessToken")) errors.push("Payment routes are missing reservation access-token checks.");
if (/getReservation\([^)]*\)[\s\S]{0,1000}createPaymentOrder/.test(orderRoute)) errors.push("Payment order creation appears to happen outside the atomic booking-store transaction.");

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(srcRoot);

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (/<img\b/i.test(text)) errors.push(`Raw <img> remains in ${path.relative(root, file)}`);
  if (/Coming Soon/i.test(text)) errors.push(`Public/prototype Coming Soon copy remains in ${path.relative(root, file)}`);
}

const requiredPages = new Set([
  "/", "/rooms", "/dining", "/experience", "/offers", "/gallery", "/location", "/plan-your-stay", "/virtual-tour", "/book", "/contact", "/policies", "/arrival", "/manage-booking", "/admin", "/admin/login",
]);
function routeForPage(file) {
  const relative = path.relative(path.join(root, "src/app"), file).replaceAll(path.sep, "/");
  if (relative === "page.tsx") return "/";
  const route = relative.replace(/\/page\.tsx$/, "");
  return route ? `/${route}` : "/";
}
const pageRoutes = new Set(sourceFiles.filter((file) => file.endsWith(`${path.sep}page.tsx`) && file.includes(`${path.sep}app${path.sep}`)).map(routeForPage));
for (const route of requiredPages) if (!pageRoutes.has(route)) errors.push(`Required application route is missing: ${route}`);

// Check explicit internal hrefs and action hrefs against the application route surface.
const knownPublicPrefixes = new Set(["/", "/rooms", "/dining", "/experience", "/offers", "/gallery", "/location", "/plan-your-stay", "/virtual-tour", "/book", "/contact", "/policies", "/arrival", "/manage-booking", "/admin", "/admin/login"]);
const internalRefs = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:href\s*=\s*["']|href:\s*["'])(\/[A-Za-z0-9_\-/?#=&.]*)/g)) internalRefs.add(match[1]);
}
for (const ref of internalRefs) {
  const pathname = ref.split(/[?#]/)[0] || "/";
  if (![...knownPublicPrefixes].some((route) => pathname === route || (route !== "/" && pathname.startsWith(`${route}/`)))) {
    errors.push(`Static internal navigation target has no known route: ${ref}`);
  }
}

// Validate every literal public asset reference. The only intentionally absent assets are
// the nine real-property 360 files, and those scenes must stay panoramaReady:false.
const assetRefs = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/["'`](\/(?:images|brand|panoramas|videos)\/[^"'`?${}]*)/g)) assetRefs.add(match[1]);
}
const expectedPendingPanoramas = new Set([
  "/panoramas/entrance.jpg", "/panoramas/reception.jpg", "/panoramas/lobby.jpg", "/panoramas/corridor.jpg", "/panoramas/deluxe.jpg", "/panoramas/super-deluxe.jpg", "/panoramas/premium.jpg", "/panoramas/restaurant.jpg", "/panoramas/lake-view.jpg",
]);
for (const asset of assetRefs) {
  const file = path.join(root, "public", asset.slice(1));
  if (!fs.existsSync(file) && !expectedPendingPanoramas.has(asset)) errors.push(`Missing referenced public asset: ${asset}`);
}
const tour = read("src/data/virtualTour.ts");
const readyTrueCount = (tour.match(/panoramaReady:\s*true/g) || []).length;
const publicReferenceSceneReady = tour.includes('id: "demo-room"') && tour.includes('mediaKind: "development-demo"') && tour.includes('panoramaReady: true');
if (readyTrueCount !== 1 || !publicReferenceSceneReady) errors.push("Only the supplied non-property reference panorama may be marked panoramaReady:true until genuine Tejjora spherical media is supplied.");
for (const asset of expectedPendingPanoramas) if (!assetRefs.has(asset)) errors.push(`Expected replaceable panorama path is no longer centralized: ${asset}`);

// Development 360 media must never become a production property scene.
const demoLab = read("src/components/virtual-tour/PanoramaDemoLab.tsx");
const virtualTourPage = read("src/app/virtual-tour/page.tsx");
if (!virtualTourPage.includes('process.env.NODE_ENV !== "production"') || !virtualTourPage.includes('demoValue === "1"')) errors.push("Development panorama lab is not production-gated.");
if (!demoLab.includes("Not Tejjora property media")) errors.push("Development panorama provenance disclosure is missing.");

const css = read("src/app/globals.css");
if ((css.match(/{/g) || []).length !== (css.match(/}/g) || []).length) errors.push("Global CSS braces are unbalanced.");
if (!css.includes("@media (prefers-reduced-motion: reduce)")) errors.push("Global reduced-motion treatment is missing.");
if (!css.includes(".manage-booking")) errors.push("Manage-booking responsive styling is missing.");

if (errors.length) {
  console.error("Stage 12 final audit validator: FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Stage 12 final audit validator: PASS — ${sourceFiles.length} TS/TSX files, ${pageRoutes.size} page routes, ${assetRefs.size} literal public assets checked.`);
