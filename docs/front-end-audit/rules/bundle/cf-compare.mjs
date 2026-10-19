// Compares first-load weight across counterfactual builds made by build-graph.mjs.
// Same measurement as docs/audit/measure-initial-load.mjs (index.html script, modulepreload
// and stylesheet refs, gzip level default), plus which first-load files appear or vanish.
//
// usage: node cf-compare.mjs <cf-root> <variant>...   (first variant is the baseline)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const [root, ...names] = process.argv.slice(2);

if (!root || names.length < 2) {
  console.error("usage: node cf-compare.mjs <cf-root> <baseline> <variant>...");
  process.exit(1);
}

function firstLoad(dir) {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const refs = [
    ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
    ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  ].map((m) => m[1].replace(/^\.\//, ""));
  const files = [...new Set(refs)].filter((p) => !p.startsWith("http"));
  const rows = files.map((p) => {
    const buf = readFileSync(join(dir, p));

    return { file: p, raw: buf.length, gz: gzipSync(buf).length, text: buf.toString("utf8") };
  });
  const sum = (ext) =>
    rows.filter((r) => r.file.endsWith(ext)).reduce((a, r) => ({ raw: a.raw + r.raw, gz: a.gz + r.gz }), { raw: 0, gz: 0 });
  const css = rows.filter((r) => r.file.endsWith(".css")).map((r) => r.text).join("");

  return {
    rows,
    js: sum(".js"),
    css: sum(".css"),
    jsFiles: rows.filter((r) => r.file.endsWith(".js")).length,
    maplibreCssRules: new Set(css.match(/\.maplibregl-[\w-]+/g) ?? []).size,
  };
}

// First load plus what the home screen fetches next: the _guest layout and / route component
// chunks and their static imports (read from graph.json beside dist).
function homeScreenGz(variantDir) {
  const { chunks } = JSON.parse(readFileSync(join(variantDir, "graph.json"), "utf8"));
  const byFile = new Map(chunks.map((c) => [c.file, c]));
  const set = new Set();
  const walk = (f) => {
    if (set.has(f)) return;
    set.add(f);
    byFile.get(f).imports.forEach(walk);
  };

  walk(chunks.find((c) => c.isEntry).file);
  chunks.filter((c) => /src\/routes\/(_guest\.tsx|_guest\/index\.tsx)\?tsr-split=component/.test(c.facade ?? "")).forEach((c) => walk(c.file));

  return [...set].reduce((a, f) => a + gzipSync(readFileSync(join(variantDir, "dist", f))).length, 0);
}

// Strip the content hash so the same chunk can be matched across builds.
const stem = (f) => f.replace(/-[\w-]{8}\.(js|css)$/, ".$1");
const base = firstLoad(join(root, names[0], "dist"));
const baseStems = new Map(base.rows.map((r) => [stem(r.file), r]));

const baseHome = homeScreenGz(join(root, names[0]));

console.log("variant\tjs_gz\tjs_raw\tcss_gz\tcss_raw\tjs_files\tmaplibre_css_rules\tdelta_js_gz\tdelta_js_raw\tdelta_css_gz\thome_screen_js_gz\tdelta_home_gz");
for (const name of names) {
  const m = name === names[0] ? base : firstLoad(join(root, name, "dist"));
  const home = homeScreenGz(join(root, name));

  console.log(
    [name, m.js.gz, m.js.raw, m.css.gz, m.css.raw, m.jsFiles, m.maplibreCssRules, m.js.gz - base.js.gz, m.js.raw - base.js.raw, m.css.gz - base.css.gz, home, home - baseHome].join("\t"),
  );
}

for (const name of names.slice(1)) {
  const m = firstLoad(join(root, name, "dist"));
  const stems = new Map(m.rows.map((r) => [stem(r.file), r]));
  const gone = [...baseStems.keys()].filter((s) => !stems.has(s));
  const added = [...stems.keys()].filter((s) => !baseStems.has(s));
  const changed = [...stems.keys()]
    .filter((s) => baseStems.has(s) && Math.abs(stems.get(s).raw - baseStems.get(s).raw) > 500)
    .map((s) => `${s} ${baseStems.get(s).raw}->${stems.get(s).raw}`);

  console.log(`\n## ${name}`);
  console.log(`left first load: ${gone.map((s) => `${s} (${baseStems.get(s).raw})`).join(", ") || "-"}`);
  console.log(`joined first load: ${added.map((s) => `${s} (${stems.get(s).raw})`).join(", ") || "-"}`);
  console.log(`changed >500B raw: ${changed.join(", ") || "-"}`);
}
