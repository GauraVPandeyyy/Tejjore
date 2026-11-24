#!/usr/bin/env node
// Admin smoke check. Phase 3A: roles, revocable sessions, audit view, pagination and masking.
// Phase 3B/3C: CMS modules (save -> public page, validation errors, media upload, restaurant,
// AI preview, sessions), also at tablet and mobile widths. Content runs on the dev-only in-memory
// PGlite database (TEJJORA_QA_CONTENT_DB=pglite); media goes to public/uploads (git-ignored).
// Runs `next dev` in the isolated env (no live services). Staff sessions and the audit log need
// PostgreSQL in production, so a database-less `next start` correctly refuses staff sign-in;
// development uses the in-memory admin store. Throwaway random passwords are hashed and never printed.
// Usage: node scripts/qa/admin-ui-check.mjs [port] [outFile]   (QA_SHOT_DIR = screenshot folder)
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import sharp from "sharp";

const port = Number(process.argv[2] || 3100);
const outFile = process.argv[3];
const shotDir = process.env.QA_SHOT_DIR || "docs/qa/phase-3/screenshots";
mkdirSync(shotDir, { recursive: true });
const base = `http://localhost:${port}`;
const runDigits = String(Math.floor(10000 + Math.random() * 89999));
const probePhone = `+91 9${runDigits} 22222`;
const probeEmail = `admin-probe-${runDigits}@example.test`;
const accounts = Object.fromEntries(["owner", "desk", "kitchen"].map((id) => [id, randomBytes(18).toString("base64url")]));
const roles = { owner: "owner", desk: "front_desk", kitchen: "kitchen" };
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`; };
const adminUsers = JSON.stringify(Object.entries(accounts).map(([id, password]) => ({ id, name: `QA ${id}`, role: roles[id], passwordHash: hash(password) })));

const server = spawn(`node scripts/qa/isolated-env.mjs npx next dev -p ${port}`, {
  shell: true,
  env: { ...process.env, QA_ENV_ADMIN_USERS_JSON: adminUsers, QA_ENV_ADMIN_SESSION_SECRET: randomBytes(32).toString("hex"), QA_ENV_NEXT_PUBLIC_SITE_URL: base, QA_ENV_TEJJORA_QA_CONTENT_DB: "pglite" },
  stdio: "ignore",
});

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function signIn(browser, id) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin/login`);
  const status = await page.evaluate(async ([userId, password]) => (await fetch("/api/admin/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).status, [id, accounts[id]]);
  await page.goto(`${base}/admin`);
  return { context, page, errors, status };
}
const api = (page, url, init) => page.evaluate(async ([target, options]) => { const r = await fetch(target, options); return { status: r.status, body: await r.text() }; }, [url, init ?? {}]);
const tabs = (page) => page.locator(".admin-tabs button").allInnerTexts();

try {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try { if ((await fetch(`${base}/admin/login`)).ok) break; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const created = await fetch(`${base}/api/reservations`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      stay: { checkIn: day(40), checkOut: day(41), adults: 2, children: 0, rooms: 1 },
      roomId: "premium", ratePlanId: "room-only", addonIds: [], source: "website", acknowledgement: true,
      guest: { firstName: "Admin", lastName: "Probe", phone: probePhone, email: probeEmail, preferredContact: "phone", specialRequests: "QA" },
    }),
  });
  const reference = (await created.json()).reference;
  check("Seed reservation created through the public API", created.status === 201 && Boolean(reference), reference);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const owner = await signIn(browser, "owner");
  check("Owner signs in with a hashed ADMIN_USERS_JSON account", owner.status === 200 && owner.page.url() === `${base}/admin`, `status ${owner.status}`);
  const cookie = (await owner.context.cookies()).find((item) => item.name === "tejjora_admin_session");
  check("Session cookie is HttpOnly + SameSite=Strict and carries no role", cookie?.httpOnly === true && cookie?.sameSite === "Strict" && !/owner/.test(cookie?.value ?? ""));
  await owner.page.locator(".admin-tabs").waitFor();
  const ownerTabs = await tabs(owner.page);
  const allModules = ["Today", "Reservations", "Availability & Rates", "Payments", "Restaurant", "Rooms", "Offers", "Content", "Media", "Virtual Tour", "AI Knowledge", "SEO", "Audit", "Staff & Sessions"];
  check("Owner navigation: every module, grouped, none disabled", allModules.every((label) => ownerTabs.includes(label)) && (await owner.page.locator(".admin-tabs button[disabled]").count()) === 0 && (await owner.page.locator(".admin-tabs__group").count()) === 3, ownerTabs.join(", "));
  await owner.page.locator(".admin-metrics-grid").waitFor({ timeout: 30_000 });
  await owner.page.screenshot({ path: `${shotDir}/admin-today__1440x900.png` });

  const list = await api(owner.page, "/api/admin/reservations?page=1&pageSize=25");
  check("Reservations API is paginated and masked (no email, phone or token hash)", list.status === 200 && list.body.includes('"pageSize":25') && list.body.includes('"phoneLast4":"2222"') && !list.body.includes(probeEmail) && !list.body.includes(probePhone) && !list.body.includes("accessTokenHash"));
  await owner.page.getByRole("button", { name: "Reservations", exact: true }).click();
  await owner.page.locator(".admin-reservation-row", { hasText: reference }).click();
  await owner.page.locator(".admin-detail").getByText(probeEmail).waitFor({ timeout: 15_000 }).catch(() => undefined);
  check("Detail panel loads contact details deliberately", (await owner.page.locator(".admin-detail").innerText().catch(() => "")).includes(probeEmail));
  await owner.page.getByLabel("Search reservations").fill(`9${runDigits}`);
  await owner.page.waitForTimeout(1500);
  const rows = await owner.page.locator(".admin-reservation-row").allInnerTexts();
  check("Server-side search by phone digits", rows.length >= 1 && rows.every((text) => text.includes("Admin Probe")), `${rows.length} row(s)`);
  await owner.page.screenshot({ path: `${shotDir}/admin-reservations__1440x900.png` });

  await owner.page.getByRole("button", { name: "Availability & Rates" }).click();
  await owner.page.locator(".admin-inventory-table__row").first().waitFor({ timeout: 15_000 });
  check("Availability grid shows 14 days", (await owner.page.locator(".admin-inventory-table__row").count()) === 14 && (await owner.page.getByText("Next 14 days").count()) === 1);
  await owner.page.screenshot({ path: `${shotDir}/admin-availability__1440x900.png` });

  await owner.page.getByRole("button", { name: "Audit" }).click();
  await owner.page.locator("button.admin-audit__row").first().waitFor({ timeout: 15_000 });
  const auditText = await owner.page.locator(".admin-audit").innerText();
  check("Audit view lists sign-in and detail-view events", auditText.includes("auth.login") && auditText.includes("reservation.detail_viewed"));
  await owner.page.locator("button.admin-audit__row", { hasText: "reservation.detail_viewed" }).first().click();
  await owner.page.locator(".admin-detail .admin-detail__facts").waitFor({ timeout: 30_000 });
  const auditDetail = await owner.page.locator(".admin-detail").innerText();
  check("Audit detail loads (time, staff, entity) without guest contact details", auditDetail.includes("reservation.detail_viewed") && auditDetail.includes(reference) && !auditDetail.includes(probeEmail) && !auditDetail.includes(probePhone));
  await owner.page.screenshot({ path: `${shotDir}/admin-audit__1440x900.png` });

  const desk = await signIn(browser, "desk");
  await desk.page.locator(".admin-tabs").waitFor();
  const deskTabs = await tabs(desk.page);
  check("Front desk: no Audit or Staff modules", deskTabs.includes("Reservations") && !deskTabs.includes("Audit") && !deskTabs.includes("Staff & Sessions"), deskTabs.join(", "));
  check("Front desk is refused by the staff API (403)", (await api(desk.page, "/api/admin/staff")).status === 403);
  await desk.page.getByRole("button", { name: "Availability & Rates" }).click();
  await desk.page.locator(".admin-inventory-table__row").first().waitFor({ timeout: 15_000 });
  check("Front desk sees availability read-only (no rate or block forms)", (await desk.page.locator("form.admin-room-setting").count()) === 0 && (await desk.page.getByText("View only for your role.").count()) === 1);

  const kitchen = await signIn(browser, "kitchen");
  await kitchen.page.locator(".admin-panel").first().waitFor();
  await kitchen.page.locator(".admin-subtabs").waitFor({ timeout: 60_000 });
  await kitchen.page.getByText("No open orders").waitFor({ timeout: 60_000 }).catch(() => undefined);
  const kitchenTabs = await tabs(kitchen.page);
  check("Kitchen: only the Restaurant module, opening on an empty orders queue", kitchenTabs.length === 1 && kitchenTabs[0] === "Restaurant" && (await kitchen.page.getByText("No open orders").count()) === 1, kitchenTabs.join(", "));
  await kitchen.page.getByRole("button", { name: "Menu items" }).click();
  await kitchen.page.locator(".admin-cms__item").first().waitFor({ timeout: 60_000 });
  await kitchen.page.locator(".admin-cms__item", { hasText: "Paneer Butter Masala" }).locator("input[type=checkbox]").uncheck();
  await kitchen.page.getByText("not available today").waitFor({ timeout: 15_000 });
  await kitchen.page.locator(".admin-cms__item", { hasText: "Paneer Butter Masala" }).locator(".admin-cms__row").click();
  check("Kitchen toggles availability; price is read-only in the editor", (await kitchen.page.locator(".admin-editor input#cms-price_full").count()) === 0 && (await kitchen.page.locator(".admin-editor output#cms-price_full").count()) === 1);
  check("Kitchen is refused a price change by the API (403)", (await api(kitchen.page, "/api/admin/cms/menu-items/paneer-butter-masala", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ price_full: 1 }) })).status === 403);
  await kitchen.page.screenshot({ path: `${shotDir}/admin-restaurant-kitchen__1440x900.png` });
  check("Kitchen is refused by the reservations API (403)", (await api(kitchen.page, "/api/admin/reservations")).status === 403);

  // ---- Phase 3B/3C CMS
  const summary = `QA summary ${runDigits}: calm rooms near the lake.`;
  await owner.page.getByRole("button", { name: "Rooms", exact: true }).click();
  await owner.page.locator(".admin-cms__item", { hasText: "Deluxe" }).first().locator(".admin-cms__row").click();
  await owner.page.locator(".admin-editor #cms-summary").fill(summary);
  await owner.page.locator(".admin-editor").getByRole("button", { name: "Save changes" }).click();
  await owner.page.getByText("Saved.").waitFor({ timeout: 15_000 });
  await owner.page.locator(".admin-editor .admin-thumbs img").first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  check("Room photos panel shows the room's assigned media", (await owner.page.locator(".admin-editor .admin-thumbs img").count()) >= 1);
  await owner.page.screenshot({ path: `${shotDir}/admin-rooms__1440x900.png` });
  const roomsHtml = await (await fetch(`${base}/rooms`)).text();
  check("Room edit -> database -> revalidation -> public /rooms page", roomsHtml.includes(summary));
  const renamed = await api(owner.page, "/api/admin/cms/rooms/deluxe", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "luxury" }) });
  check("Room id rename refused (400)", renamed.status === 400 && renamed.body.includes("stable key"));

  await owner.page.getByRole("button", { name: "Content", exact: true }).click();
  await owner.page.getByRole("button", { name: "Policies" }).click();
  await owner.page.locator(".admin-cms__item").first().waitFor({ timeout: 15_000 });
  await owner.page.locator(".admin-cms__item").first().locator(".admin-cms__row").click();
  await owner.page.locator(".admin-editor #cms-published").check();
  await owner.page.locator(".admin-editor").getByRole("button", { name: "Save changes" }).click();
  await owner.page.locator(".admin-editor .admin-field-error").first().waitFor({ timeout: 15_000 });
  check("Form shows the server's field error (policy needs approval)", (await owner.page.locator(".admin-editor .admin-field-error").first().innerText()).includes("approves"));

  await owner.page.setViewportSize({ width: 768, height: 1024 });
  await owner.page.getByRole("button", { name: "Property facts" }).click();
  await owner.page.locator(".admin-cms__item").first().waitFor({ timeout: 15_000 });
  await owner.page.screenshot({ path: `${shotDir}/admin-content__768x1024.png` });
  check("Tablet: content list fits without horizontal page scroll", await owner.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await owner.page.setViewportSize({ width: 1440, height: 900 });

  await owner.page.getByRole("button", { name: "Media", exact: true }).click();
  await owner.page.locator("#upload-file").waitFor({ timeout: 15_000 });
  await owner.page.locator(".admin-form--grid").getByRole("button", { name: "Upload" }).click();
  check("Upload form shows validation errors before sending", (await owner.page.locator(".admin-form--grid .admin-field-error").count()) >= 2);
  const png = await sharp({ create: { width: 320, height: 200, channels: 3, background: "#2f5d62" } }).png().toBuffer();
  await owner.page.locator("#upload-file").setInputFiles({ name: "qa.png", mimeType: "image/png", buffer: png });
  await owner.page.locator("#upload-alt").fill("QA test image");
  await owner.page.locator("#upload-provenance").selectOption("placeholder");
  await owner.page.locator(".admin-form--grid").getByRole("button", { name: "Upload" }).click();
  await owner.page.getByText("re-encoded as WebP").waitFor({ timeout: 30_000 });
  await owner.page.locator(".admin-cms__item", { hasText: "QA test image" }).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  check("Media upload re-encodes and lists the image", (await owner.page.locator(".admin-cms__item", { hasText: "QA test image" }).count()) === 1);
  const svgStatus = await owner.page.evaluate(async () => {
    const form = new FormData();
    form.set("file", new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: "image/png" }), "x.png");
    form.set("alt", "x");
    form.set("provenance", "tejjora");
    return (await fetch("/api/admin/media", { method: "POST", body: form })).status;
  });
  check("SVG disguised as PNG is rejected (400)", svgStatus === 400);
  await owner.page.screenshot({ path: `${shotDir}/admin-media__1440x900.png` });

  await owner.page.getByRole("button", { name: "AI Knowledge", exact: true }).click();
  await owner.page.getByRole("button", { name: "Test", exact: true }).click();
  await owner.page.getByText("approved public entr").waitFor({ timeout: 15_000 });
  check("AI knowledge preview runs the approved-only getter", (await owner.page.getByText("0 approved public entries available").count()) === 1);

  await owner.page.getByRole("button", { name: "Restaurant", exact: true }).click();
  await owner.page.locator(".admin-subtabs").waitFor({ timeout: 15_000 });
  check("Owner restaurant module shows orders, menu, categories and settings", (await owner.page.locator(".admin-subtabs button").allInnerTexts()).join("|").startsWith("Orders"), (await owner.page.locator(".admin-subtabs button").allInnerTexts()).join("|"));

  await owner.page.setViewportSize({ width: 390, height: 844 });
  await owner.page.getByRole("button", { name: "Offers", exact: true }).click();
  await owner.page.locator(".admin-cms__item").first().waitFor({ timeout: 15_000 });
  await owner.page.screenshot({ path: `${shotDir}/admin-offers__390x844.png` });
  check("Mobile: offers list fits without horizontal page scroll", await owner.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await owner.page.setViewportSize({ width: 1440, height: 900 });

  await owner.page.getByRole("button", { name: "Staff & Sessions" }).click();
  await owner.page.locator(".admin-staff__row", { hasText: "QA desk" }).waitFor({ timeout: 15_000 });
  check("Owner staff view lists accounts with active sessions", (await owner.page.locator(".admin-staff__row", { hasText: "QA desk" }).innerText()).includes("1"));
  check("Owner sees individual sessions, including this browser", (await owner.page.getByText("(this browser)").count()) === 1);
  await owner.page.screenshot({ path: `${shotDir}/admin-staff__1440x900.png` });

  const second = await signIn(browser, "owner");
  owner.page.once("dialog", (dialog) => dialog.accept());
  await owner.page.getByRole("button", { name: "Sign out everywhere" }).click();
  await owner.page.waitForURL(/\/admin\/login\?reason=signed_out_all/, { timeout: 15_000 });
  check("Sign out everywhere returns to sign-in with a notice", (await owner.page.getByText("signed out on every device").count()) === 1);
  const afterRevoke = await api(second.page, "/api/admin/overview");
  check("The owner's other session is revoked immediately", afterRevoke.status === 401 && afterRevoke.body.includes("SESSION_ENDED"));
  await second.page.goto(`${base}/admin`);
  check("A revoked session is redirected to sign-in", second.page.url().startsWith(`${base}/admin/login`), second.page.url());
  check("Front desk session unaffected by the owner's sign-out", (await api(desk.page, "/api/admin/overview")).status === 200);

  const crossOrigin = await fetch(`${base}/api/admin/inventory/blocks`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
  check("Admin mutation from another origin is refused (403)", crossOrigin.status === 403);
  const errors = [...owner.errors, ...desk.errors, ...kitchen.errors, ...second.errors];
  check("No client-side errors in the admin UI", errors.length === 0, errors.slice(0, 2).join(" | "));
  await browser.close();
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}

if (outFile) writeFileSync(outFile, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
const failed = results.filter((result) => !result.pass).length;
console.log(`\n${results.length - failed}/${results.length} admin checks passed`);
process.exit(failed ? 1 : 0);
