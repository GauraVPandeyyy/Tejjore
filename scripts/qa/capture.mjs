#!/usr/bin/env node
// QA capture: viewport screenshots + per-page metrics for every public route at the QA-matrix viewports.
// Uses the locally installed Google Chrome through playwright-core (no browser download).
//
// Usage: node scripts/qa/capture.mjs <outDir> [baseUrl]
//   e.g. node scripts/qa/capture.mjs docs/qa/baseline http://localhost:3000
// Run against a server started with scripts/qa/isolated-env.mjs so no live services are touched.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const outDir = process.argv[2] || "docs/qa/capture";
const base = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const routesArg = process.env.QA_ROUTES;
const viewportsArg = process.env.QA_VIEWPORTS;

const viewports = [
  ["1366x768", 1366, 768], ["1440x900", 1440, 900], ["1536x864", 1536, 864], ["1920x1080", 1920, 1080],
  ["1024x768", 1024, 768], ["768x1024", 768, 1024], ["430x932", 430, 932], ["390x844", 390, 844], ["360x780", 360, 780],
].filter(([name]) => !viewportsArg || viewportsArg.split(",").includes(name));

const routes = (routesArg ? routesArg.split(",") : [
  "/", "/rooms", "/dining", "/experience", "/gallery", "/location", "/plan-your-stay", "/book", "/contact",
  "/policies", "/virtual-tour", "/manage-booking", "/arrival?demo=1", "/offers", "/admin/login", "/qa-missing-page",
]);

const slug = (route) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""));
const shotsDir = path.join(outDir, "screenshots");
mkdirSync(shotsDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

for (const [vpName, width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 1024 });
  for (const route of routes) {
    const page = await context.newPage();
    const consoleErrors = [];
    const failed = [];
    const bytes = { total: 0, image: 0, media: 0, script: 0, font: 0, stylesheet: 0, document: 0, other: 0 };
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300)); });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${String(err.message).slice(0, 300)}`));
    page.on("requestfailed", (req) => failed.push(`${req.failure()?.errorText ?? "failed"} ${req.url().slice(0, 160)}`));
    page.on("response", async (res) => {
      try {
        const len = Number(res.headers()["content-length"] || 0) || (await res.body().catch(() => Buffer.alloc(0))).length;
        const type = res.request().resourceType();
        bytes.total += len;
        bytes[type in bytes ? type : "other"] += len;
      } catch { /* ignore */ }
    });
    let status = 0;
    let finalUrl = "";
    try {
      const response = await page.goto(base + route, { waitUntil: "load", timeout: 60_000 });
      status = response?.status() ?? 0;
      await page.waitForTimeout(2600); // let the intro loader (≈1.85s) and reveals settle
      finalUrl = page.url().replace(base, "");
      const metrics = await page.evaluate(() => {
        const h1s = [...document.querySelectorAll("h1")].map((h) => h.textContent?.replace(/\s+/g, " ").trim().slice(0, 120));
        const overlay = [...document.querySelectorAll("body *")].find((el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.position === "fixed" && r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95 && s.visibility !== "hidden" && Number(s.opacity) > 0.5 && s.pointerEvents !== "none" && Number(s.zIndex) >= 900;
        });
        return {
          title: document.title,
          h1Count: h1s.length,
          h1s,
          docHeight: document.documentElement.scrollHeight,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          blockingOverlay: overlay ? `${overlay.tagName.toLowerCase()}.${String(overlay.className).slice(0, 60)}` : null,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        };
      });
      const file = `${slug(route)}__${vpName}.png`;
      await page.screenshot({ path: path.join(shotsDir, file), fullPage: false });
      results.push({ viewport: vpName, route, status, finalUrl, ...metrics, screenshot: `screenshots/${file}`, consoleErrors, failedRequests: failed.slice(0, 10), bytes });
    } catch (error) {
      results.push({ viewport: vpName, route, status, error: String(error.message).slice(0, 300), consoleErrors });
    }
    await page.close();
  }
  await context.close();
  console.log(`captured ${vpName}`);
}

// JavaScript-disabled check of the home page (intro loader must not cover content).
const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
const noJsPage = await noJs.newPage();
await noJsPage.goto(base + "/", { waitUntil: "load" });
await noJsPage.waitForTimeout(1500);
const noJsOverlay = await noJsPage.evaluate(() => {
  const el = [...document.querySelectorAll("body *")].find((node) => {
    const s = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return s.position === "fixed" && r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95 && s.visibility !== "hidden" && Number(s.opacity) > 0.5 && Number(s.zIndex) >= 900;
  });
  return el ? `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}` : null;
});
await noJsPage.screenshot({ path: path.join(shotsDir, "home__390x844__no-js.png") });
await noJs.close();
await browser.close();

writeFileSync(path.join(outDir, "capture-results.json"), JSON.stringify({ base, capturedAt: new Date().toISOString(), noJsHomeBlockingOverlay: noJsOverlay, results }, null, 2));
console.log(`wrote ${results.length} results; no-JS home overlay: ${noJsOverlay ?? "none"}`);
