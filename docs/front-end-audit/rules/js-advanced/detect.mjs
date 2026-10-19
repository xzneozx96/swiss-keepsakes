// Detector for the js-advanced family. Usage: node detect.mjs [srcDir] [--quiet]
// Prints one line per hit (rule<TAB>file:line<TAB>detail) then a summary (rule<TAB>hits).
// TypeScript is resolved from front-end/node_modules.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../front-end");
const ts = createRequire(path.join(root, "package.json"))("typescript");
const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const srcDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(root, "src"));

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) files.push(p);
  }
})(srcDir);

const sortSites = [];
const hits = {};
const RULES = ["js-batch-dom-css","js-cache-function-results","js-cache-property-access","js-cache-storage","js-combine-iterations","js-early-exit","js-flatmap-filter","js-hoist-regexp","js-index-maps","js-length-check-first","js-min-max-loop","js-request-idle-callback","js-set-map-lookups","js-tosorted-immutable","advanced-effect-event-deps","advanced-event-handler-refs","advanced-init-once","advanced-use-latest"];
RULES.forEach((r) => (hits[r] = 0));
const rel = (f) => path.relative(root, f);
function hit(rule, sf, node, detail) {
  hits[rule]++;
  if (quiet) return;
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  console.log(`${rule}\t${rel(sf.fileName)}:${line + 1}\t${detail}`);
}

const ITER = new Set(["map","filter","flatMap","forEach","reduce","some","every","find","findIndex"]);
const isFn = (n) => ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n);
const txt = (n, sf) => n.getText(sf).replace(/\s+/g, " ");
const short = (s, n = 90) => (s.length > n ? s.slice(0, n) + "…" : s);

function fnName(n) {
  if (n.name && ts.isIdentifier(n.name)) return n.name.text;
  const p = n.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p && ts.isCallExpression(p)) {
    const c = p.expression;
    if (ts.isIdentifier(c) && /^(memo|forwardRef)$/.test(c.text) && p.parent && ts.isVariableDeclaration(p.parent)) return p.parent.name.text;
  }
  return null;
}
const isComponentish = (name) => !!name && /^(use[A-Z]|[A-Z])/.test(name);
function enclosingFns(node) {
  const out = [];
  for (let p = node.parent; p; p = p.parent) if (isFn(p)) out.push(p);
  return out;
}
function nearestNamed(node) {
  for (const f of enclosingFns(node)) {
    const nm = fnName(f);
    if (nm) return { fn: f, name: nm };
  }
  return null;
}
// Is `node` inside a callback passed to an ITER method (map/filter/...) or a for loop?
function iterContext(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isWhileStatement(p)) return "loop";
    if (isFn(p) && p.parent && ts.isCallExpression(p.parent) && p.parent.arguments.includes(p)) {
      const c = p.parent.expression;
      if (ts.isPropertyAccessExpression(c) && ITER.has(c.name.text)) return `.${c.name.text}()`;
    }
    if (isFn(p) && fnName(p)) return null;
  }
  return null;
}
const methodOf = (call) => (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : null);
const isFilterBoolean = (call) => {
  const a = call.arguments[0];
  if (!a) return false;
  if (ts.isIdentifier(a) && a.text === "Boolean") return true;
  if (ts.isArrowFunction(a) && a.parameters.length === 1 && ts.isIdentifier(a.parameters[0].name)) {
    const pn = a.parameters[0].name.text, b = a.body;
    if (ts.isIdentifier(b) && b.text === pn) return true;
    if (ts.isBinaryExpression(b) && ts.isIdentifier(b.left) && b.left.text === pn && /ExclamationEquals/.test(ts.SyntaxKind[b.operatorToken.kind]) && (b.right.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(b.right) && b.right.text === "undefined"))) return true;
    if (ts.isBinaryExpression(b) && b.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return false;
    if (b.kind === ts.SyntaxKind.TrueKeyword) return false;
  }
  return false;
};

