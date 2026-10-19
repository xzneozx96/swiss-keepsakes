// Detectors for the 15 rerender-* rules, built on the TypeScript compiler API (type checker + symbols).
// Usage:
//   node detect.mjs                 # scans front-end/src (program from front-end/tsconfig.json)
//   node detect.mjs seed            # scans seed/seed-violations.tsx (each rule must report >= 1)
//   node detect.mjs <dir> --sites   # also prints one line per site: rule<TAB>file:line<TAB>detail
// First block of output: rule<TAB>hits. Detail lines follow when --sites is given.
// Hits are candidates. report.tsv records which were reviewed and what they turned out to be.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontEnd = path.resolve(here, "../../../../front-end");
const require = createRequire(path.join(frontEnd, "package.json"));
const ts = require("typescript");

const args = process.argv.slice(2);
const showSites = args.includes("--sites");
const target = args.find((a) => !a.startsWith("--")) ?? "src";
const seedMode = target === "seed";

// ---------------------------------------------------------------- program
const cfgPath = path.join(frontEnd, "tsconfig.json");
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, frontEnd);
let rootNames = cfg.fileNames;
let scanRoot = path.join(frontEnd, "src");
if (seedMode) {
  scanRoot = path.join(here, "seed");
  rootNames = [path.join(scanRoot, "seed-violations.tsx")];
} else if (target !== "src") {
  scanRoot = path.resolve(target);
  const walk = (d) =>
    readdirSync(d).flatMap((n) => {
      const f = path.join(d, n);
      return statSync(f).isDirectory() ? walk(f) : /\.tsx?$/.test(n) ? [f] : [];
    });
  rootNames = walk(scanRoot);
}
const options = { ...cfg.options, noEmit: true };
if (seedMode || target !== "src") {
  // files outside front-end still resolve react and its types from front-end/node_modules
  options.baseUrl = frontEnd;
  options.paths = { ...options.paths, "*": ["node_modules/@types/*", "node_modules/*"] };
  options.typeRoots = [path.join(frontEnd, "node_modules/@types")];
}
const program = ts.createProgram(rootNames, options);
const checker = program.getTypeChecker();
const files = program
  .getSourceFiles()
  .filter((sf) => sf.fileName.startsWith(scanRoot) && !sf.fileName.endsWith(".d.ts") && !sf.fileName.endsWith("routeTree.gen.ts"));

// ---------------------------------------------------------------- results
const RULES = [
  "rerender-defer-reads",
  "rerender-dependencies",
  "rerender-derived-state",
  "rerender-derived-state-no-effect",
  "rerender-functional-setstate",
  "rerender-lazy-state-init",
  "rerender-memo",
  "rerender-memo-with-default-value",
  "rerender-move-effect-to-event",
  "rerender-no-inline-components",
  "rerender-simple-expression-in-memo",
  "rerender-split-combined-hooks",
  "rerender-transitions",
  "rerender-use-deferred-value",
  "rerender-use-ref-transient-values",
];
const sites = new Map(RULES.map((r) => [r, []]));
const extra = new Map(); // informational lists (not rule hits)
const hit = (rule, node, detail) => sites.get(rule).push(`${loc(node)}\t${detail}`);
const info = (key, node, detail) => {
  if (!extra.has(key)) extra.set(key, []);
  extra.get(key).push(`${loc(node)}\t${detail}`);
};

