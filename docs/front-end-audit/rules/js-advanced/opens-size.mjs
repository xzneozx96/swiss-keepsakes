import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../front-end");
const { createJiti } = createRequire(path.join(root, "package.json"))("jiti");
const jiti = createJiti(import.meta.url, { alias: { "@": path.join(root, "src") }, moduleCache: false });
const { linkOpens } = await jiti.import(path.join(root, "src/features/partners/lib/link-opens.ts"));
console.log("HISTORY link opens", linkOpens({ referralVisits: [] }).length);
