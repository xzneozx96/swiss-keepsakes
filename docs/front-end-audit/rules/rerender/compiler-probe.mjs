// Runs babel-plugin-react-compiler (same options as vite.config.ts: reactCompilerPreset() = defaults)
// over one file and prints the compiled output, so claims about what the compiler covers are checked,
// not assumed. Usage: node compiler-probe.mjs <file.tsx> [functionName]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, "../../../../front-end/package.json"));
const babel = require("@babel/core");
const compiler = require("babel-plugin-react-compiler");

const [file, only] = process.argv.slice(2);
const events = [];
const out = babel.transformSync(readFileSync(file, "utf8"), {
  filename: file,
  babelrc: false,
  configFile: false,
  parserOpts: { plugins: ["jsx", "typescript"] },
  plugins: [[compiler, { logger: { logEvent: (_f, e) => events.push(e) } }]],
});

for (const e of events) {
  if (e.kind === "CompileSuccess") continue;
  console.log(`[compiler] ${e.kind} ${e.fnName ?? ""} ${e.detail?.reason ?? e.detail?.options?.reason ?? ""}`.trim());
}

if (!only) {
  console.log(out.code);
} else {
  const start = out.code.indexOf(`function ${only}(`);
  const next = out.code.indexOf("\nexport ", start + 1);
  console.log(out.code.slice(start, next === -1 ? undefined : next));
}
