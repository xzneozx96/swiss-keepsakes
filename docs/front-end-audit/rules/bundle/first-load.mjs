// Reads graph.json from build-graph.mjs and reports what ships in the first load:
// the entry chunk plus every chunk it reaches through static imports.
//
// usage: node first-load.mjs <graph.json> [top-n]
// prints: first-load chunks, top modules by rendered bytes with their importers,
// bytes per package, and first-load modules whose only importers are lazy chunks.
import { readFileSync } from "node:fs";

const [graphPath, topArg] = process.argv.slice(2);

if (!graphPath) {
  console.error("usage: node first-load.mjs <graph.json> [top-n]");
  process.exit(1);
}

const top = Number(topArg ?? 10);
const { chunks, modules } = JSON.parse(readFileSync(graphPath, "utf8"));
const byFile = new Map(chunks.map((c) => [c.file, c]));
const entry = chunks.find((c) => c.isEntry);
const first = new Set();
const walk = (file) => {
  if (first.has(file)) return;
  first.add(file);
  byFile.get(file).imports.forEach(walk);
};

walk(entry.file);

const short = (id) =>
  id
    .replace(/^.*\/front-end\/node_modules\//, "nm:")
    .replace(/^.*\/front-end\//, "")
    .replace(/\?.*$/, "");
const pkgOf = (id) => {
  const m = id.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/);

  return m ? m[1] : id.includes("/front-end/src/") ? "src" : "other";
};

const firstChunks = [...first].map((f) => byFile.get(f));
const total = firstChunks.reduce((a, c) => a + c.size, 0);

console.log(`# first-load chunks: ${firstChunks.length}, minified bytes ${total}`);
for (const c of firstChunks.sort((a, b) => b.size - a.size).slice(0, 15)) {
  console.log(`chunk\t${c.size}\t${c.file}`);
}

const rows = firstChunks.flatMap((c) =>
  Object.entries(c.modules).map(([id, len]) => ({ id, len, chunk: c.file })),
);

// Importers statically reachable from the entry module (barrels that render no code included).
const inFirst = new Set();
const stack = [Object.keys(byFile.get(entry.file).modules).find((id) => /\/src\/main\.tsx$/.test(id))];

while (stack.length) {
  const id = stack.pop();

  if (!id || inFirst.has(id)) continue;
  inFirst.add(id);
  stack.push(...(modules[id]?.importedIds ?? []));
}

console.log(`\n# top ${top} first-load modules by rendered bytes (pre-minify); lazy: marks an importer outside the first load`);
for (const r of rows.sort((a, b) => b.len - a.len).slice(0, top)) {
  const importers = (modules[r.id]?.importers ?? []).map((i) => (inFirst.has(i) || !modules[i] ? short(i) : `lazy:${short(i)}`));

  console.log(
    `module\t${r.len}\t${short(r.id)}\t${r.chunk}\timporters(${importers.length}): ${importers.slice(0, 6).join(", ")}${importers.length > 6 ? ", ..." : ""}`,
  );
}

const perPkg = new Map();

for (const r of rows) perPkg.set(pkgOf(r.id), (perPkg.get(pkgOf(r.id)) ?? 0) + r.len);
console.log("\n# first-load rendered bytes per package");
for (const [pkg, len] of [...perPkg].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`pkg\t${len}\t${pkg}`);
}

// Source modules in the first load: which first-load chunk imports pulled each one in.
const firstIds = new Set(rows.map((r) => r.id));
const srcRows = rows.filter((r) => r.id.includes("/front-end/src/"));

console.log(`\n# first-load src modules: ${srcRows.length}`);
for (const r of srcRows.sort((a, b) => b.len - a.len).slice(0, 40)) {
  const importers = (modules[r.id]?.importers ?? []).map((i) => (firstIds.has(i) ? short(i) : `lazy:${short(i)}`));

  console.log(`src\t${r.len}\t${short(r.id)}\t${importers.slice(0, 5).join(", ")}`);
}