function loc(node) {
  const sf = node.getSourceFile();
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${path.relative(scanRoot, sf.fileName)}:${line + 1}`;
}
const short = (node, n = 70) => node.getText().replace(/\s+/g, " ").slice(0, n);
const area = (node) => {
  const f = path.relative(scanRoot, node.getSourceFile().fileName);
  if (/(^|\/)(lab\b|lab\.)|features\/lab\//.test(f)) return "lab";
  if (/merchant|partners|reports|routes\/store|routes\/partner/.test(f)) return "merchant";
  return "guest";
};

// ---------------------------------------------------------------- helpers
const isFn = (n) =>
  n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n));
const isComponentName = (s) => !!s && /^[A-Z]/.test(s);
const isHookName = (s) => !!s && /^use[A-Z0-9]/.test(s);
function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return "";
}
const WRAPPERS = new Set(["memo", "forwardRef"]);
function fnName(fn) {
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
  let p = fn.parent;
  while (p && ts.isCallExpression(p) && WRAPPERS.has(calleeName(p))) p = p.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (p && ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "component") return "RouteComponent";
  return undefined;
}
const isMemoWrapped = (fn) => ts.isCallExpression(fn.parent) && calleeName(fn.parent) === "memo";
function walk(node, cb) {
  cb(node);
  ts.forEachChild(node, (c) => walk(c, cb));
}
function ancestors(node, stop) {
  const out = [];
  for (let p = node.parent; p && p !== stop; p = p.parent) out.push(p);
  return out;
}
function enclosingFn(node, stop) {
  for (let p = node.parent; p && p !== stop; p = p.parent) if (isFn(p)) return p;
  return stop;
}
function symOf(id) {
  if (ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id)
    return checker.getShorthandAssignmentValueSymbol(id.parent);
  return checker.getSymbolAtLocation(id);
}
function isDeclName(id) {
  const p = id.parent;
  return (
    (ts.isBindingElement(p) && p.name === id) ||
    (ts.isVariableDeclaration(p) && p.name === id) ||
    (ts.isParameter(p) && p.name === id) ||
    (ts.isFunctionDeclaration(p) && p.name === id) ||
    (ts.isBindingElement(p) && p.propertyName === id)
  );
}
const isPrimitiveType = (type) => {
  if (type.isUnion()) return type.types.every(isPrimitiveType);
  const F = ts.TypeFlags;
  return !!(
    type.flags &
    (F.Boolean | F.BooleanLiteral | F.Number | F.NumberLiteral | F.String | F.StringLiteral | F.Undefined | F.Null |
      F.EnumLiteral | F.BigInt | F.Void | F.TemplateLiteral)
  );
};
const isFunctionType = (type) => type.getCallSignatures().length > 0;

// ---------------------------------------------------------------- roots (components and hooks)
const roots = [];
for (const sf of files) {
  walk(sf, (n) => {
    if (!isFn(n)) return;
    const name = fnName(n);
    if (!(isComponentName(name) || isHookName(name))) return;
    // outermost component/hook only
    for (let p = n.parent; p; p = p.parent) if (isFn(p) && (isComponentName(fnName(p)) || isHookName(fnName(p)))) return;
    roots.push({ fn: n, name, isHook: isHookName(name), sf });
  });
}

// Per-root reference index: symbol -> identifiers that refer to it (declaration names excluded).
function indexRefs(root) {
  const refs = new Map();
  walk(root.fn, (n) => {
    if (!ts.isIdentifier(n) || isDeclName(n)) return;
    const s = symOf(n);
    if (!s) return;
    if (!refs.has(s)) refs.set(s, []);
    refs.get(s).push(n);
  });
  return refs;
}

// ---------------------------------------------------------------- execution context
// render: runs while the component renders; effect: inside an effect; deferred: event handler,
// timer, listener, promise callback; returned: a function the hook hands to its caller.
const ARRAY_METHODS = new Set(
  "map filter forEach reduce reduceRight some every find findIndex findLast findLastIndex flatMap sort toSorted from fromEntries groupBy".split(
    " ",
  ),
);
const SYNC_HOOKS = new Set(["useMemo", "useState", "useReducer", "useSyncExternalStore", "useDemoSelector", "useRef"]);
const EFFECT_HOOKS = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);
const RANK = { render: 0, returned: 1, effect: 2, deferred: 3 };
const kindCache = new Map();

function fnKind(F, root) {
  if (kindCache.has(F)) return kindCache.get(F);
  kindCache.set(F, "deferred"); // recursion guard
  const k = computeFnKind(F, root);
  kindCache.set(F, k);
  return k;
}
function bindingOfFn(F) {
  if (ts.isFunctionDeclaration(F) && F.name) return F.name;
  let p = F.parent;
  if (ts.isCallExpression(p) && ["useCallback", "useEffectEvent"].includes(calleeName(p))) p = p.parent;
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name;
  return undefined;
}
function computeFnKind(F, root) {
  let p = F.parent;
  while (ts.isParenthesizedExpression(p)) p = p.parent;
  if (ts.isCallExpression(p) && p.expression !== F && p.arguments.includes(F)) {
    const name = calleeName(p);
    if (EFFECT_HOOKS.has(name)) return "effect";
    if (name === "useEffectEvent") return "deferred";
    if (name === "useCallback") return refKind(bindingOfFn(F), root) ?? "deferred";
    if (SYNC_HOOKS.has(name)) return "render";
    if (ts.isPropertyAccessExpression(p.expression) && ARRAY_METHODS.has(name)) return "render";
    if (name === "update" || name.startsWith("set")) return "deferred"; // updater/recipe runs when the write happens
    return "deferred";
  }
  if (ts.isCallExpression(p) && (p.expression === F || p.expression === F.parent)) return "render"; // IIFE
  if (ts.isNewExpression(p)) return p.expression.getText() === "Promise" ? "render" : "deferred";
  if (ts.isJsxExpression(p)) {
    if (ts.isJsxAttribute(p.parent)) {
      const attr = p.parent.name.getText();
      return /^on[A-Z]/.test(attr) || attr === "ref" || attr === "action" ? "deferred" : "render";
    }
    return "render"; // function as children
  }
  if (ts.isPropertyAssignment(p)) {
    if (/^on[A-Z]/.test(p.name.getText())) return "deferred";
    // object literal returned by a hook, or passed somewhere: look at the object's own position
    const obj = p.parent;
    if (ts.isReturnStatement(obj.parent) && enclosingFn(obj.parent, root.fn.parent) === root.fn) return "returned";
    return "render";
  }
  if (ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === F)) return isFn(p) ? "deferred" : "returned";
  const b = bindingOfFn(F);
  if (b) return refKind(b, root) ?? "deferred";
  return "render";
}
function refKind(bindingId, root) {
  if (!bindingId) return undefined;
  const s = checker.getSymbolAtLocation(bindingId);
  const refs = (root.refs.get(s) ?? []).filter((r) => r !== bindingId);
  if (!refs.length) return "deferred";
  let best;
  for (const r of refs) {
    const k = useKind(r, root);
    if (k === "render") return "render";
    if (!best || RANK[k] < RANK[best]) best = k;
  }
  return best;
}
// How a reference to a function value is used.
function useKind(ref, root) {
  const p = ref.parent;
  if (ts.isCallExpression(p) && p.expression === ref) return contextOf(p, root);
  if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) {
    const attr = p.parent.name.getText();
    if (/^on[A-Z]/.test(attr) || attr === "ref") return "deferred";
    return worst("render", contextOf(p, root));
  }
  if (ts.isCallExpression(p) && p.arguments.includes(ref)) {
    const name = calleeName(p);
    if (EFFECT_HOOKS.has(name)) return "effect";
    if (ARRAY_METHODS.has(name) || SYNC_HOOKS.has(name)) return contextOf(p, root);
    return "deferred";
  }
  if (ts.isArrayLiteralExpression(p) && ts.isCallExpression(p.parent) && /^use(Effect|LayoutEffect|Memo|Callback)$/.test(calleeName(p.parent)))
    return "deferred"; // dependency list only
  if (ts.isShorthandPropertyAssignment(p) || ts.isPropertyAssignment(p)) {
    const obj = p.parent;
    if (ts.isReturnStatement(obj.parent) || (ts.isArrowFunction(obj.parent?.parent) && obj.parent.parent.body === obj.parent))
      return worst("returned", contextOf(obj, root));
    return worst("render", contextOf(p, root));
  }
  if (ts.isReturnStatement(p)) return worst("returned", contextOf(p, root));
  return contextOf(ref, root);
}
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);
function contextOf(node, root) {
  let k = "render";
  for (let p = node.parent; p && p !== root.fn; p = p.parent) if (isFn(p)) k = worst(k, fnKind(p, root));
  return k;
}
// The function is async, or the node sits in a timer/listener/promise callback: closures can be stale there.
const ASYNC_CALLEES = new Set(
  "setTimeout setInterval requestAnimationFrame queueMicrotask then catch finally addEventListener".split(" "),
);
function asyncish(node, root) {
  for (let p = node.parent; p && p !== root.fn; p = p.parent) {
    if (!isFn(p)) continue;
    if (p.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) return "async-fn";
    const c = p.parent;
    if (ts.isCallExpression(c) && ASYNC_CALLEES.has(calleeName(c))) return calleeName(c);
    if (ts.isNewExpression(c) && c.expression.getText() !== "Promise") return `new ${c.expression.getText()}`;
    if (ts.isCallExpression(c) && EFFECT_HOOKS.has(calleeName(c))) return "effect";
  }
  return undefined;
}

// ---------------------------------------------------------------- per-root facts
function stateVars(root) {
  const out = [];
  walk(root.fn, (n) => {
    if (!ts.isVariableDeclaration(n) || !ts.isArrayBindingPattern(n.name) || !n.initializer) return;
    if (!ts.isCallExpression(n.initializer) || calleeName(n.initializer) !== "useState") return;
    const [v, s] = n.name.elements;
    const value = v && ts.isBindingElement(v) && ts.isIdentifier(v.name) ? v.name : undefined;
    const setter = s && ts.isBindingElement(s) && ts.isIdentifier(s.name) ? s.name : undefined;
    out.push({
      decl: n,
      call: n.initializer,
      value,
      setter,
      valueSym: value && checker.getSymbolAtLocation(value),
      setterSym: setter && checker.getSymbolAtLocation(setter),
    });
  });
  return out;
}
const callsOf = (root, names) => {
  const out = [];
  walk(root.fn, (n) => ts.isCallExpression(n) && names.has(calleeName(n)) && out.push(n));
  return out;
};
const refersTo = (node, sym) => {
  let found = false;
  walk(node, (n) => {
    if (!found && ts.isIdentifier(n) && symOf(n) === sym) found = true;
  });
  return found;
};
const hasCall = (node) => {
  let found = false;
  walk(node, (n) => (found ||= ts.isCallExpression(n) || ts.isNewExpression(n)));
  return found;
};
const declaredInside = (id, fn) => {
  const s = symOf(id);
  const d = s?.declarations?.[0];
  return !!d && d.pos >= fn.pos && d.end <= fn.end;
};
function setterCallsOf(root, sv) {
  return (root.refs.get(sv.setterSym) ?? []).filter((r) => ts.isCallExpression(r.parent) && r.parent.expression === r).map((r) => r.parent);
}

// ================================================================= rules
function analyzeRoot(root) {
  root.refs ??= indexRefs(root);
  const svs = stateVars(root);
  const fn = root.fn;

  // ---------- rerender-no-inline-components: PascalCase functions/memo/forwardRef/lazy defined inside a component or hook
  walk(fn, (n) => {
    if (n === fn) return;
    if (ts.isFunctionDeclaration(n) && isComponentName(n.name?.text)) hit("rerender-no-inline-components", n, `function ${n.name.text} inside ${root.name}`);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && isComponentName(n.name.text) && n.initializer) {
      let init = n.initializer;
      if (ts.isCallExpression(init) && ["useMemo", "useCallback"].includes(calleeName(init))) init = init.arguments[0];
      const isComp =
        isFn(init) || (ts.isCallExpression(init) && ["memo", "forwardRef", "lazy", "styled"].includes(calleeName(init)));
      if (isComp) hit("rerender-no-inline-components", n, `const ${n.name.text} inside ${root.name}`);
    }
  });
  // a function created in render handed to a prop the receiver mounts with createElement (recharts Tooltip.content)
  walk(fn, (n) => {
    if (!ts.isJsxAttribute(n) || n.name.getText() !== "content") return;
    const tag = n.parent.parent.tagName;
    const tagSym = tag && ts.isIdentifier(tag) ? checker.getSymbolAtLocation(tag) : undefined;
    const imp = tagSym?.declarations?.[0];
    const fromRecharts = imp && ts.isImportSpecifier(imp) && imp.parent.parent.parent.moduleSpecifier.getText().includes("recharts");
    if (!fromRecharts || tag.getText() !== "Tooltip") return;
    const v = n.initializer?.expression;
    if (!v) return;
    if (isFn(v)) hit("rerender-no-inline-components", n, `inline fn as recharts Tooltip content (createElement) in ${root.name}`);
    else if (ts.isIdentifier(v) && declaredInside(v, fn)) hit("rerender-no-inline-components", n, `local ${v.text} as recharts Tooltip content (createElement) in ${root.name}`);
  });

  // ---------- rerender-lazy-state-init
  for (const c of callsOf(root, new Set(["useState", "useReducer"]))) {
    const name = calleeName(c);
    const arg = name === "useState" ? c.arguments[0] : c.arguments.length === 2 ? c.arguments[1] : undefined;
    if (!arg || isFn(arg) || !hasCall(arg)) continue;
    let reactive = false;
    walk(arg, (n) => {
      if (ts.isIdentifier(n) && !isDeclName(n) && declaredInside(n, fn)) reactive = true;
    });
    hit("rerender-lazy-state-init", c, `${name}(${short(arg, 60)}) ${reactive ? "args-from-props/state" : "constant-args"} [${root.name}]`);
  }

  // ---------- rerender-functional-setstate
  for (const sv of svs) {
    if (!sv.valueSym || !sv.setterSym) continue;
    for (const call of setterCallsOf(root, sv)) {
      const a = call.arguments[0];
      if (!a || isFn(a) || !refersTo(a, sv.valueSym)) continue;
      const ctx = contextOf(call, root);
      const why = asyncish(call, root);
      hit("rerender-functional-setstate", call, `${short(call, 60)} ctx=${ctx}${why ? ` stale-risk=${why}` : ""} [${root.name}]`);
    }
  }

  // ---------- effects: derived-state-no-effect, move-effect-to-event, dependencies, split-combined (effects)
  for (const eff of callsOf(root, EFFECT_HOOKS)) {
    const body = eff.arguments[0];
    const deps = eff.arguments[1];
    if (!isFn(body)) continue;

    // derived-state-no-effect: setState called synchronously in the effect body (not in a nested callback, not after await)
    walk(body, (n) => {
      if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return;
      const sv = svs.find((s) => s.setterSym && symOf(n.expression) === s.setterSym);
      const propSetter = !sv && /^set[A-Z]/.test(n.expression.text) && !declaredInside(n.expression, fn) ? false : !sv;
      if (!sv && propSetter) return;
      if (!sv) return;
      if (enclosingFn(n, fn) !== body) return;
      let afterAwait = false;
      walk(body, (m) => (afterAwait ||= ts.isAwaitExpression(m) && m.end < n.pos));
      if (afterAwait) return;
      hit("rerender-derived-state-no-effect", n, `${short(n, 70)} in ${calleeName(eff)} [${root.name}]`);
    });

    if (!deps || !ts.isArrayLiteralExpression(deps)) continue;

    // move-effect-to-event: a dep is local state that a handler sets, and the effect is gated on it
    for (const d of deps.elements) {
      if (!ts.isIdentifier(d)) continue;
      const sv = svs.find((s) => s.valueSym && symOf(d) === s.valueSym);
      if (!sv || !sv.setterSym) continue;
      const handlerSets = setterCallsOf(root, sv).filter((c) => contextOf(c, root) === "deferred" && enclosingFnIsNotEffect(c, root));
      if (!handlerSets.length) continue;
      let gated = false;
      walk(body, (n) => {
        if (ts.isIfStatement(n) && refersTo(n.expression, sv.valueSym)) gated = true;
        if (ts.isConditionalExpression(n) && refersTo(n.condition, sv.valueSym)) gated = true;
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && refersTo(n.left, sv.valueSym)) gated = true;
      });
      const renderReads = (root.refs.get(sv.valueSym) ?? []).filter((r) => contextOf(r, root) === "render" && !ts.isArrayLiteralExpression(r.parent)).length;
      if (gated || renderReads === 0)
        hit("rerender-move-effect-to-event", eff, `dep ${d.text} set in handler(s) at ${handlerSets.map((c) => loc(c).split(":").pop()).join(",")}; gated=${gated} renderReads=${renderReads} [${root.name}]`);
    }

    // dependencies: object dep whose body only reads properties of it; number dep only compared
    for (const d of deps.elements) {
      if (!ts.isIdentifier(d)) continue;
      const s = symOf(d);
      const t = checker.getTypeAtLocation(d);
      const uses = [];
      walk(body, (n) => ts.isIdentifier(n) && symOf(n) === s && uses.push(n));
      if (!uses.length) continue;
      // refs and router/navigate handles never change identity, so [ref] never re-runs the effect
      const declInit = s?.declarations?.[0]?.initializer?.getText?.() ?? "";
      const stable = /RefObject|MutableRefObject|^Ref</.test(checker.typeToString(t)) || /^use(Ref|Router|Navigate|Latest)\(/.test(declInit);
      if (!isPrimitiveType(t) && !isFunctionType(t) && stable) {
        info("dependencies-stable-object", d, `[${d.text}] (${checker.typeToString(t).slice(0, 40)}) is stable, not counted [${root.name}]`);
        continue;
      }
      if (!isPrimitiveType(t) && !isFunctionType(t)) {
        const props = new Set();
        const narrow = uses.every((u) => {
          const p = u.parent;
          if (!ts.isPropertyAccessExpression(p) || p.expression !== u) return false;
          if (ts.isCallExpression(p.parent) && p.parent.expression === p) return false; // method call needs the object
          props.add(p.name.text);
          return true;
        });
        if (narrow) hit("rerender-dependencies", d, `[${d.text}] but effect reads only ${[...props].map((x) => `${d.text}.${x}`).join(", ")} [${root.name}]`);
      } else if (t.flags & ts.TypeFlags.NumberLike) {
        const compared = uses.every((u) => {
          const p = u.parent;
          return ts.isBinaryExpression(p) && [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken].includes(p.operatorToken.kind) && ts.isNumericLiteral(p.left === u ? p.right : p.left);
        });
        if (compared) hit("rerender-dependencies", d, `[${d.text}] number used only in a threshold comparison [${root.name}]`);
      }
    }

    // split-combined-hooks (effects): top-level statements fall into groups with disjoint deps
    if (deps.elements.length >= 2 && ts.isBlock(body.body)) {
      const depSyms = deps.elements.filter(ts.isIdentifier).map(symOf).filter(Boolean);
      const groups = groupStatements(body.body.statements, depSyms);
      if (groups.length >= 2) hit("rerender-split-combined-hooks", eff, `${calleeName(eff)} body splits into ${groups.length} independent groups: ${groups.map((g) => `{${g.map((x) => x.escapedName).join(",")}}`).join(" ")} [${root.name}]`);
    }
  }

  // ---------- useMemo: simple-expression, split-combined (memo)
  for (const m of callsOf(root, new Set(["useMemo"]))) {
    const cb = m.arguments[0];
    const deps = m.arguments[1];
    if (!isFn(cb)) continue;
    info("useMemo-total", m, root.name);
    const t = checker.getTypeAtLocation(m);
    const expr = ts.isBlock(cb.body)
      ? cb.body.statements.length === 1 && ts.isReturnStatement(cb.body.statements[0])
        ? cb.body.statements[0].expression
        : undefined
      : cb.body;
    if (expr && isPrimitiveType(t)) {
      let calls = 0;
      let nodes = 0;
      walk(expr, (n) => {
        nodes++;
        if (ts.isCallExpression(n)) calls++;
      });
      if (calls === 0 && nodes < 40) hit("rerender-simple-expression-in-memo", m, `${short(expr, 70)} -> ${checker.typeToString(t)} [${root.name}]`);
    }
    if (deps && ts.isArrayLiteralExpression(deps) && deps.elements.length >= 2) {
      const depSyms = deps.elements.map((e) => (ts.isIdentifier(e) ? symOf(e) : ts.isPropertyAccessExpression(e) ? e.getText() : undefined)).filter(Boolean);
      const chain = chainedSubsetWork(cb, depSyms);
      if (chain) hit("rerender-split-combined-hooks", m, `useMemo: ${chain} [${root.name}]`);
    }
  }

  // ---------- memo-with-default-value: non-primitive defaults in a component's destructured props
  if (!root.isHook) checkDefaults(fn, root.name);
  walk(fn, (n) => {
    if (n !== fn && isFn(n) && isMemoWrapped(n)) checkDefaults(n, fnName(n));
  });

  // ---------- memo: expensive work before an early return that does not use it
  if (!root.isHook && ts.isBlock(fn.body)) earlyReturn(root);

  // ---------- use-ref-transient-values (a): state never read while rendering
  for (const sv of svs) {
    if (!sv.valueSym) continue;
    const reads = (root.refs.get(sv.valueSym) ?? []).filter((r) => !(ts.isArrayLiteralExpression(r.parent) && ts.isCallExpression(r.parent.parent)));
    const renderReads = reads.filter((r) => contextOf(r, root) === "render");
    if (renderReads.length === 0)
      hit("rerender-use-ref-transient-values", sv.decl, `state ${sv.value.text} never read during render (${reads.length} reads in ${[...new Set(reads.map((r) => contextOf(r, root)))].join("/") || "nothing"}) [${root.name}]`);
  }
  for (const sv of svs) if (!sv.value && sv.setter) info("force-update-state", sv.decl, `[, ${sv.setter.text}] = useState in ${root.name}`);

  // ---------- transitions + use-ref-transient-values (b): setState in high-frequency callbacks
  highFrequency(root, svs);

  // ---------- use-deferred-value: text input -> state -> list work, without useDeferredValue
  textInputs(root, svs);

  // ---------- defer-reads, derived-state, demo store census
  subscriptions(root);
}

function enclosingFnIsNotEffect(call, root) {
  return contextOf(call, root) !== "effect";
}

function groupStatements(statements, depSyms) {
  // union-find over statements: joined when they share a local variable; then group dep sets
  const items = statements.map((s) => {
    const ids = new Set();
    const deps = new Set();
    walk(s, (n) => {
      if (!ts.isIdentifier(n)) return;
      const sym = symOf(n);
      if (!sym) return;
      if (depSyms.includes(sym)) deps.add(sym);
      const d = sym.declarations?.[0];
      if (d && d.pos >= statements.pos && d.end <= statements.end) ids.add(sym);
    });
    return { ids, deps };
  });
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // an early exit (if ... return) controls every statement after it, so they are one task
  statements.forEach((st, i) => {
    if (ts.isIfStatement(st) && containsReturn(st.thenStatement)) for (let j = i + 1; j < statements.length; j++) parent[find(j)] = find(i);
  });
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if ([...items[i].ids].some((x) => items[j].ids.has(x)) || [...items[i].deps].some((x) => items[j].deps.has(x))) parent[find(i)] = find(j);
  const groups = new Map();
  items.forEach((it, i) => {
    const g = find(i);
    if (!groups.has(g)) groups.set(g, new Set());
    it.deps.forEach((d) => groups.get(g).add(d));
  });
  return [...groups.values()].filter((g) => g.size > 0).map((g) => [...g]);
}

const EXPENSIVE_METHODS = new Set("filter map reduce sort toSorted flatMap find some every forEach groupBy".split(" "));
function depsUsed(node, depSyms) {
  const out = new Set();
  walk(node, (n) => {
    if (ts.isIdentifier(n) && depSyms.includes(symOf(n))) out.add(symOf(n));
    if (ts.isPropertyAccessExpression(n) && depSyms.includes(n.getText())) out.add(n.getText());
  });
  return out;
}
// An inner array step whose deps are a strict subset of the memo's deps, feeding a later step that adds more.
function chainedSubsetWork(cb, depSyms) {
  const all = depsUsed(cb.body, depSyms);
  if (all.size < 2) return undefined;
  let found;
  walk(cb.body, (n) => {
    if (found || !ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return;
    if (!EXPENSIVE_METHODS.has(n.expression.name.text)) return;
    const inner = depsUsed(n, depSyms);
    if (inner.size === 0 || inner.size >= all.size) return;
    // the step must be an intermediate (its result is used by something that reads other deps)
    const outer = n.parent;
    const isIntermediate =
      (ts.isPropertyAccessExpression(outer) && ts.isCallExpression(outer.parent)) || ts.isVariableDeclaration(outer);
    if (!isIntermediate) return;
    found = `${n.expression.name.text}() reads ${inner.size} of ${all.size} deps (${short(n, 50)})`;
  });
  return found;
}

function checkDefaults(fn, name) {
  const p0 = fn.parameters?.[0];
  if (!p0 || !ts.isObjectBindingPattern(p0.name)) return;
  for (const el of p0.name.elements) {
    const init = el.initializer;
    if (!init) continue;
    const bad =
      ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init) || isFn(init) || ts.isNewExpression(init) || ts.isRegularExpressionLiteral(init) || ts.isJsxElement(init) || ts.isJsxSelfClosingElement(init);
    if (!bad) continue;
    const memo = isMemoWrapped(fn);
    hit("rerender-memo-with-default-value", el, `${name}: ${el.name.getText()} = ${short(init, 30)} ${memo ? "MEMO-WRAPPED" : "plain component (compiler caches it)"}`);
  }
}

const CHEAP_HOOKS = new Set(
  "useState useRef useId useContext useLocale useNavigate useRouter useDemoActions useDemoSelector useSearch useParams useLocation useIsWide useBack useLatest useEffectEvent useTransition useDeferredValue useCallback useReducer useSyncExternalStore useStorageFull useDemoNow useSharedClock useInView useScrolledPast useRouterState useEffect useLayoutEffect useMatch useMediaQuery useReducedMotion usePrefersReducedMotion".split(
    " ",
  ),
);
function earlyReturn(root) {
  const stmts = root.fn.body.statements;
  const idx = stmts.findIndex((s) => ts.isIfStatement(s) && containsReturn(s.thenStatement));
  if (idx <= 0) return;
  const guard = stmts[idx];
  // demo skeleton: hooks that run while the simulated-loading skeleton is all that is shown
  const loadingVar = stmts.slice(0, idx).flatMap((st) => (ts.isVariableStatement(st) ? [...st.declarationList.declarations] : [])).find((d) => d.initializer && ts.isCallExpression(d.initializer) && calleeName(d.initializer) === "useSimulatedLoading");
  if (loadingVar && ts.isIdentifier(loadingVar.name) && refersTo(guard.expression, checker.getSymbolAtLocation(loadingVar.name))) {
    const hooks = [];
    for (const st of stmts.slice(0, idx))
      walk(st, (n) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && isHookName(n.expression.text) && !CHEAP_HOOKS.has(n.expression.text) && n.expression.text !== "useSimulatedLoading")
          hooks.push(`${n.expression.text}(${hookWork(n.expression)})`);
      });
    info("skeleton-early-return", guard, `${root.name}: before the skeleton return: ${hooks.join(", ") || "no custom hooks"}`);
  }
  for (const s of stmts.slice(0, idx)) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      if (!d.initializer) continue;
      const why = expensiveInit(d.initializer);
      if (!why) continue;
      const names = [];
      walk(d.name, (n) => ts.isIdentifier(n) && isDeclName(n) && names.push(checker.getSymbolAtLocation(n)));
      const usedByGuard = names.some((sym) => sym && refersTo(guard, sym));
      if (!usedByGuard) hit("rerender-memo", d, `${why} computed before early return at line ${loc(guard).split(":").pop()} that does not use it [${root.name}]`);
    }
  }
}
function containsReturn(n) {
  let r = false;
  walk(n, (m) => (r ||= ts.isReturnStatement(m) && !isFnBetween(m, n)));
  return r;
}
function isFnBetween(node, stop) {
  if (node === stop) return false;
  for (let p = node.parent; p && p !== stop; p = p.parent) if (isFn(p)) return true;
  return false;
}
function expensiveInit(init) {
  if (ts.isCallExpression(init)) {
    const name = calleeName(init);
    if (name === "useMemo" && isFn(init.arguments[0])) {
      let work = false;
      walk(init.arguments[0], (n) => (work ||= (ts.isCallExpression(n) && EXPENSIVE_METHODS.has(calleeName(n))) || ts.isForOfStatement(n) || ts.isForStatement(n)));
      return work ? "useMemo with array work" : undefined;
    }
    if (isHookName(name) && !CHEAP_HOOKS.has(name)) {
      const work = hookWork(init.expression);
      if (work >= HEAVY_HOOK_WORK) return `heavy hook ${name}() (${work} array calls inside)`;
      if (work > 0) info("memo-hook-below-threshold", init, `${name}() ${work} render-time array calls`);
      return undefined;
    }
  }
  // chained array work in render (a lone .find/.some is cheap and not counted)
  let steps = 0;
  walk(init, (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && EXPENSIVE_METHODS.has(calleeName(n)) && !isFnBetween(n, init)) steps++;
  });
  return steps >= 2 ? `array work in render (${steps} chained calls)` : undefined;
}
// Array-method calls a custom hook makes while rendering (not in the callbacks it returns), plus
// those of the custom hooks it calls, two levels deep: a cost proxy for "expensive work".
const HEAVY_HOOK_WORK = 15;
const workCache = new Map();
const rootByFn = new Map(roots.map((r) => [r.fn, r]));
function hookWork(calleeId, depth = 0) {
  if (!ts.isIdentifier(calleeId) || depth > 2) return 0;
  let s = checker.getSymbolAtLocation(calleeId);
  if (s && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s);
  const d = s?.declarations?.[0];
  const fnNode = d && (ts.isFunctionDeclaration(d) ? d : ts.isVariableDeclaration(d) ? d.initializer : undefined);
  const root = fnNode && rootByFn.get(fnNode);
  if (!root) return 0;
  if (workCache.has(root)) return workCache.get(root);
  workCache.set(root, 0);
  root.refs ??= indexRefs(root);
  let n = 0;
  walk(root.fn, (m) => {
    if (!ts.isCallExpression(m) || contextOf(m, root) !== "render") return;
    if (ts.isPropertyAccessExpression(m.expression) && EXPENSIVE_METHODS.has(calleeName(m))) n++;
    else if (ts.isIdentifier(m.expression) && isHookName(m.expression.text) && !CHEAP_HOOKS.has(m.expression.text)) n += hookWork(m.expression, depth + 1);
  });
  workCache.set(root, n);
  return n;
}

const HF_EVENTS = new Set("scroll resize mousemove pointermove touchmove wheel drag dragover timeupdate".split(" "));
const HF_JSX = new Set("onScroll onWheel onPointerMove onMouseMove onTouchMove onDrag onDragOver onTimeUpdate".split(" "));
function highFrequency(root, svs) {
  const fn = root.fn;
  const sources = [];
  walk(fn, (n) => {
    if (ts.isCallExpression(n)) {
      const name = calleeName(n);
      if (name === "addEventListener" && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && HF_EVENTS.has(n.arguments[0].text)) sources.push({ cb: n.arguments[1], why: `addEventListener("${n.arguments[0].text}")` });
      if (name === "requestAnimationFrame") sources.push({ cb: n.arguments[0], why: "requestAnimationFrame" });
      if (name === "setInterval" && n.arguments[1] && ts.isNumericLiteral(n.arguments[1]) && Number(n.arguments[1].text) < 250) sources.push({ cb: n.arguments[0], why: `setInterval(${n.arguments[1].text})` });
    }
    if (ts.isNewExpression(n) && /^(ResizeObserver|MutationObserver)$/.test(n.expression.getText())) sources.push({ cb: n.arguments?.[0], why: `new ${n.expression.getText()}` });
    if (ts.isJsxAttribute(n) && HF_JSX.has(n.name.getText()) && n.initializer && ts.isJsxExpression(n.initializer)) sources.push({ cb: n.initializer.expression, why: n.name.getText() });
  });
  const seen = new Set();
  for (const { cb, why } of sources) {
    if (!cb) continue;
    let fnNode = cb;
    if (ts.isIdentifier(cb)) {
      const d = symOf(cb)?.declarations?.[0];
      if (d && ts.isVariableDeclaration(d) && d.initializer && isFn(d.initializer)) fnNode = d.initializer;
      else if (d && ts.isFunctionDeclaration(d)) fnNode = d;
    }
    if (!isFn(fnNode)) continue;
    // the callback and the local functions it calls (two levels), e.g. onPointerMove -> move -> setCrop
    const visit = (f, depth, outer) =>
      walk(f, (n) => {
        if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression) || seen.has(n)) return;
        const sv = svs.find((s) => s.setterSym && symOf(n.expression) === s.setterSym);
        const store = n.expression.text === "update";
        if (!sv && !store) {
          const d = symOf(n.expression)?.declarations?.[0];
          const local = d && d.pos >= fn.pos && d.end <= fn.end;
          const body = local && (ts.isFunctionDeclaration(d) ? d : ts.isVariableDeclaration(d) && isFn(d.initializer) ? d.initializer : undefined);
          if (body && depth < 2) visit(body, depth + 1, outer);
          return;
        }
        seen.add(n);
        let inTransition = false;
        for (let p = n.parent; p && p !== f.parent; p = p.parent)
          if (ts.isCallExpression(p) && calleeName(p) === "startTransition") inTransition = true;
        const target = sv ? sv.value?.text ?? "(no value)" : "demo store";
        hit("rerender-transitions", n, `${why} -> ${short(n, 50)} ${inTransition ? "IN startTransition" : "urgent"} [${root.name}]`);
        hit("rerender-use-ref-transient-values", n, `${why} sets ${target} per event [${root.name}]`);
      });
    visit(fnNode, 0, fnNode);
  }
  // AI SDK useChat subscribes with useSyncExternalStore (never a transition); without
  // experimental_throttle every streamed chunk re-renders the chat.
  for (const c of callsOf(root, new Set(["useChat"]))) {
    const opts = c.arguments[0];
    const throttled = opts && ts.isObjectLiteralExpression(opts) && opts.properties.some((p) => p.name?.getText() === "experimental_throttle");
    if (!throttled) hit("rerender-transitions", c, `useChat without experimental_throttle: one render per streamed chunk [${root.name}]`);
  }
}

const TEXT_TAGS = /^(input|textarea|Input|TextArea|TextField|SearchField|Autocomplete|ComboBox|InputGroup)$/;
function textInputs(root, svs) {
  const fn = root.fn;
  const deferredOf = new Set();
  for (const c of callsOf(root, new Set(["useDeferredValue"]))) {
    const a = c.arguments[0];
    if (a && ts.isIdentifier(a)) deferredOf.add(symOf(a));
  }
  walk(fn, (n) => {
    if (!(ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n))) return;
    const tag = n.tagName.getText().split(".").pop();
    if (!TEXT_TAGS.test(tag)) return;
    const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
    const typeAttr = attrs.find((a) => a.name.getText() === "type");
    if (typeAttr && /checkbox|radio|range|file|date|time|color|hidden|submit/.test(typeAttr.getText())) return;
    for (const a of attrs) {
      if (!/^on(Change|Input|ValueChange|InputChange)$/.test(a.name.getText())) continue;
      const h = a.initializer?.expression;
      if (!h) continue;
      let hFn = h;
      if (ts.isIdentifier(h)) {
        const sv = svs.find((s) => s.setterSym && symOf(h) === s.setterSym);
        if (sv) {
          report(sv, a);
          continue;
        }
        const d = symOf(h)?.declarations?.[0];
        hFn = d && ts.isVariableDeclaration(d) && d.initializer ? d.initializer : d;
        if (!hFn) {
          info("text-input-external-setter", a, `${tag}.${a.name.getText()}={${h.text}} [${root.name}]`);
          continue;
        }
      }
      if (!hFn || !(isFn(hFn) || ts.isFunctionDeclaration(hFn))) continue;
      walk(hFn, (m) => {
        if (!ts.isCallExpression(m)) return;
        const sv = ts.isIdentifier(m.expression) && svs.find((s) => s.setterSym && symOf(m.expression) === s.setterSym);
        if (sv) report(sv, a);
        else info("text-input-calls", a, `${tag}.${a.name.getText()} calls ${short(m.expression, 40)} [${root.name}]`);
      });
    }
  });
  function report(sv, attr) {
    if (!sv.valueSym) return;
    // follow render-time locals derived from the typed value (const needle = query.trim() ...)
    const tainted = new Set([sv.valueSym]);
    for (let grew = true; grew; ) {
      grew = false;
      walk(fn, (n) => {
        if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer || contextOf(n, root) !== "render") return;
        const sym = checker.getSymbolAtLocation(n.name);
        if (tainted.has(sym) || isFn(n.initializer)) return;
        if ([...tainted].some((t) => refersTo(n.initializer, t)) && !EXPENSIVE_METHODS.has(n.initializer.expression?.name?.text)) {
          tainted.add(sym);
          grew = true;
        }
      });
    }
    const uses = [...tainted].flatMap((t) => root.refs.get(t) ?? []).filter((r) => contextOf(r, root) === "render");
    const listWork = [];
    for (const u of uses) {
      for (let p = u.parent; p && p !== fn; p = p.parent) {
        if (ts.isCallExpression(p) && (EXPENSIVE_METHODS.has(calleeName(p)) || (isHookName(calleeName(p)) && !CHEAP_HOOKS.has(calleeName(p))) || calleeName(p) === "useMemo")) {
          listWork.push(calleeName(p));
          break;
        }
        if (ts.isJsxAttribute(p) && !/^(value|defaultValue|aria-|className|placeholder)/.test(p.name.getText())) {
          const tag = p.parent.parent.tagName?.getText() ?? "";
          if (/^[A-Z]/.test(tag) && !TEXT_TAGS.test(tag.split(".").pop())) listWork.push(`<${tag} ${p.name.getText()}>`);
          break;
        }
      }
    }
    // only list work (array methods, useMemo, custom hooks) counts; a prop like isDisabled is not heavy
    if (!listWork.some((w) => !w.startsWith("<"))) {
      if (listWork.length) info("deferred-value-light-only", attr, `${sv.value.text} typed -> ${[...new Set(listWork)].join(", ")} [${root.name}]`);
      return;
    }
    const deferred = deferredOf.has(sv.valueSym);
    hit("rerender-use-deferred-value", attr, `${sv.value.text} typed -> ${[...new Set(listWork)].join(", ")} ${deferred ? "DEFERRED" : "not deferred"} [${root.name}]`);
  }
}

// ---------------------------------------------------------------- subscriptions
const SUBSCRIBE_HOOKS = new Set(
  "useDemo useDemoSelector useDemoNow useStorageFull useContext useLocale useSearch useParams useLocation useRouterState useMatch useSharedClock useIsWide useTours".split(
    " ",
  ),
);
const ACTION_NAMES = new Set("update setRole reset navigate setLanguage t".split(" "));
const demoCalls = [];
function subscriptions(root) {
  for (const c of callsOf(root, SUBSCRIBE_HOOKS)) {
    const name = calleeName(c);
    // binding: const x = useX(), const { a, b } = useX(), const x = useX().state.data.y
    let top = c;
    while (ts.isPropertyAccessExpression(top.parent) && top.parent.expression === top) top = top.parent;
    const decl = top.parent;
    if (name === "useDemo") demoCalls.push({ call: c, root, decl, top });
    if (!ts.isVariableDeclaration(decl) || decl.initializer !== top) {
      if (ts.isReturnStatement(decl) || ts.isCallExpression(decl)) continue; // returned/passed straight on: render use
      continue;
    }
    const bindings = [];
    if (ts.isIdentifier(decl.name)) bindings.push(decl.name);
    else walk(decl.name, (n) => ts.isIdentifier(n) && isDeclName(n) && !(ts.isBindingElement(n.parent) && n.parent.propertyName === n) && bindings.push(n));
    const valueBindings = bindings.filter((b) => !ACTION_NAMES.has(b.text));
    if (name === "useDemo" && top === c && !valueBindings.length) {
      hit("rerender-defer-reads", c, `useDemo() subscribes to the whole state but only ${bindings.map((b) => b.text).join(", ")} is used -> useDemoActions() [${root.name}]`);
      continue;
    }
    if (name === "useDemo") continue; // state vs actions: handled by the useDemo() census below
    const readKinds = (b) => {
      const s = checker.getSymbolAtLocation(b);
      const refs = (root.refs.get(s) ?? []).filter((r) => !(ts.isArrayLiteralExpression(r.parent) && ts.isCallExpression(r.parent.parent)));
      return { refs, kinds: refs.map((r) => contextOf(r, root)) };
    };
    // One call is one subscription: it is needed as soon as any value it returns (t included) is read while rendering.
    const neededByRender = bindings.some((b) => readKinds(b).kinds.includes("render"));
    for (const b of valueBindings) {
      const { refs, kinds } = readKinds(b);
      if (!neededByRender) {
        if (!refs.length && !bindings.some((x) => x !== b && readKinds(x).refs.length))
          hit("rerender-defer-reads", b, `${name}() value ${b.text} is never read (subscription for nothing) [${root.name}]`);
        else if (refs.length && kinds.every((k) => k === "deferred"))
          hit("rerender-defer-reads", b, `${name}() value ${b.text} read only in handlers (${refs.length}) [${root.name}]`);
        else if (refs.length && kinds.every((k) => k === "deferred" || k === "returned") && kinds.includes("returned"))
          info("defer-reads-returned-only", b, `${name}() value ${b.text} read only in callbacks the hook returns [${root.name}]`);
        else if (refs.length && kinds.every((k) => k !== "render"))
          info("defer-reads-effect-only", b, `${name}() value ${b.text} read only in effects/handlers [${root.name}]`);
      }

      // derived-state: a selected collection only used for .length / boolean tests at render
      if (name === "useDemoSelector") {
        const t = checker.getTypeAtLocation(b);
        if (!isPrimitiveType(t) && !isFunctionType(t)) {
          const renderRefs = refs.filter((r, i) => kinds[i] === "render");
          const onlyCount = renderRefs.length > 0 && renderRefs.every((r) => {
            const p = r.parent;
            return ts.isPropertyAccessExpression(p) && p.expression === r && (p.name.text === "length" || (ts.isCallExpression(p.parent) && /^(some|every|includes|find|findIndex)$/.test(p.name.text) && !isFnBetween(p, root.fn) ));
          });
          const allRender = kinds.every((k) => k === "render");
          if (onlyCount && allRender) hit("rerender-derived-state", b, `useDemoSelector returns a collection but render only uses ${renderRefs.map((r) => short(r.parent, 30)).join(" | ")} [${root.name}]`);
        }
      }
    }
  }
  // useTours() bundles s.data.tours, three more selectors and a minute clock: callers that read only part of it
  for (const c of callsOf(root, new Set(["useTours"]))) {
    let top = c;
    while (ts.isPropertyAccessExpression(top.parent) && top.parent.expression === top) top = top.parent;
    const used = top !== c ? [top.getText().split(".")[1]] : ts.isVariableDeclaration(top.parent) && ts.isObjectBindingPattern(top.parent.name) ? top.parent.name.elements.map((e) => (e.propertyName ?? e.name).getText()) : null;
    if (!used) continue;
    const slice = used.some((u) => /^(data|tours|departures|bookings|draft|guides|holds)$/.test(u));
    const clock = used.includes("now");
    if (!slice || !clock)
      hit("rerender-derived-state", c, `useTours() reads only {${used.join(", ")}} but subscribes to ${[!slice && "s.data.tours (every booking/draft write)", !clock && "a 60 s clock"].filter(Boolean).join(" and ")} [${root.name}]`);
  }
  // useDemoSelector whose selector returns a fresh object/array (unstable snapshot)
  for (const c of callsOf(root, new Set(["useDemoSelector"]))) {
    const sel = c.arguments[0];
    if (!isFn(sel)) continue;
    const ret = ts.isBlock(sel.body) ? undefined : sel.body;
    if (!ret) {
      info("selector-block-body", c, short(c, 80));
      continue;
    }
    let e = ret;
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    const fresh =
      ts.isArrayLiteralExpression(e) || ts.isObjectLiteralExpression(e) || ts.isNewExpression(e) ||
      (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && /^(filter|map|slice|concat|flatMap|toSorted|toReversed|entries|keys|values)$/.test(e.expression.name.text));
    if (fresh) hit("rerender-derived-state", c, `selector returns a fresh value every call (unstable snapshot): ${short(sel, 60)} [${root.name}]`);
  }
}

for (const root of roots) analyzeRoot(root);

// useDemo(): whole-state subscribers -> derived-state hits when they read state during render
for (const { call, root, decl, top } of demoCalls) {
  if (top !== call) {
    hit("rerender-derived-state", call, `useDemo() whole state, reads only ${short(top, 50)} -> useDemoSelector [${root.name}]`);
    info("useDemo-census", call, `${root.name}\tslice ${short(top, 50)}`);
    continue;
  }
  if (!ts.isVariableDeclaration(decl) || !ts.isObjectBindingPattern(decl.name)) {
    info("useDemo-census", call, `${root.name}\tnon-destructured`);
    continue;
  }
  const stateEl = decl.name.elements.find((e) => (e.propertyName ?? e.name).getText() === "state");
  const actions = decl.name.elements.filter((e) => e !== stateEl).map((e) => e.name.getText());
  if (!stateEl) {
    info("useDemo-census", call, `${root.name}\tactions-only(${actions.join(",")})`);
    continue;
  }
  const s = checker.getSymbolAtLocation(stateEl.name);
  const refs = root.refs.get(s) ?? [];
  const paths = new Set();
  let whole = false;
  const kinds = new Set();
  for (const r of refs) {
    kinds.add(contextOf(r, root));
    let p = r;
    while (ts.isPropertyAccessExpression(p.parent) && p.parent.expression === p && p.getText().split(".").length < 3) p = p.parent;
    if (p === r) whole = true;
    paths.add(p.getText());
  }
  const renderRead = refs.some((r) => contextOf(r, root) === "render");
  info("useDemo-census", call, `${root.name}\tstate[${[...kinds].join("/")}] paths=${[...paths].join(",")}${whole ? " (whole state passed on)" : ""}${actions.length ? ` actions=${actions.join(",")}` : ""}`);
  if (renderRead) hit("rerender-derived-state", call, `useDemo() whole state; render reads ${[...paths].join(", ")}${whole ? " (whole object passed on)" : ""} [${root.name}]`);
  else hit("rerender-defer-reads", call, `useDemo() state read only in ${[...kinds].join("/")} [${root.name}]`);
}

// ---------------------------------------------------------------- store writers and their triggers
const writerCalls = [];
for (const root of roots) {
  for (const c of callsOf(root, new Set(["update", "setRole", "reset"]))) {
    if (!ts.isIdentifier(c.expression) && !ts.isPropertyAccessExpression(c.expression)) continue;
    const id = ts.isIdentifier(c.expression) ? c.expression : c.expression.name;
    const d = symOf(id)?.declarations?.[0];
    // only the demo store's writers: bound from useDemo()/useDemoActions()
    let p = d;
    while (p && !ts.isVariableDeclaration(p)) p = p.parent;
    const init = p?.initializer?.getText() ?? "";
    if (!/useDemo(Actions)?\(\)/.test(init) && !/actions/.test(c.expression.getText())) continue;
    const ctx = contextOf(c, root);
    let trigger = ctx;
    for (let q = c.parent; q && q !== root.fn; q = q.parent) {
      if (ts.isJsxAttribute(q)) {
        trigger = `${q.name.getText()} on <${q.parent.parent.tagName?.getText()}>`;
        break;
      }
    }
    writerCalls.push(c);
    info("store-writes", c, `${calleeName(c)} ctx=${ctx} trigger=${trigger} [${root.name}] ${area(c)}`);
  }
}

// ---------------------------------------------------------------- output
if (seedMode) {
  for (const r of RULES) console.log(`${r}\t${sites.get(r).length}\t${sites.get(r).length ? "SEED-OK" : "SEED-MISSED"}`);
} else {
  for (const r of RULES) console.log(`${r}\t${sites.get(r).length}`);
}
console.log(`(roots scanned\t${roots.length} components+hooks in ${files.length} files)`);
for (const [k, v] of extra) console.log(`(info ${k}\t${v.length})`);
if (showSites) {
  for (const r of RULES) for (const s of sites.get(r)) console.log(`${r}\t${s}`);
  for (const [k, v] of extra) if (k !== "useMemo-total") for (const s of v) console.log(`info:${k}\t${s}`);
}
