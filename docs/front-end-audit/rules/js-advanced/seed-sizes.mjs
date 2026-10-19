// Prints the length of every collection in the demo seed state (re-runnable).
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../front-end");
const { createJiti } = createRequire(path.join(root, "package.json"))("jiti");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") }, moduleCache: false });
const { createSeedState } = await jiti.import(path.join(root, "src/features/demo/seed.ts"));
const s = createSeedState();
const rows = [];
const walk = (o, p) => {
  if (Array.isArray(o)) rows.push([p, o.length]);
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (p.split(".").length < 3) walk(v, p ? `${p}.${k}` : k);
};
walk(s.data, "data");
rows.sort((a, b) => b[1] - a[1]);
for (const [k, n] of rows) console.log(`${n}\t${k}`);
const json = JSON.stringify(s);
let t0 = performance.now();
for (let i = 0; i < 20; i++) JSON.stringify(s);
console.log(`\nJSON.stringify(seed state): ${json.length} chars, ${((performance.now() - t0) / 20).toFixed(2)} ms per save (node, desktop CPU)`);
