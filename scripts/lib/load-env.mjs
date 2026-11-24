// Loads .env / .env.local the same way Next.js does (via @next/env). Variables already present in
// process.env win, so `node scripts/qa/isolated-env.mjs ...` (which blanks every key) keeps
// database scripts away from the live services configured in .env.local.
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadProjectEnv() {
  nextEnv.loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", { info: () => undefined, error: console.error });
}
