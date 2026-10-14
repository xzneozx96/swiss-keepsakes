// Review round 2 (2a): merge the per-session shot lists into manifest-guest.json, in review order
// (items.json order, then shot number, EN before DE). node 1.19a-manifest.mjs <dir with shots-*.json>
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const DIR = "/home/ross-geller/Projects/minastik/swiss-keepsakes/docs/ux/prototype/screens/phase1-review/";
const items = JSON.parse(readFileSync(DIR + "items.json", "utf8")).map((i) => i.item);
const src = process.argv[2];
const shots = readdirSync(src).filter((f) => /^shots-[ABD]-(en|de)\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`${src}/${f}`, "utf8")).shots);
shots.sort((a, b) => items.indexOf(a.item) - items.indexOf(b.item) || a.nn - b.nn || (a.lang === "en" ? -1 : 1));
const manifest = shots.map(({ item, file, caption, lang, width, issue }) => ({ item, file, caption, lang, width, ...(issue ? { issue } : {}) }));
writeFileSync(DIR + "manifest-guest.json", JSON.stringify(manifest, null, 1) + "\n");
console.log(`${manifest.length} entries, ${manifest.filter((m) => m.issue).length} with issue`);
