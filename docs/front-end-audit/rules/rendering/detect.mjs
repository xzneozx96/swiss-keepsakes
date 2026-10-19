// Usage: node detect.mjs [srcRoot=front-end/src] [rule]   prints "rule<TAB>hits" then site lines (-v)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const FE = path.resolve(import.meta.dirname, "../../../../front-end");
const require = createRequire(FE + "/package.json");
const ts = require("typescript");
const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const verbose = process.argv.includes("-v");
const root = path.resolve(args[0] ?? FE + "/src");
const only = args[1];
const out = {};
const add = (rule, file, node, sf, note = "") => {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
  (out[rule] ??= []).push(`${path.relative(path.resolve(FE, ".."), file)}:${line + 1} ${note}`);
};
function walkFiles(d, exts, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkFiles(p, exts, acc);
    else if (exts.some((x) => p.endsWith(x))) acc.push(p);
  }
  return acc;
}
const files = walkFiles(root, [".tsx", ".ts"]).filter((f) => !f.endsWith(".d.ts"));
const cfg = ts.getParsedCommandLine?.call ? null : null;
const program = ts.createProgram(files, {
  jsx: ts.JsxEmit.ReactJSX, strict: true, target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext,
  skipLibCheck: true, noEmit: true, baseUrl: FE, paths: { "@/*": ["src/*"] }, types: [],
});
const checker = program.getTypeChecker();
const isNumberish = (t) => {
  if (t.isUnion()) return t.types.some(isNumberish);
  return !!(t.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BigInt)) || (t.flags & ts.TypeFlags.Any) !== 0 && false;
};
const BOOLNAME = /^(is|has)?(loading|pending|busy|saving|submitting|sending|typing|streaming|generating|searching|fetching|processing|uploading)$/i;
const TABCOND = /tab|view|step|mode|panel|section|page|sheet|open|selected|active|expanded/i;
for (const sf of program.getSourceFiles()) {
  if (!files.includes(sf.fileName)) continue;
  const iconNames = new Set();
  sf.forEachChild((n) => {
    if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === "@/components/icons" && n.importClause?.namedBindings?.elements)
      n.importClause.namedBindings.elements.forEach((e) => iconNames.add(e.name.text));
  });
  const visit = (n) => {
    // conditional-render
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      const p = n.parent;
      const inJsx = ts.isJsxExpression(p) || (ts.isParenthesizedExpression(p) && ts.isJsxExpression(p.parent));
      const rhs = n.right;
      const rhsJsx = ts.isJsxElement(rhs) || ts.isJsxSelfClosingElement(rhs) || ts.isJsxFragment(rhs) || ts.isParenthesizedExpression(rhs);
      if (inJsx && rhsJsx && isNumberish(checker.getTypeAtLocation(n.left)))
        add("rendering-conditional-render", sf.fileName, n, sf, n.left.getText().slice(0, 60));
      // activity heuristic: tab-like condition, stateful panel
      if (rhsJsx && TABCOND.test(n.left.getText()) && /===|==/.test(n.left.getText()) )
        add("rendering-activity", sf.fileName, n, sf, n.getText().replace(/\s+/g, " ").slice(0, 80));
    }
    // svg-animate
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText();
      if (tag === "svg" || iconNames.has(tag)) {
        const cn = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.text === "className");
        if (cn && /animate-|transition|motion-safe:animate/.test(cn.getText()))
          add("rendering-animate-svg-wrapper", sf.fileName, n, sf, `${tag} ${cn.getText().replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }
    // usetransition: boolean useState with loading-ish name
    if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer)
      && n.initializer.expression.getText() === "useState") {
      const first = n.name.elements[0]?.getText?.() ?? "";
      const arg = n.initializer.arguments[0]?.getText();
      if (BOOLNAME.test(first) && /^(true|false)$/.test(arg ?? ""))
        add("rendering-usetransition-loading", sf.fileName, n, sf, n.getText().slice(0, 80));
    }
    // hoist-jsx: const x = <static jsx> inside a function
    if (ts.isVariableDeclaration(n) && n.initializer && (ts.isJsxElement(n.initializer) || ts.isJsxSelfClosingElement(n.initializer))) {
      let f = n.parent; while (f && !ts.isFunctionLike(f) && !ts.isSourceFile(f)) f = f.parent;
      if (f && !ts.isSourceFile(f)) {
        let dyn = false;
        const chk = (x) => { if (ts.isJsxExpression(x) || ts.isJsxSpreadAttribute(x)) dyn = true; ts.forEachChild(x, chk); };
        chk(n.initializer);
        if (!dyn) add("rendering-hoist-jsx", sf.fileName, n, sf, n.name.getText());
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
// content-visibility / resource hints / defer / hydration: text greps
const rg = (rule, re, exts) => {
  for (const f of walkFiles(root, exts)) {
    fs.readFileSync(f, "utf8").split("\n").forEach((l, i) => { if (re.test(l)) (out[rule] ??= []).push(`${path.relative(path.resolve(FE, ".."), f)}:${i + 1} ${l.trim().slice(0, 90)}`); });
  }
};
rg("rendering-content-visibility", /content-visibility|contain-intrinsic|\[content-visibility/, [".tsx", ".ts", ".css"]);
rg("rendering-hydration-suppress-warning", /suppressHydrationWarning|hydrateRoot|renderToString/, [".tsx", ".ts"]);
rg("rendering-resource-hints", /\b(prefetchDNS|preconnect|preload|preinit|preloadModule|preinitModule)\(/, [".tsx", ".ts"]);
// svg-precision: path data with >3 decimals
const longNum = /-?\d*\.\d{4,}/g;
let preciseHits = 0, saved = 0, savedTo1 = 0;
const svgFiles = [...walkFiles(root, [".tsx", ".ts", ".svg"])];
for (const f of svgFiles) {
  const txt = fs.readFileSync(f, "utf8");
  const ds = [...txt.matchAll(/\b(?:d|points)=\{?["'`]([^"'`]+)["'`]/g)];
  let fileHits = 0;
  for (const m of ds) {
    const nums = m[1].match(longNum) ?? [];
    for (const x of nums) { fileHits++; const dec = x.split(".")[1].length; saved += dec - 3; savedTo1 += dec - 1; }
  }
  if (fileHits) { preciseHits += fileHits; (out["rendering-svg-precision"] ??= []).push(`${path.relative(path.resolve(FE, ".."), f)} ${fileHits} numbers`); }
}
if (!only || only === "rendering-svg-precision") (out["__svg_bytes"] = [`bytes_saved_at_3dp=${saved} bytes_saved_at_1dp=${savedTo1} numbers=${preciseHits}`]);
// script defer: index.html
const idx = path.join(FE, "index.html");
if (fs.existsSync(idx) && root.startsWith(FE)) {
  const h = fs.readFileSync(idx, "utf8");
  for (const m of h.matchAll(/<script\b([^>]*)>/g)) if (!/type="module"|\bdefer\b|\basync\b/.test(m[1])) (out["rendering-script-defer-async"] ??= []).push(`index.html blocking script: ${m[0]}`);
}
const rules = ["rendering-activity","rendering-animate-svg-wrapper","rendering-conditional-render","rendering-content-visibility","rendering-hoist-jsx","rendering-hydration-no-flicker","rendering-hydration-suppress-warning","rendering-resource-hints","rendering-script-defer-async","rendering-svg-precision","rendering-usetransition-loading"];
for (const r of rules) if (!only || only === r) {
  const hits = out[r] ?? [];
  console.log(`${r}\t${r === "rendering-hydration-no-flicker" ? "n/a(no SSR; see index.html)" : hits.length}`);
  if (verbose) hits.forEach((h) => console.log("   " + h));
}
if (verbose && out.__svg_bytes) console.log(out.__svg_bytes[0]);
