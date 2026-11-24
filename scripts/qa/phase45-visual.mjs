#!/usr/bin/env node
// Phase 4/5A visual QA: drives an isolated `next dev` (no live services) in real Chrome.
// For each route × viewport it records horizontal overflow, page height, touch-target misses and
// client errors, and saves a full-page screenshot (reduced motion, so reveal-on-scroll content is
// visible in a static capture). It then exercises the dock menu, Ask sheet, Waterline Day and the
// room carousel with normal motion.
// Usage: node scripts/qa/phase45-visual.mjs [port] [outDir] [routes,comma,separated] [viewports WxH,comma]
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const port = Number(process.argv[2] || 3120);
const outDir = process.argv[3] || "docs/qa/phase-4-5";
const routes = (process.argv[4] || "/,/rooms,/rooms/deluxe,/dining,/dining/menu").split(",");
const viewports = (process.argv[5] || "1366x768,390x844,360x780").split(",").map((value) => value.split("x").map(Number));
const shots = `${outDir}/screenshots`;
mkdirSync(shots, { recursive: true });
const base = `http://localhost:${port}`;

const server = spawn(`node scripts/qa/isolated-env.mjs npx next dev -p ${port}`, { shell: true, env: { ...process.env, QA_ENV_NEXT_PUBLIC_SITE_URL: base }, stdio: "ignore" });
const results = [];
const record = (entry) => {
  results.push(entry);
  console.log(`${entry.pass ? "PASS" : "FAIL"}  ${entry.name}${entry.detail ? `  — ${entry.detail}` : ""}`);
};
const slug = (route) => (route === "/" ? "home" : route.slice(1).replaceAll("/", "-"));

