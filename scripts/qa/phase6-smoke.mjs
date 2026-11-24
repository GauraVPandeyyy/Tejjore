#!/usr/bin/env node
// Phase 6 smoke: booking hold, manage-booking mobile lookup, menu cart, order submission, order
// status, and the kitchen queue. Runs `next dev` in the isolated env (no live services) with the
// dev-only in-memory PGlite database for content and orders; the booking store is the local JSON
// file from isolated-env. Throwaway staff passwords are random, hashed and never printed.
// Usage: node scripts/qa/phase6-smoke.mjs [port]
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { rmSync } from "node:fs";
import { chromium } from "playwright-core";

const port = Number(process.argv[2] || 3140);
const base = `http://localhost:${port}`;
const accounts = { owner: randomBytes(18).toString("base64url"), kitchen: randomBytes(18).toString("base64url") };
const roles = { owner: "owner", kitchen: "kitchen" };
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`; };
const adminUsers = JSON.stringify(Object.entries(accounts).map(([id, password]) => ({ id, name: `QA ${id}`, role: roles[id], passwordHash: hash(password) })));

// Content is cached in .next/cache across dev servers; start clean so earlier runs cannot leak settings.
rmSync(".next/dev", { recursive: true, force: true });
rmSync(".next/cache", { recursive: true, force: true });
const server = spawn(`node scripts/qa/isolated-env.mjs npx next dev -p ${port}`, {
  shell: true,
  env: { ...process.env, QA_ENV_ADMIN_USERS_JSON: adminUsers, QA_ENV_ADMIN_SESSION_SECRET: randomBytes(32).toString("hex"), QA_ENV_NEXT_PUBLIC_SITE_URL: base, QA_ENV_TEJJORA_QA_CONTENT_DB: "pglite" },
  stdio: "ignore",
});
const results = [];
const check = (name, pass, detail = "") => {
  results.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const phone = `9${Math.floor(1000 + Math.random() * 8999)}43210`;

async function signIn(browser, id) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(90_000);
  context.setDefaultNavigationTimeout(120_000);
  const page = await context.newPage();
  await page.goto(`${base}/admin/login`);
  const status = await page.evaluate(async ([userId, password]) => (await fetch("/api/admin/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, password }) })).status, [id, accounts[id]]);
  await page.goto(`${base}/admin`);
  return { context, page, status };
}

try {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try { if ((await fetch(`${base}/admin/login`)).ok) break; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // ---------------------------------------------------------------- booking (phone viewport)
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  guest.setDefaultTimeout(90_000);
  guest.setDefaultNavigationTimeout(120_000);
  const page = await guest.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/book?checkIn=${day(45)}&checkOut=${day(47)}&adults=2&rooms=1`);
  await page.getByRole("heading", { name: "Choose your room" }).first().waitFor({ timeout: 60_000 });
  const room = page.locator(".tj-book-room").first();
  await room.click();
  await page.getByRole("button", { name: /Guest details/ }).click();
  await page.getByLabel(/First name/).fill("Rahul");
  await page.getByLabel(/Last name/).fill("Sharma");
  await page.getByLabel(/Phone/).fill(phone);
  await page.getByLabel(/Email/).fill(`rahul.qa.${phone}@example.test`);
  await page.waitForFunction(() => !document.body.innerText.includes("Total (checking"), null, { timeout: 60_000 });
  const totalText = await page.locator(".tj-book__review").innerText();
  check("Checkout shows the server's quote (total resolved)", /Total/.test(totalText) && /₹/.test(totalText), totalText.replace(/\s+/g, " ").slice(-60));
  await page.getByLabel(/I have reviewed/).check();
  await page.getByRole("button", { name: /Hold room/ }).click();
  await page.locator(".tj-reference__value").waitFor({ timeout: 90_000 });
  const reference = (await page.locator(".tj-reference__value").innerText()).trim();
  check("Booking hold created with a new-format reference", /^TLV-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{2}$/.test(reference), reference);
  check("Confirmation offers copy-reference and manage-booking", (await page.locator(".tj-confirm").getByRole("button", { name: "Copy" }).count()) === 1 && (await page.locator(".tj-confirm").getByRole("link", { name: "Manage booking" }).count()) === 1);
  check("No horizontal overflow on the phone confirmation", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

  // ---------------------------------------------------------------- manage booking
  await page.goto(`${base}/manage-booking`);
  await page.getByLabel("Booking reference").fill(reference.toLowerCase());
  await page.getByLabel("Registered mobile").fill("0000000000");
  await page.getByRole("button", { name: "Find booking" }).click();
  await page.locator(".tj-form-error").waitFor();
  const wrong = await page.locator(".tj-form-error").innerText();
  check("Wrong mobile gives the generic message", /couldn.t find a booking/i.test(wrong), wrong);
  await page.getByLabel("Registered mobile").fill(`+91 ${phone.slice(0, 5)} ${phone.slice(5)}`);
  await page.getByRole("button", { name: "Find booking" }).click();
  await page.getByText("R. S****").waitFor({ timeout: 15_000 });
  const maskedBody = await page.locator(".tj-manage__card").innerText();
  check("Mobile lookup shows the masked booking, no email or full number", maskedBody.includes("R. S****") && maskedBody.includes("•••• 3210") && !maskedBody.includes(`rahul.qa.${phone}@example.test`) && !maskedBody.includes(phone));
  check("Pay step asks for the booking email (second factor)", (await page.getByLabel("Booking email").count()) === 1 || /expired|Confirmed/.test(maskedBody));
  await page.screenshot({ path: process.env.QA_SHOT_DIR ? `${process.env.QA_SHOT_DIR}/manage-masked-390.png` : undefined }).catch(() => undefined);

  // ---------------------------------------------------------------- menu: ordering closed, then open
  const owner = await signIn(browser, "owner");
  check("Owner signs in", owner.status === 200);
  await page.goto(`${base}/dining/menu`);
  await page.locator(".tj-menu-item").first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2000);
  { const adds = await page.getByRole("button", { name: "Add to order" }).count(); const notice = await page.getByText(/Online ordering is not open/).count(); check("Ordering is off by default: no add buttons, a clear notice", adds === 0 && notice >= 1, `adds=${adds} notice=${notice}`); }

  const saved = await owner.page.evaluate(async () => (await fetch("/api/admin/cms/restaurant-settings/1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ordering_enabled: true, opening_time: null }) })).status);
  check("Owner turns ordering on (audited CMS save)", saved === 200, `status ${saved}`);
  await page.goto(`${base}/dining/menu`);
  await page.getByRole("button", { name: "Add to order" }).first().waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: "Add to order" }).nth(0).click();
  await page.getByRole("button", { name: "Add to order" }).nth(1).click();
  await page.getByRole("button", { name: "Add to order" }).nth(1).click();
  const bar = page.locator(".tj-cart-bar button");
  await bar.waitFor();
  check("Cart bar summarises items and subtotal", /3 items/.test(await bar.innerText()), (await bar.innerText()).replace(/\s+/g, " "));
  await bar.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const cartText = await dialog.innerText();
  check("Cart shows 5% service charge, taxes note and 30–40 minute preparation", /Service charge \(5%\)/.test(cartText) && /Taxes as applicable/.test(cartText) && /30–40 minutes/.test(cartText), "");
  check("Cart shows the no-cancellation rule and no online payment", /can not be cancelled|cannot be cancelled/i.test(cartText) && /not taken online/.test(cartText));
  await dialog.getByLabel("Your name *").fill("Rahul Sharma");
  await dialog.getByLabel("Mobile number *").fill(phone);
  await dialog.getByRole("button", { name: "Send order request" }).click();
  await dialog.locator(".tj-form-error").waitFor();
  check("Submit without the acknowledgement is refused", /cannot be cancelled/i.test(await dialog.locator(".tj-form-error").innerText()));
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Send order request" }).click();
  await dialog.locator(".tj-reference__value").waitFor({ timeout: 60_000 });
  const orderRef = (await dialog.locator(".tj-reference__value").innerText()).trim();
  check("Order placed with a high-entropy TLO reference", /^TLO-[0-9A-HJKMNP-TV-Z]{10}$/.test(orderRef), orderRef);
  check("The cart is emptied after placing", (await page.evaluate(() => localStorage.getItem("tejjora-cart-v1"))) === "[]");

  // ---------------------------------------------------------------- order status
  await dialog.getByRole("link", { name: "Check order status" }).click();
  await page.locator(".tj-manage__card").getByText(/restaurant has your request/i).first().waitFor({ timeout: 60_000 });
  { const text = await page.locator(".tj-manage__card").innerText(); check("Status page shows the request (same-tab hand-off)", /request sent/i.test(text), text.replace(/s+/g, " ").slice(0, 120)); }
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  fresh.setDefaultTimeout(90_000);
  fresh.setDefaultNavigationTimeout(120_000);
  const stranger = await fresh.newPage();
  await stranger.goto(`${base}/dining/order/${orderRef}`);
  await stranger.getByLabel("Mobile number").fill("9000000000");
  await stranger.getByRole("button", { name: "Check status" }).click();
  await stranger.locator(".tj-form-error").waitFor();
  check("A different mobile gets the generic not-found message", /couldn.t find an order/i.test(await stranger.locator(".tj-form-error").innerText()));

  // ---------------------------------------------------------------- kitchen queue
  const kitchen = await signIn(browser, "kitchen");
  await kitchen.page.getByRole("button", { name: "Restaurant" }).click();
  const card = kitchen.page.locator(".admin-order", { hasText: orderRef });
  await card.waitFor({ timeout: 90_000 });
  const cardText = await card.innerText();
  check("Kitchen sees the order with masked phone and lines", /••3210/.test(cardText) && /Rahul Sharma/.test(cardText) && !cardText.includes(phone));
  await card.getByRole("button", { name: /accepted/i }).click();
  await kitchen.page.locator(".admin-order", { hasText: orderRef }).getByRole("button", { name: /preparing/i }).waitFor({ timeout: 60_000 });
  check("Kitchen can accept and the next step appears", true);
  await page.waitForFunction(() => document.body.innerText.includes("Accepted"), null, { timeout: 40_000 });
  check("Guest status page updates by itself (20 s poll)", /accepted/i.test(await page.locator(".tj-manage__card").innerText()));
  const noMenuWrite = await kitchen.page.evaluate(async () => (await fetch("/api/admin/cms/menu-items/paneer-butter-masala", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ available: false }) })).status);
  check("Kitchen can mark a dish unavailable", noMenuWrite === 200, `status ${noMenuWrite}`);
  check("No client-side errors", errors.length === 0, errors.join(" | "));
  await browser.close();
} catch (error) {
  check("Smoke run completed", false, error instanceof Error ? error.message.split("\n")[0] : String(error));
} finally {
  spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true, stdio: "ignore" });
  const failed = results.filter((pass) => !pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  setTimeout(() => process.exit(failed ? 1 : 0), 1500);
}
