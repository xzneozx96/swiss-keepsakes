// pre-Start only: reads index.html
// Production build of front-end with the same plugins as front-end/vite.config.ts, plus a
// plugin that dumps the chunk and module graph (rendered bytes per module, importers).
// Writes nothing inside the repo: outDir, the generated route tree copy and the router
// generator's tmp dir all go to the directory given as argv[2].
//
// Counterfactual builds: pass a variant name from cf-patches.mjs as argv[3]. Its patches
// rewrite a source file in memory (a pre `load` hook); the file on disk is never touched.
//
// usage: node build-graph.mjs <out-dir> [variant]
// output: <out-dir>/dist (the build), <out-dir>/graph.json (the graph)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import variants from "./cf-patches.mjs";

const FE = new URL("../../../../front-end/", import.meta.url).pathname;
const [outArg, variant] = process.argv.slice(2);
// Absolute before the chdir below, so a relative <out-dir> never lands inside front-end/.
const out = outArg && resolve(outArg);

if (!out || (variant && !variants[variant])) {
  console.error(`usage: node build-graph.mjs <out-dir> [${Object.keys(variants).join("|")}]`);
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const load = (p) => import(pathToFileURL(join(FE, "node_modules", p)).href);
const { build } = await load("vite/dist/node/index.js");
const reactMod = await load("@vitejs/plugin-react/dist/index.js");
const { default: babel } = await load("@rolldown/plugin-babel/dist/index.mjs");
const { default: tailwindcss } = await load("@tailwindcss/vite/dist/index.mjs");
const { tanstackRouter } = await load("@tanstack/router-plugin/dist/esm/vite.js");
const react = reactMod.default;
const { reactCompilerPreset } = reactMod;

process.chdir(FE);

const patches = variant ? variants[variant] : {};
const applied = new Set();
const patchSource = {
  name: "audit-patch-source",
  enforce: "pre",
  load(id) {
    const file = id.replace(/\?.*$/, "");
    // A key starting with "re:" is a regex over the absolute path (for node_modules files).
    const rel = Object.keys(patches).find((p) => (p.startsWith("re:") ? new RegExp(p.slice(3)).test(file) : file === join(FE, p)));

    if (!rel) return null;
    const before = readFileSync(file, "utf8");
    const after = patches[rel](before);

    if (after === before) throw new Error(`patch for ${rel} changed nothing`);
    applied.add(rel);

    return after;
  },
};

const graphDump = {
  name: "audit-graph-dump",
  generateBundle(_options, bundle) {
    const chunks = [];
    const modules = {};

    for (const item of Object.values(bundle)) {
      if (item.type !== "chunk") continue;
      chunks.push({
        file: item.fileName,
        isEntry: item.isEntry,
        isDynamicEntry: item.isDynamicEntry,
        facade: item.facadeModuleId,
        imports: item.imports,
        dynamicImports: item.dynamicImports,
        size: item.code.length,
        modules: Object.fromEntries(
          Object.entries(item.modules).map(([id, m]) => [id, m.renderedLength]),
        ),
      });
    }
    // Every module in the graph, including pure re-export barrels that render no code.
    for (const id of this.getModuleIds()) {
      const info = this.getModuleInfo(id);

      modules[id] = {
        importedIds: info?.importedIds ?? [],
        dynamicallyImportedIds: info?.dynamicallyImportedIds ?? [],
        importers: info?.importers ?? [],
        dynamicImporters: info?.dynamicImporters ?? [],
      };
    }
    writeFileSync(join(out, "graph.json"), JSON.stringify({ chunks, modules }));
  },
};

await build({
  configFile: false,
  root: FE,
  base: "./",
  logLevel: "info",
  resolve: { tsconfigPaths: true },
  plugins: [
    patchSource,
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      // Keep the generator's writes out of the repo; the app still imports src/routeTree.gen.ts.
      generatedRouteTree: join(out, "routeTree.gen.ts"),
      tmpDir: join(out, "tsr-tmp"),
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    graphDump,
  ],
  build: { outDir: join(out, "dist"), emptyOutDir: true },
});

const missed = Object.keys(patches).filter((p) => !applied.has(p));

if (missed.length) throw new Error(`patches never applied: ${missed.join(", ")}`);
console.log("variant", variant ?? "none", "patched", [...applied].join(", ") || "-");
console.log("wrote", join(out, "graph.json"));
