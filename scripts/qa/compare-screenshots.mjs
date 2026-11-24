#!/usr/bin/env node
// Pixel comparison of two capture runs (same file names). Reports the share of changed pixels
// per screenshot and page-height changes from capture-results.json.
// Usage: node scripts/qa/compare-screenshots.mjs <baselineDir> <candidateDir> [outFile]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [baseDir, candDir, outFile] = process.argv.slice(2);
const files = readdirSync(path.join(baseDir, "screenshots")).filter((name) => name.endsWith(".png") && existsSync(path.join(candDir, "screenshots", name)));
const rows = [];
for (const name of files) {
  const [a, b] = await Promise.all([path.join(baseDir, "screenshots", name), path.join(candDir, "screenshots", name)].map((file) => sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true })));
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) { rows.push({ name, changedPct: 100, note: "size differs" }); continue; }
  let changed = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    const delta = Math.abs(a.data[index] - b.data[index]) + Math.abs(a.data[index + 1] - b.data[index + 1]) + Math.abs(a.data[index + 2] - b.data[index + 2]);
    if (delta > 30) changed += 1;
  }
  rows.push({ name, changedPct: Number(((changed / (a.data.length / 4)) * 100).toFixed(2)) });
}
const results = (dir) => JSON.parse(readFileSync(path.join(dir, "capture-results.json"), "utf8")).results;
const heights = results(baseDir).map((before) => {
  const after = results(candDir).find((item) => item.route === before.route && item.viewport === before.viewport);
  return { route: before.route, viewport: before.viewport, before: before.docHeight, after: after?.docHeight, h1Before: before.h1Count, h1After: after?.h1Count, titleAfter: after?.title };
});
rows.sort((x, y) => y.changedPct - x.changedPct);
if (outFile) writeFileSync(outFile, JSON.stringify({ comparedAt: new Date().toISOString(), screenshots: rows, heights }, null, 2));
console.log(`compared ${rows.length} screenshots`);
for (const row of rows.slice(0, 25)) console.log(`${String(row.changedPct).padStart(6)}%  ${row.name}${row.note ? ` (${row.note})` : ""}`);
const heightChanges = heights.filter((item) => item.before !== item.after);
console.log(`\npage-height changes: ${heightChanges.length}`);
for (const item of heightChanges.slice(0, 30)) console.log(`${item.route} @ ${item.viewport}: ${item.before} → ${item.after}`);