try {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      if ((await fetch(`${base}/`)).ok) break;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  // The Next.js dev-tools badge (development only) sits over the dock; hide it for the checks.
  const hideDevOverlay = (context) => context.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style));
  });

  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", deviceScaleFactor: 1, hasTouch: width < 1024, isMobile: width < 1024 });
    await hideDevOverlay(context);
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && !/Download the React DevTools|favicon/.test(message.text())) errors.push(message.text().slice(0, 200));
      });
      await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 120_000 });
      await page.waitForTimeout(600);
      const metrics = await page.evaluate(() => {
        const visible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const small = [...document.querySelectorAll("main a, main button, .tj-dock button, .tj-header a, .tj-header button")]
          .filter(visible)
          .filter((element) => !element.closest(".sr-only") && !element.closest("[aria-hidden='true']"))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const inline = getComputedStyle(element).display === "inline" && element.closest("p, li, dd, address");
            return !inline && (rect.height < 43.5 || rect.width < 43.5);
          })
          .map((element) => `${element.tagName.toLowerCase()}.${(element.className || "").toString().split(" ")[0]}:${(element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 24)}`);
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          height: document.documentElement.scrollHeight,
          h1: document.querySelectorAll("h1").length,
          small: [...new Set(small)].slice(0, 8),
        };
      });
      const name = `${route} @ ${width}x${height}`;
      record({ name: `${name}: no horizontal overflow`, pass: metrics.overflow <= 1, detail: `overflow ${metrics.overflow}px, height ${metrics.height}px` });
      record({ name: `${name}: exactly one h1`, pass: metrics.h1 === 1, detail: String(metrics.h1) });
      record({ name: `${name}: touch targets ≥44px`, pass: metrics.small.length === 0, detail: metrics.small.join(" | ") });
      if (route === "/" && width < 768) record({ name: `${name}: home ≤ 9000 CSS px tall`, pass: metrics.height <= 9000, detail: `${metrics.height}px` });
      await page.screenshot({ path: `${shots}/${slug(route)}__${width}x${height}.png`, fullPage: true });
      record({ name: `${name}: no client errors`, pass: errors.length === 0, detail: errors.slice(0, 2).join(" | ") });
      await page.close();
    }
    await context.close();
  }

  // Interactions with normal motion.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await hideDevOverlay(mobile);
  const page = await mobile.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${shots}/interaction-hero__390x844.png` });
  const dock = page.locator(".tj-dock");
  record({ name: "Mobile dock visible with Menu, Ask, Book and AI", pass: (await dock.isVisible()) && (await dock.locator("button").count()) === 4 });
  const dockBox = await dock.boundingBox();
  record({ name: "Dock fits a 390px screen", pass: Boolean(dockBox && dockBox.x >= 0 && dockBox.x + dockBox.width <= 390) });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#site-menu").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${shots}/interaction-menu__390x844.png` });
  record({ name: "Dock menu opens the site menu", pass: await page.locator("#site-menu").isVisible() });
  await page.getByRole("button", { name: "Close menu" }).click();
  await page.locator(".tj-dock__ask").click();
  await page.locator(".tj-sheet [role=dialog]").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/interaction-ask__390x844.png` });
  record({ name: "Ask opens WhatsApp / Call / AI sheet", pass: (await page.locator(".tj-sheet [role=dialog]").locator(".tj-ask__option").count()) === 3 });
  await page.keyboard.press("Escape");
  await page.locator(".tj-dock__book").click();
  await page.waitForTimeout(400);
  record({ name: "Book without dates opens the planner sheet", pass: (await page.locator(".tj-sheet [role=dialog]").getByText("Your stay").count()) === 1 });
  await page.keyboard.press("Escape");

  const day = page.locator(".tj-waterline-day");
  await day.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/interaction-waterline-morning__390x844.png` });
  await page.getByRole("button", { name: "Night" }).click();
  await page.waitForTimeout(800);
  const scene = await day.getAttribute("data-scene");
  await day.screenshot({ path: `${shots}/interaction-waterline-night__390x844.png` });
  record({ name: "Waterline Day: chips change the scene (mobile, no runway)", pass: scene === "night" && (await day.getAttribute("data-runway")) === "false", detail: `scene ${scene}` });
  const dayBox = await day.boundingBox();
  record({ name: "Waterline Day fits one mobile viewport (no runway)", pass: Boolean(dayBox && dayBox.height <= 844 * 1.08), detail: `${Math.round(dayBox?.height ?? 0)}px` });

  const carousel = page.locator(".tj-home-rooms .tj-carousel__track");
  await carousel.scrollIntoViewIfNeeded();
  const before = await carousel.evaluate((element) => element.scrollLeft);
  await page.locator(".tj-home-rooms").getByRole("button", { name: "Next in Rooms" }).click();
  await page.waitForTimeout(700);
  const after = await carousel.evaluate((element) => element.scrollLeft);
  const peek = await carousel.evaluate((element) => {
    const second = element.children[1]?.getBoundingClientRect();
    return second ? second.left < window.innerWidth : false;
  });
  record({ name: "Room carousel: next card peeks and the arrow advances", pass: after > before && peek, detail: `${before}→${after}` });
  await page.locator(".tj-home-rooms").screenshot({ path: `${shots}/interaction-rooms-carousel__390x844.png` });
  record({ name: "No client errors during mobile interactions", pass: errors.length === 0, detail: errors.slice(0, 2).join(" | ") });

  const desktop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await hideDevOverlay(desktop);
  const dPage = await desktop.newPage();
  await dPage.goto(`${base}/`, { waitUntil: "networkidle" });
  await dPage.waitForTimeout(1500);
  const fold = await dPage.evaluate(() => {
    const inView = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight && rect.height > 0);
    };
    return { lockup: inView(".tj-hero__lockup"), line: inView(".tj-hero__line"), console: inView(".tj-hero .tj-console"), header: getComputedStyle(document.querySelector(".tj-header")).backgroundColor };
  });
  record({ name: "1366×768: lockup, positioning line and console above the fold", pass: fold.lockup && fold.line && fold.console, detail: JSON.stringify(fold) });
  await dPage.screenshot({ path: `${shots}/interaction-hero__1366x768.png` });
  await dPage.mouse.wheel(0, 1200);
  await dPage.waitForTimeout(800);
  const solid = await dPage.evaluate(() => document.querySelector(".tj-header")?.getAttribute("data-tone"));
  record({ name: "Desktop header turns solid lake after the hero", pass: solid === "solid", detail: String(solid) });
  const runway = await dPage.evaluate(() => {
    const section = document.querySelector(".tj-waterline-day");
    return { runway: section?.getAttribute("data-runway"), height: section?.getBoundingClientRect().height, vh: window.innerHeight };
  });
  record({ name: "Desktop Waterline Day runway ≤150svh", pass: runway.runway === "true" && runway.height <= runway.vh * 1.5 + 2, detail: JSON.stringify(runway) });
  await browser.close();
} finally {
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}

writeFileSync(`${outDir}/visual-qa.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
const failed = results.filter((result) => !result.pass).length;
console.log(`\n${results.length - failed}/${results.length} visual checks passed`);
process.exit(failed ? 1 : 0);
