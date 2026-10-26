// pre-Start only: reads index.html
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const out = process.argv[2];

if (!out) {
  console.error("usage: node measure-initial-load.mjs <vite-outDir>");
  process.exit(1);
}

const html = readFileSync(join(out, "index.html"), "utf8");
const refs = [
  ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
  ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
].map((m) => m[1].replace(/^\.\//, ""));

const rows = [...new Set(refs)]
  .filter((p) => !p.startsWith("http"))
  .map((p) => {
    const buf = readFileSync(join(out, p));

    return { file: p, raw: buf.length, gz: gzipSync(buf).length };
  });

const sum = (ext) =>
  rows
    .filter((r) => r.file.endsWith(ext))
    .reduce((a, r) => ({ raw: a.raw + r.raw, gz: a.gz + r.gz }), {
      raw: 0,
      gz: 0,
    });

rows
  .sort((a, b) => b.gz - a.gz)
  .slice(0, 12)
  .forEach((r) => console.log(`${r.gz}\t${r.raw}\t${r.file}`));
console.log("js total (gz raw)", sum(".js"));
console.log("css total (gz raw)", sum(".css"));
console.log("js files in first load", rows.filter((r) => r.file.endsWith(".js")).length);
