#!/usr/bin/env node
// MapLibre's web worker cannot be resolved by the Next bundler ("Worker failed to load"), so the
// /location map serves it from /vendor and points `setWorkerUrl` at it. This copies the worker from
// the installed package so it always matches the library version; public/vendor/ is git-ignored.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const source = path.join("node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
if (!existsSync(source)) {
  console.warn("[copy-maplibre-worker] maplibre-gl is not installed; skipping.");
  process.exit(0);
}
mkdirSync(path.join("public", "vendor"), { recursive: true });
copyFileSync(source, path.join("public", "vendor", "maplibre-gl-worker.mjs"));
console.log("[copy-maplibre-worker] public/vendor/maplibre-gl-worker.mjs updated");
