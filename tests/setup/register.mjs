// Test-only module hooks: `server-only` is resolved by Next.js internally at build time and is
// not an installed package, so tests map it to an empty stub for both require() and import.
// TypeScript and the "@/" path alias are handled by tsx (loaded with --import tsx).
import { registerHooks } from "node:module";

const stub = new URL("./server-only-stub.cjs", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: stub, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