for (const file of files) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const effectEvents = new Set();
  // pass 1: effect event names
  (function v(n) {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && n.initializer.expression.text === "useEffectEvent" && ts.isIdentifier(n.name)) effectEvents.add(n.name.text);
    ts.forEachChild(n, v);
  })(sf);

  const filterByReceiver = new Map(); // fn -> Map(receiverText -> [nodes])
  const callsByFn = new Map();

  (function visit(n) {
    // ---- calls ----
    if (ts.isCallExpression(n)) {
      const m = methodOf(n);
      const recv = ts.isPropertyAccessExpression(n.expression) ? n.expression.expression : null;

      // js-combine-iterations / js-flatmap-filter: chains
      if (m && recv && ts.isCallExpression(recv)) {
        const rm = methodOf(recv);
        if (m === "filter" && rm === "map" && isFilterBoolean(n)) hit("js-flatmap-filter", sf, n, `map().filter(non-null) ${short(txt(n, sf), 100)}`);
        if (m === "filter" && rm === "map" && !isFilterBoolean(n)) hit("js-flatmap-filter", sf, n, `[review] map().filter(custom) ${short(txt(n.arguments[0] ?? n, sf), 70)}`);
        if ((m === "filter" && rm === "filter") || (m === "map" && rm === "map") || (m === "filter" && rm === "map") ) {
          if (!(m === "filter" && rm === "map")) hit("js-combine-iterations", sf, n, `chain ${rm}().${m}()`);
        }
        // 3-long chains of iterating methods
        if (recv.expression && ts.isPropertyAccessExpression(recv.expression) && ts.isCallExpression(recv.expression.expression)) {
          const r2 = methodOf(recv.expression.expression);
          if (ITER.has(m) && ITER.has(rm) && ITER.has(r2)) hit("js-combine-iterations", sf, n, `chain ${r2}().${rm}().${m}()`);
        }
      }
      // js-combine-iterations: same receiver filtered/mapped repeatedly in one function
      if ((m === "filter" || m === "map") && recv && (ts.isIdentifier(recv) || ts.isPropertyAccessExpression(recv))) {
        const f = enclosingFns(n)[0] ?? sf;
        const mm = filterByReceiver.get(f) ?? new Map();
        const k = `${txt(recv, sf)}.${m}`;
        mm.set(k, [...(mm.get(k) ?? []), n]);
        filterByReceiver.set(f, mm);
      }

      // js-tosorted / js-min-max
      if (m === "sort" || m === "reverse") {
        const r = recv ? txt(recv, sf) : "";
        const fresh = /^\[\.\.\./.test(r) || /\.(slice|filter|map|flatMap|concat|toSorted)\(.*\)$/.test(r) || /^Array\.from|^Object\.(keys|values|entries)/.test(r) || /^\[/.test(r);
        const cls = fresh ? "copy-then-sort" : "IN-PLACE?";
        if (!fresh) hit("js-tosorted-immutable", sf, n, `${m} on \`${short(r, 60)}\``);
        else if (!quiet) { /* counted separately below */ }
        sortSites.push({ sf, n, m, r, fresh });
        // min/max: sorted result indexed [0] / [length-1] / .at / destructured
        const p = n.parent;
        if (m === "sort" && p && ((ts.isElementAccessExpression(p) && p.expression === n) || (ts.isPropertyAccessExpression(p) && p.name.text === "at"))) {
          hit("js-min-max-loop", sf, n, `sort()[idx] directly: ${short(txt(p, sf), 80)}`);
        } else if (m === "sort" && p && ts.isVariableDeclaration(p)) {
          const nm = ts.isIdentifier(p.name) ? p.name.text : null;
          if (nm) {
            const scope = enclosingFns(n)[0] ?? sf;
            let used = false;
            (function u(x) {
              if (ts.isElementAccessExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === nm) used = true;
              ts.forEachChild(x, u);
            })(scope);
            const onlyIdx = used;
            if (onlyIdx) hit("js-min-max-loop", sf, n, `[review] sorted var \`${nm}\` is indexed: ${short(r, 50)}`);
          } else if (ts.isArrayBindingPattern(p.name)) hit("js-min-max-loop", sf, n, `sort() destructured: ${short(txt(p, sf), 80)}`);
        }
      }

      // js-early-exit: existence/first checks done by materialising a filtered array
      if (m === "filter" && n.parent) {
        const pp = n.parent;
        if (ts.isPropertyAccessExpression(pp) && pp.name.text === "length" && pp.parent && ts.isBinaryExpression(pp.parent) && /^(0|1)$/.test(pp.parent.right.getText(sf)) && /(GreaterThanToken|EqualsEqualsEqualsToken|ExclamationEqualsEqualsToken)/.test(ts.SyntaxKind[pp.parent.operatorToken.kind])) hit("js-early-exit", sf, n, `[review] filter().length compared to 0/1 (use some/find): ${short(txt(pp.parent, sf), 90)}`);
        if (ts.isElementAccessExpression(pp) && pp.expression === n && pp.argumentExpression.getText(sf) === "0") hit("js-early-exit", sf, n, `[review] filter()[0] (use find): ${short(txt(pp, sf), 90)}`);
      }
      // js-length-check-first
      if (m === "join" && recv && ts.isCallExpression(recv) && /^(sort|toSorted)$/.test(methodOf(recv) ?? "")) hit("js-length-check-first", sf, n, `sort().join(): ${short(txt(n, sf), 80)}`);
      if (ts.isCallExpression(n) && txt(n.expression, sf) === "JSON.stringify") {
        const p = n.parent;
        if (p && ts.isBinaryExpression(p) && /EqualsEquals/.test(ts.SyntaxKind[p.operatorToken.kind]) && ts.isCallExpression(p.left) && ts.isCallExpression(p.right) && txt(p.left.expression, sf) === "JSON.stringify" && txt(p.right.expression, sf) === "JSON.stringify" && p.left === n) hit("js-length-check-first", sf, p, `JSON.stringify compare: ${short(txt(p, sf), 90)}`);
      }
      if (m === "every" && recv && n.arguments[0] && /\[\s*\w+\s*\]/.test(txt(n.arguments[0], sf))) hit("js-length-check-first", sf, n, `[review] every() indexing a second array: ${short(txt(n, sf), 90)}`);

      // js-index-maps / js-set-map-lookups
      if (m && recv && /^(find|findIndex|includes|indexOf|some|filter)$/.test(m)) {
        const ctx = iterContext(n);
        const arg0 = n.arguments[0];
        if (ctx) {
          // receiver root is a parameter of the callback being iterated? then it's per-item (fine)
          let root = recv; while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isCallExpression(root) || ts.isNonNullExpression(root) || ts.isParenthesizedExpression(root)) root = root.expression ?? root.expression;
          const rootName = ts.isIdentifier(root) ? root.text : null;
          // collect names of params of all enclosing iter callbacks
          let isParamDerived = false;
          for (let p = n.parent; p; p = p.parent) {
            if (isFn(p) && p.parent && ts.isCallExpression(p.parent) && p.parent.arguments.includes(p)) {
              for (const prm of p.parameters) if (ts.isIdentifier(prm.name) && prm.name.text === rootName) isParamDerived = true;
            }
          }
          const kind = /^(find|findIndex|filter)$/.test(m) ? "js-index-maps" : (m === "includes" || m === "indexOf" || m === "some") ? "js-set-map-lookups" : "js-index-maps";
          hit(kind, sf, n, `${isParamDerived ? "per-item receiver" : "OUTER-ARRAY"} .${m}() inside ${ctx}: ${short(txt(n, sf), 100)}`);
        } else {
          // lookups on a literal array at call site, e.g. ["a","b"].includes(x), or const ARR includes
          if (m === "includes" && ts.isArrayLiteralExpression(recv) && recv.elements.length >= 8) hit("js-set-map-lookups", sf, n, `literal array(${recv.elements.length}).includes`);
        }
      }

      // js-hoist-regexp: new RegExp handled below. regex.exec/test etc not needed.

      // js-cache-storage
      if (m && recv && /^(localStorage|sessionStorage|window\.localStorage|window\.sessionStorage)$/.test(txt(recv, sf)) && m === "getItem") hit("js-cache-storage", sf, n, `${txt(n, sf)} in ${nearestNamed(n)?.name ?? "<module>"}`);
      if (ts.isIdentifier(n.expression) && n.expression.text === "readStored") hit("js-cache-storage", sf, n, `readStored in ${nearestNamed(n)?.name ?? "<module>"}`);

      // js-request-idle-callback
      if (ts.isIdentifier(n.expression) && /requestIdleCallback/.test(n.expression.text)) hit("js-request-idle-callback", sf, n, "uses requestIdleCallback");
      if (txt(n.expression, sf) === "window.requestIdleCallback") hit("js-request-idle-callback", sf, n, "uses requestIdleCallback");

      // hooks with deps
      if (ts.isIdentifier(n.expression) && /^(useEffect|useLayoutEffect|useMemo|useCallback|useInsertionEffect)$/.test(n.expression.text) && n.arguments[1] && ts.isArrayLiteralExpression(n.arguments[1])) {
        const deps = n.arguments[1].elements;
        for (const d of deps) if (ts.isIdentifier(d) && effectEvents.has(d.text)) hit("advanced-effect-event-deps", sf, d, `effect event \`${d.text}\` in deps of ${n.expression.text}`);
        // advanced-event-handler-refs / use-latest: callback-ish props in effect deps
        if (/^(useEffect|useLayoutEffect)$/.test(n.expression.text)) {
          for (const d of deps) {
            if (ts.isIdentifier(d) && /^(on[A-Z]\w*|handle\w+|\w*Handler|\w*Callback|callback|handler|cb|fn)$/.test(d.text))
              hit("advanced-use-latest", sf, d, `callback-like dep \`${d.text}\` in ${n.expression.text} (${nearestNamed(n)?.name ?? "?"})`);
          }
          // init-once: effect with [] deps and no cleanup
          if (deps.length === 0 && n.arguments[0] && isFn(n.arguments[0])) {
            const body = n.arguments[0].body;
            let hasReturnFn = false;
            if (ts.isBlock(body)) for (const st of body.statements) if (ts.isReturnStatement(st) && st.expression) hasReturnFn = true;
            if (!hasReturnFn) hit("advanced-init-once", sf, n, `useEffect([]) without cleanup in ${nearestNamed(n)?.name ?? "?"}: ${short(txt(body, sf), 110)}`);
          }
        }
      }
      // event listeners added in effects using handler variables (for event-handler-refs review)
      if (m === "addEventListener" && recv) {
        const eff = (() => { for (let p = n.parent; p; p = p.parent) if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && /^use(Layout)?Effect$/.test(p.expression.text)) return p; return null; })();
        if (eff && eff.arguments[1] && ts.isArrayLiteralExpression(eff.arguments[1])) {
          const deps = eff.arguments[1].elements.map((e) => txt(e, sf));
          const h = n.arguments[1] ? txt(n.arguments[1], sf) : "";
          if (deps.includes(h)) hit("advanced-event-handler-refs", sf, n, `listener \`${h}\` is also an effect dep (${nearestNamed(n)?.name})`);
        }
      }

      // js-cache-function-results: Intl constructors / repeated calls
      if (ts.isNewExpression(n)) { /* handled below */ }
      // remember calls per function for duplicate detection
      if (!(ts.isIdentifier(n.expression) && /^(use[A-Z]|t|set[A-Z]\w*|String|Number|Boolean|cn|clsx)$/.test(n.expression.text)) && n.arguments.length > 0 && n.arguments.every((a) => ts.isIdentifier(a) || ts.isStringLiteral(a) || ts.isNumericLiteral(a)) && (ts.isIdentifier(n.expression) || (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression)))) {
        const f = enclosingFns(n)[0];
        if (f) {
          const mm = callsByFn.get(f) ?? new Map();
          const k = txt(n, sf);
          mm.set(k, [...(mm.get(k) ?? []), n]);
          callsByFn.set(f, mm);
        }
      }
    }

    // js-hoist-regexp
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "RegExp") {
      const nn = nearestNamed(n);
      hit("js-hoist-regexp", sf, n, `new RegExp in ${nn?.name ?? "<module>"} ${nn ? (isComponentish(nn.name) ? "[component/hook]" : "[fn]") : ""} ${iterContext(n) ? "in " + iterContext(n) : ""}`);
    }
    if (ts.isRegularExpressionLiteral(n)) {
      const f = enclosingFns(n)[0];
      if (f) {
        const nn = nearestNamed(n);
        const ctx = iterContext(n);
        hit("js-hoist-regexp", sf, n, `literal ${short(n.text, 40)} in ${nn?.name ?? "<anon>"} ${nn && isComponentish(nn.name) ? "[component/hook]" : "[fn]"}${ctx ? " in " + ctx : ""}`);
      }
    }
    // js-cache-function-results: Intl.* / toLocale* constructed inside functions
    if (ts.isNewExpression(n) && /^Intl\./.test(txt(n.expression, sf)) && enclosingFns(n).length) {
      const nn = nearestNamed(n);
      hit("js-cache-function-results", sf, n, `new ${short(txt(n.expression, sf))} inside ${nn?.name ?? "<anon>"} ${iterContext(n) ? "in " + iterContext(n) : ""}`);
    }
    if (ts.isCallExpression(n) && methodOf(n) && /^toLocale(Date|Time)?String$/.test(methodOf(n)) && n.arguments.length >= 1 && enclosingFns(n).length)
      hit("js-cache-function-results", sf, n, `toLocale*String with locale args in ${nearestNamed(n)?.name ?? "<anon>"} ${iterContext(n) ? "in " + iterContext(n) : ""}`);

    // js-cache-property-access: for loops with arr.length in condition (non-const), deep chains repeated in loops
    if (ts.isForStatement(n) && n.condition && ts.isBinaryExpression(n.condition) && ts.isPropertyAccessExpression(n.condition.right) && n.condition.right.name.text === "length")
      hit("js-cache-property-access", sf, n, `loop re-reads .length: ${short(txt(n.condition, sf))}`);
    if (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n) || (ts.isArrowFunction(n) && n.parent && ts.isCallExpression(n.parent) && ts.isPropertyAccessExpression(n.parent.expression) && ITER.has(n.parent.expression.name.text))) {
      const counts = new Map();
      const declared = new Set();
      (function d(x) {
        if (ts.isVariableDeclaration(x) && ts.isIdentifier(x.name)) declared.add(x.name.text);
        if (ts.isParameter(x) && ts.isIdentifier(x.name)) declared.add(x.name.text);
        ts.forEachChild(x, d);
      })(n);
      (function c(x) {
        if (ts.isPropertyAccessExpression(x) && !ts.isPropertyAccessExpression(x.parent)) {
          let depth = 0, r = x;
          while (ts.isPropertyAccessExpression(r)) { depth++; r = r.expression; }
          if (depth >= 3 && ts.isIdentifier(r) && !declared.has(r.text) && !(x.parent && ts.isCallExpression(x.parent) && x.parent.expression === x)) {
            const k = txt(x, sf);
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
        }
        ts.forEachChild(x, c);
      })(n);
      for (const [k, v] of counts) if (v >= 2) hit("js-cache-property-access", sf, n, `loop-invariant chain ×${v}: ${k}`);
    }

    // js-early-exit: loop assigns a flag to a literal and neither breaks nor returns
    if (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || (ts.isCallExpression(n) && methodOf(n) === "forEach")) {
      const body = ts.isCallExpression(n) ? n.arguments[0] : n.statement;
      if (body) {
        let assignsLiteral = null, exits = false;
        (function e(x) {
          if (x !== body && isFn(x) && !ts.isCallExpression(n)) return;
          if (ts.isBreakStatement(x) || ts.isReturnStatement(x)) exits = true;
          if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(x.left) && (x.right.kind === ts.SyntaxKind.TrueKeyword || x.right.kind === ts.SyntaxKind.FalseKeyword || ts.isStringLiteral(x.right))) assignsLiteral = txt(x, sf);
          ts.forEachChild(x, e);
        })(body);
        if (assignsLiteral && !exits) hit("js-early-exit", sf, n, `[review] loop sets flag \`${assignsLiteral}\` with no break/return`);
      }
    }

    // js-batch-dom-css: style/classList writes interleaved with layout reads inside one function
    if (isFn(n) && n.body && ts.isBlock(n.body)) {
      const events = [];
      (function e(x) {
        if (x !== n && isFn(x)) return;
        if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.EqualsToken && /\.style\.|\.style$|\.scrollTop$|\.scrollLeft$|\.className$/.test(txt(x.left, sf))) events.push(["W", x]);
        if (ts.isCallExpression(x) && /\.(setAttribute|toggleAttribute|scrollTo|scrollBy)$|classList\.(add|remove|toggle)|\.style\.setProperty$/.test(txt(x.expression, sf))) events.push(["W", x]);
        if (ts.isPropertyAccessExpression(x) && /^(offsetWidth|offsetHeight|offsetTop|offsetLeft|clientWidth|clientHeight|scrollHeight|scrollWidth|scrollTop|scrollLeft)$/.test(x.name.text) && !(ts.isBinaryExpression(x.parent) && x.parent.left === x)) events.push(["R", x]);
        if (ts.isCallExpression(x) && /getBoundingClientRect$|^getComputedStyle$|\.getComputedStyle$/.test(txt(x.expression, sf))) events.push(["R", x]);
        ts.forEachChild(x, e);
      })(n.body);
      events.sort((a, b) => a[1].getStart(sf) - b[1].getStart(sf));
      const seq = events.map((e) => e[0]).join("");
      if (/W.*R.*W/.test(seq) || /R.*W.*R/.test(seq)) {
        const hasWRW = /W+R+W/.test(seq.replace(/(.)\1+/g, "$1"));
        const hasRWR = /R+W+R/.test(seq.replace(/(.)\1+/g, "$1"));
        if (hasWRW || hasRWR) hit("js-batch-dom-css", sf, n, `[review] ${hasWRW ? "W-R-W" : "R-W-R"} order ${seq} in ${fnName(n) ?? "<anon>"}`);
      }
    }

    // advanced-effect-event-deps: effect event passed as prop / called during render
    if (ts.isIdentifier(n) && effectEvents.has(n.text) && n.parent && ts.isJsxExpression(n.parent)) hit("advanced-effect-event-deps", sf, n, `effect event \`${n.text}\` passed into JSX`);

    ts.forEachChild(n, visit);
  })(sf);

  for (const [, mm] of filterByReceiver) for (const [k, ns] of mm) if (ns.length >= 2) hit("js-combine-iterations", sf, ns[1], `same receiver iterated ×${ns.length}: ${k}`);
  for (const [, mm] of callsByFn) for (const [k, ns] of mm) if (ns.length >= 2 && !/^(Math|Object|Array|JSON|console|Number|String)\./.test(k)) hit("js-cache-function-results", sf, ns[1], `[review] identical call ×${ns.length} in one function: ${short(k, 70)}`);
}

if (!quiet) {
  const fresh = sortSites.filter((s) => s.fresh).length;
  console.log(`# sort/reverse sites total ${sortSites.length}: ${fresh} on fresh copies, ${sortSites.length - fresh} in-place candidates`);
}
console.log("\nrule\thits");
for (const r of RULES) console.log(`${r}\t${hits[r]}`);
