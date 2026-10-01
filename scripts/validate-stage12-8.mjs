import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/app/admin/page.tsx",
  "src/app/admin/login/page.tsx",
  "src/components/admin/AdminLogin.tsx",
  "src/components/admin/AdminDashboard.tsx",
  "src/lib/admin/auth.ts",
  "src/lib/admin/operations.ts",
  "src/app/api/admin/overview/route.ts",
  "src/app/api/admin/auth/login/route.ts",
  "src/app/api/admin/auth/logout/route.ts",
  "src/app/api/admin/reservations/[reference]/route.ts",
  "src/app/api/admin/rooms/[roomId]/route.ts",
  "src/app/api/admin/inventory/blocks/route.ts",
  "src/app/api/admin/inventory/overrides/route.ts",
  "docs/STAGE-12.8.md"
];
for (const file of required) await stat(path.join(root, file));
const auth = await readFile(path.join(root, "src/lib/admin/auth.ts"), "utf8");
const dashboard = await readFile(path.join(root, "src/components/admin/AdminDashboard.tsx"), "utf8");
const store = await readFile(path.join(root, "src/lib/booking/store.ts"), "utf8");
const inventory = await readFile(path.join(root, "src/lib/booking/inventory.ts"), "utf8");
const reservation = await readFile(path.join(root, "src/lib/booking/reservations.ts"), "utf8");
const env = await readFile(path.join(root, ".env.example"), "utf8");
if (!auth.includes("httpOnly: true") || !auth.includes("sameSite: \"lax\"") || !auth.includes("ADMIN_SESSION_SECRET") || !auth.includes("scryptSync")) throw new Error("Admin auth safeguards are incomplete.");
if (/password\s*=\s*["'][^"']+["']/.test(auth)) throw new Error("Potential hard-coded admin password detected.");
if (!dashboard.includes("Availability & Rates") || !dashboard.includes("Reservations") || !dashboard.includes("Payments")) throw new Error("Operational modules are incomplete.");
if (!store.includes("operations?: HotelOperationsConfig")) throw new Error("Operational configuration is not persisted.");
if (!inventory.includes("effectiveRoomTotal") || !inventory.includes("stayNightlyRates")) throw new Error("Public inventory is not wired to operations configuration.");
if (!reservation.includes("stayNightlyRates")) throw new Error("Reservation pricing is not wired to operational rates.");
if (!env.includes("ADMIN_USERS_JSON") || !env.includes("ADMIN_SESSION_SECRET")) throw new Error("Admin environment configuration is undocumented.");
console.log("Stage 12.8 validator: PASS");
