#!/usr/bin/env node
// Phase 1 runtime regression checks against a running server (start it with scripts/qa/isolated-env.mjs).
// Usage: node scripts/qa/phase1-runtime-checks.mjs [baseUrl] [outFile]
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const outFile = process.argv[3];
const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

// ---------- HTTP-level checks ----------
const home = await fetch(`${base}/`);
const homeHtml = await home.text();
const csp = home.headers.get("content-security-policy") ?? "";
check("CSP header present", csp.includes("default-src 'self'"), csp.slice(0, 80));
check("CSP frame-ancestors 'none'", csp.includes("frame-ancestors 'none'"));
check("CSP object-src 'none'", csp.includes("object-src 'none'"));
check("X-Content-Type-Options nosniff", home.headers.get("x-content-type-options") === "nosniff");
check("Referrer-Policy", home.headers.get("referrer-policy") === "strict-origin-when-cross-origin");
check("Permissions-Policy", (home.headers.get("permissions-policy") ?? "").includes("camera=()"));
check("X-Frame-Options DENY", home.headers.get("x-frame-options") === "DENY");
check("HSTS omitted on plain-http localhost (sent only for https site URLs)", !home.headers.get("strict-transport-security"));
const admin = await fetch(`${base}/admin/login`);
check("Security headers also on /admin/login", (admin.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"));

check("Home server HTML has exactly one <h1>", (homeHtml.match(/<h1[\s>]/g) || []).length === 1, `found ${(homeHtml.match(/<h1[\s>]/g) || []).length}`);
check("No demo review text on home", !/Demo review|· demo/.test(homeHtml));
const experienceHtml = await (await fetch(`${base}/experience`)).text();
check("Experience hero no longer claims an illustration is a real view", !experienceHtml.includes("Tejjora terrace and lake view at sunset") && experienceHtml.includes("illustrative image"));
const locationHtml = await (await fetch(`${base}/location`)).text();
check("/location server HTML has exactly one <h1>", (locationHtml.match(/<h1[\s>]/g) || []).length === 1);
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const robots = await (await fetch(`${base}/robots.txt`)).text();
check("sitemap/robots use the configured site URL (no example.com)", !sitemap.includes("example.com") && !robots.includes("example.com") && sitemap.includes(base));

const post = (path, body, headers) => fetch(`${base}${path}`, { method: "POST", headers, body });
const plain = await post("/api/availability", JSON.stringify({ checkIn: "2027-01-10", checkOut: "2027-01-12" }), { "content-type": "text/plain", origin: base });
check("text/plain JSON POST rejected (415)", plain.status === 415, `status ${plain.status}`);
const crossSite = await post("/api/concierge", JSON.stringify({ messages: [{ role: "user", content: "hi" }] }), { "content-type": "application/json", origin: "https://evil.example" });
check("Cross-origin POST rejected (403)", crossSite.status === 403, `status ${crossSite.status}`);
const noOrigin = await post("/api/reservations", "{}", { "content-type": "application/json" });
check("POST without Origin / fetch metadata rejected", noOrigin.status === 403, `status ${noOrigin.status}`);
const errorShape = await crossSite.json().catch(() => ({}));
check("Error contract { error: { code, message } }", typeof errorShape?.error?.code === "string" && typeof errorShape?.error?.message === "string");
const webhook = await post("/api/payments/webhook", "{}", { "content-type": "application/json", "x-razorpay-signature": "abc" });
check("Webhook without configured secret → 503 (retriable), no signature processing", webhook.status === 503, `status ${webhook.status}`);
const concierge = await post("/api/concierge", JSON.stringify({ messages: [{ role: "user", content: "Compare the three room categories." }] }), { "content-type": "application/json", origin: base });
const conciergeBody = await concierge.json();
check("Concierge: room categories → room-comparison", conciergeBody.intent === "room-comparison", conciergeBody.intent);

// ---------- Browser checks ----------
const browser = await chromium.launch({ channel: "chrome", headless: true });
const csp_violations = [];
async function pageWith(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...options });
  const page = await context.newPage();
  page.on("console", (msg) => { if (/Content Security Policy|Refused to/i.test(msg.text())) csp_violations.push(`${page.url()} ${msg.text().slice(0, 200)}`); });
  return { context, page };
}

