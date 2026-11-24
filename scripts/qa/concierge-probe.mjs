#!/usr/bin/env node
// Sends known regression prompts to /api/concierge and records the intent/answer for QA comparison.
// Usage: node scripts/qa/concierge-probe.mjs <outFile> [baseUrl]   (run against an isolated server; no Gemini key)
import { writeFileSync } from "node:fs";
const out = process.argv[2] || "concierge-probe.json";
const base = (process.argv[3] || "http://localhost:3000").replace(/\/$/, "");
const prompts = [
  "Compare the three room categories.", "How do I get to Tejjora Lake View?", "What is your location?",
  "Is there a small fridge?", "Is the room comfortable?", "What would be ideal for a family?", "Can I read a review?",
  "Do you have training rooms?", "Is breakfast available during my stay?", "Do you allow pets?", "Can I bring my cat?",
  "Do you have a restaurant table?", "Where is the nearest mall?", "What rooms do you have?", "How much is a room?",
  "Is there a lake view from the room?", "What time is check in?", "Plan a vacation for me", "I am dedicated to petrol cars",
];
const results = [];
for (const q of prompts) {
  const res = await fetch(`${base}/api/concierge`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ messages: [{ role: "user", content: q }] }) });
  const json = await res.json().catch(() => ({}));
  results.push({ prompt: q, status: res.status, intent: json.intent ?? null, answer: String(json.content ?? JSON.stringify(json)).slice(0, 220) });
}
writeFileSync(out, JSON.stringify(results, null, 2));
for (const r of results) console.log(`${r.status} ${String(r.intent).padEnd(22)} | ${r.prompt} => ${r.answer.slice(0, 80)}`);
