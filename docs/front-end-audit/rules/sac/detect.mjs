// Re-runnable detectors for the server-*, async-* and client-* rules of the sac family.
// Usage: node detect.mjs [srcDir]   (default ../../../../front-end/src). Prints rule<TAB>hits, then the sites.
import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../front-end");
const src = resolve(process.argv[2] ?? join(root, "src"));
const ts = createRequire(join(root, "package.json"))("typescript");

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(n) && !n.endsWith(".gen.ts")) files.push(p);
  }
})(src);

const hits = {};
const add = (rule, sf, node, note = "") => {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  (hits[rule] ??= []).push(`${relative(src, sf.fileName)}:${line + 1}${note ? "  " + note : ""}`);
};
const SCROLLY = new Set(["touchstart", "touchmove", "wheel", "mousewheel", "scroll"]);
const idsIn = (n, set = new Set()) => {
  if (ts.isIdentifier(n)) set.add(n.text);
  ts.forEachChild(n, (c) => void idsIn(c, set));
  return set;
};
const hasAwait = (n) => {
  let f = false;
  (function v(x) {
    if (f) return;
    if (ts.isAwaitExpression(x)) return void (f = true);
    if (ts.isFunctionLike(x) && x !== n) return;
    ts.forEachChild(x, v);
  })(n);
  return f;
};
const declared = (s) => {
  const out = new Set();
  if (ts.isVariableStatement(s))
    for (const d of s.declarationList.declarations) idsIn(d.name, out);
  return out;
};

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  (function visit(n) {
    // async-parallel / async-dependencies: neighbouring awaiting statements in one block
    if (ts.isBlock(n) || ts.isSourceFile(n)) {
      const st = n.statements;
      const at = st.map((s, k) => (hasAwait(s) ? k : -1)).filter((k) => k >= 0);
      for (let m = 0; m + 1 < at.length; m++) {
        const i = at[m], j = at[m + 1];
        const a = new Set();
        for (let k = i; k < j; k++) declared(st[k]).forEach((x) => a.add(x));
        const b = idsIn(st[j]);
        const dependent = [...a].some((x) => b.has(x));
        add(dependent ? "async-dependencies:chain" : "async-parallel", sf, st[j], dependent ? "awaits a value from the await above" : `independent of the await at line ${sf.getLineAndCharacterOfPosition(st[i].getStart(sf)).line + 1}`);
      }
      // async-defer-await: `const x = await ...; if (cond) return/throw` where neither cond nor branch uses x
      for (let i = 0; i + 1 < st.length; i++) {
        const s = st[i], nx = st[i + 1];
        if (!ts.isVariableStatement(s) || !hasAwait(s) || !ts.isIfStatement(nx)) continue;
        const exits = (t) => ts.isReturnStatement(t) || ts.isThrowStatement(t) || (ts.isBlock(t) && t.statements.length > 0 && exits(t.statements[t.statements.length - 1]));
        if (!exits(nx.thenStatement)) continue;
        const used = idsIn(nx.expression);
        idsIn(nx.thenStatement, used);
        const names = declared(s);
        if (![...names].some((x) => used.has(x))) add("async-defer-await", sf, s, "awaited value unused by the early exit below");
      }
    }
    // async-cheap-condition-before-await: `await x && cheap`
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && hasAwait(n.left) && !hasAwait(n.right))
      add("async-cheap-condition-before-await", sf, n);
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
      if (name === "addEventListener") {
        const [ev, , opt] = n.arguments;
        const target = ts.isPropertyAccessExpression(callee) ? callee.expression.getText(sf) : "";
        const evName = ev && ts.isStringLiteralLike(ev) ? ev.text : null;
        const passive = opt && ts.isObjectLiteralExpression(opt) && opt.properties.some((p) => p.name?.getText(sf) === "passive" && (!p.initializer || p.initializer.kind === ts.SyntaxKind.TrueKeyword));
        add("client-event-listeners", sf, n, `${target}.${evName ?? "<" + (ev?.getText(sf) ?? "?") + ">"}`);
        if (evName && SCROLLY.has(evName) && !passive) add("client-passive-event-listeners", sf, n, `${evName} not passive`);
        if (!evName) add("client-passive-event-listeners:unresolved-event-name", sf, n, ev?.getText(sf) ?? "?");
      }
      if (name === "fetch") add("client-swr-dedup:fetch", sf, n);
    }
    if (ts.isIdentifier(n) && (n.text === "localStorage" || n.text === "sessionStorage")) add("client-localstorage-schema:direct-storage", sf, n, n.text);
    if (ts.isImportDeclaration(n) && /^(swr|@tanstack\/react-query)/.test(n.moduleSpecifier.text)) add("client-swr-dedup:cache-lib-import", sf, n);
    // JSX scroll/touch/wheel handlers are React synthetic events: listed only for the record
    if (ts.isJsxAttribute(n) && /^on(Scroll|Wheel|Touch(Start|Move|End|Cancel))$/.test(n.name.getText(sf))) add("client-passive-event-listeners:react-prop", sf, n, n.name.getText(sf));
    ts.forEachChild(n, visit);
  })(sf);
}

// grep-style checks over raw text
const raw = (rule, re) => {
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((l, i) => re.test(l) && (hits[rule] ??= []).push(`${relative(src, file)}:${i + 1}  ${l.trim().slice(0, 90)}`));
  }
};
raw("server-premise:directives", /["']use (server|client)["']/);
raw("server-premise:ssr-or-node-http", /react-dom\/server|renderToString|renderToPipeableStream|createServerFn|from ["']next\/|from ["']node:http|IncomingMessage|createServer\(/);
raw("server-premise:route-handlers", /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b|Response\.json\(|new Response\(/);
raw("server-premise:react-cache-lru", /\bcache\(|lru-cache|React\.cache|unstable_cache/);
raw("server-premise:after()", /\bafter\(\s*(async|\()/);

const order = [
  "server-premise:directives", "server-premise:ssr-or-node-http", "server-premise:route-handlers", "server-premise:react-cache-lru", "server-premise:after()",
  "async-parallel", "async-dependencies:chain", "async-defer-await", "async-cheap-condition-before-await",
  "client-event-listeners", "client-passive-event-listeners", "client-passive-event-listeners:unresolved-event-name", "client-passive-event-listeners:react-prop",
  "client-localstorage-schema:direct-storage", "client-swr-dedup:fetch", "client-swr-dedup:cache-lib-import",
];
for (const r of order) console.log(`${r}\t${(hits[r] ?? []).length}`);
console.log("");
for (const r of order) if (hits[r]?.length) { console.log(`## ${r}`); hits[r].forEach((h) => console.log("  " + h)); }