{
  const { context, page } = await pageWith();
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const underCenter = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return el?.closest(".site-intro") ? "intro" : el?.tagName ?? "none";
  });
  check("Intro overlay never intercepts pointer input (first visit, 400 ms)", underCenter !== "intro", `element under centre: ${underCenter}`);
  await page.waitForTimeout(2200);
  const introGone = await page.evaluate(() => {
    const el = document.getElementById("site-intro");
    if (!el) return true;
    const style = getComputedStyle(el);
    return style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0;
  });
  check("Intro overlay clears by itself (≈1.8 s)", introGone);
  check("Home rendered DOM has exactly one h1", (await page.locator("h1").count()) === 1);
  await page.goto(`${base}/`, { waitUntil: "load" });
  const skipped = await page.evaluate(() => document.getElementById("site-intro")?.hasAttribute("data-skip") ?? true);
  check("Intro skipped on repeat visit in the same session", skipped);
  await context.close();
}

{
  const { context, page } = await pageWith({ javaScriptEnabled: false });
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => {
    const el = document.getElementById("site-intro");
    if (!el) return "absent";
    const style = getComputedStyle(el);
    return `${style.visibility}/${style.opacity}/${style.pointerEvents}`;
  });
  check("No-JS: intro overlay clears and never blocks", state === "absent" || state.startsWith("hidden") || state.includes("/0/"), state);
  await page.screenshot({ path: `${process.env.QA_SHOT_DIR || "docs/qa/phase-1/screenshots"}/home__390x844__no-js.png` }).catch(() => undefined);
  await context.close();
}

{
  const { context, page } = await pageWith({ reducedMotion: "reduce" });
  await page.goto(`${base}/`, { waitUntil: "load" });
  const display = await page.evaluate(() => {
    const el = document.getElementById("site-intro");
    return el ? getComputedStyle(el).display : "absent";
  });
  check("Reduced motion: intro overlay not shown", display === "none" || display === "absent", display);
  await context.close();
}

{
  const { context, page } = await pageWith();
  await page.goto(`${base}/location`, { waitUntil: "load" });
  check("/location rendered DOM has exactly one h1", (await page.locator("h1").count()) === 1);
  await context.close();
}

{
  const { context, page } = await pageWith();
  await page.goto(`${base}/virtual-tour`, { waitUntil: "load" });
  const defaultTitle = await page.locator(".vt-viewer-shell").getAttribute("aria-label");
  check("Virtual tour opens on a Tejjora scene, not the demo", !/demo/i.test(defaultTitle ?? ""), defaultTitle ?? "");

  await page.goto(`${base}/virtual-tour?scene=demo-room`, { waitUntil: "load" });
  const label = await page.locator(".vt-viewer-status__note").first().textContent().catch(() => "");
  check("Demo scene carries a persistent 'Not Tejjora property media' label", /Not Tejjora property media/.test(label ?? ""), label ?? "");
  await page.waitForSelector('.vt-viewer-shell[data-mode="immersive"]', { timeout: 20_000 }).catch(() => undefined);
  const immersive = (await page.locator('.vt-viewer-shell[data-mode="immersive"]').count()) === 1;
  if (!immersive) {
    check("360 keyboard scope (viewer did not reach immersive mode in headless Chrome)", false, "WebGL unavailable; covered by unit test");
  } else {
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "qa-input";
      input.style.cssText = "position:fixed;top:0;left:0;z-index:2";
      document.body.append(input);
    });
    const stage = page.locator(".vt-viewer-stage");
    await page.focus("#qa-input");
    const before = await stage.screenshot();
    for (let index = 0; index < 8; index += 1) await page.keyboard.press("ArrowRight");
    await page.keyboard.type("-0+");
    await page.waitForTimeout(600);
    const afterTyping = await stage.screenshot();
    const typed = await page.inputValue("#qa-input");
    check("Typing arrows/-/0/+ in another input does not move the 360 view", Buffer.compare(before, afterTyping) === 0 && typed === "-0+", `input value "${typed}"`);
    await page.locator(".vt-viewer-shell").focus();
    for (let index = 0; index < 8; index += 1) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);
    const afterViewer = await stage.screenshot();
    check("Arrow keys still control the 360 view when the viewer is focused", Buffer.compare(afterTyping, afterViewer) !== 0);
  }
  await context.close();
}

for (const path of ["/", "/rooms", "/book", "/location", "/virtual-tour", "/gallery", "/dining", "/experience"]) {
  const { context, page } = await pageWith();
  await page.goto(`${base}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const title = await page.title();
  check(`Title not doubled on ${path}`, (title.match(/Tejjora Lake View/g) || []).length === 1, title);
  await context.close();
}
check("No CSP violations reported in the browser console", csp_violations.length === 0, csp_violations.slice(0, 3).join(" | "));

await browser.close();
if (outFile) writeFileSync(outFile, JSON.stringify({ base, checkedAt: new Date().toISOString(), results }, null, 2));
const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
