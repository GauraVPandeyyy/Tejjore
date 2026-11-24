#!/usr/bin/env node
// Runs every scripts/validate-*.mjs in the isolated env and reports PASS/FAIL by exit code
// (some validators print a failure without the word "FAIL").
// Usage: node scripts/qa/run-validators.mjs [outFile]
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";

const files = readdirSync("scripts").filter((name) => /^validate-.*\.mjs$/.test(name)).sort();
const results = files.map((name) => {
  const run = spawnSync(process.execPath, ["scripts/qa/isolated-env.mjs", process.execPath, `scripts/${name}`], { encoding: "utf8" });
  const output = `${run.stdout}${run.stderr}`.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("[isolated-env]"));
  return { validator: name, pass: run.status === 0, summary: output.slice(0, 4).join(" | ").slice(0, 300) };
});
for (const row of results) console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.validator}  ${row.summary}`);
const failed = results.filter((row) => !row.pass).map((row) => row.validator);
console.log(`\n${results.length - failed.length} pass / ${failed.length} fail${failed.length ? `: ${failed.join(", ")}` : ""}`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
