// Runs babel-plugin-react-compiler (vite.config.ts options: defaults, compilationMode "infer") over
// every .ts/.tsx file in a source root and reports which functions compiled and which did not.
// Compiler credit in report.tsv only applies to functions listed as compiled here.
// Usage: node compiler-census.mjs [srcRoot]   (default: front-end/src)
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontEnd = path.resolve(here, "../../../../front-end");
const require = createRequire(path.join(frontEnd, "package.json"));
const babel = require("@babel/core");
const compiler = require("babel-plugin-react-compiler");

const root = path.resolve(process.argv[2] ?? path.join(frontEnd, "src"));
// Same file filter as reactCompilerPreset's rolldown filter.
const codeFilter = /forwardRef|memo|\b(?:[A-Z]|use[A-Z0-9])/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") && name !== "routeTree.gen.ts") yield full;
  }
}

let files = 0;
let compiled = 0;
const problems = [];
const optOut = [];

for (const file of walk(root)) {
  const code = readFileSync(file, "utf8");
  if (!codeFilter.test(code)) continue;
  files++;
  if (/['"]use no memo['"]/.test(code)) optOut.push(path.relative(root, file));
  const events = [];
  try {
    babel.transformSync(code, {
      filename: file,
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ["jsx", "typescript"] },
      plugins: [[compiler, { logger: { logEvent: (_f, e) => events.push(e) } }]],
    });
  } catch (err) {
    problems.push(`${path.relative(root, file)}\tTRANSFORM_THROW\t${String(err.message).split("\n")[0]}`);
    continue;
  }
  for (const e of events) {
    if (e.kind === "CompileSuccess") {
      compiled++;
      continue;
    }
    const line = e.fnLoc?.start?.line ?? e.detail?.loc?.start?.line ?? e.detail?.options?.loc?.start?.line ?? "?";
    const reason = e.detail?.reason ?? e.detail?.options?.reason ?? e.reason ?? "";
    problems.push(`${path.relative(root, file)}:${line}\t${e.kind}\t${e.fnName ?? ""}\t${String(reason).split("\n")[0]}`);
  }
}

console.log(`files_scanned\t${files}`);
console.log(`functions_compiled\t${compiled}`);
console.log(`non_success_events\t${problems.length}`);
console.log(`use_no_memo_files\t${optOut.length}`);
for (const p of problems) console.log(p);
for (const f of optOut) console.log(`use-no-memo\t${f}`);
