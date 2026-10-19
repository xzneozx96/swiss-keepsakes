// Census of demo-store subscriptions and the writes that wake them, to decide which whole-state
// useDemo() callers sit on hot paths. Static trace only (no browser).
//   1. every useDemo() call: the components that end up running it (through custom hooks), and
//      whether any of those components is rendered per list item (inside .map/.flatMap)
//   2. every input handler (onChange/onInput/onValueChange/onInputChange, tiptap onUpdate) that
//      reaches the store's update/setRole/reset, followed through props and hook return values
// Usage: node demo-hot-paths.mjs [--all]
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontEnd = path.resolve(here, "../../../../front-end");
const require = createRequire(path.join(frontEnd, "package.json"));
const ts = require("typescript");
const src = path.join(frontEnd, "src");

const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(frontEnd, "tsconfig.json"), ts.sys.readFile).config, ts.sys, frontEnd);
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();
const files = program.getSourceFiles().filter((sf) => sf.fileName.startsWith(src) && !sf.fileName.endsWith(".d.ts") && !sf.fileName.endsWith("routeTree.gen.ts"));

const loc = (n) => {
  const sf = n.getSourceFile();
  return `${path.relative(src, sf.fileName)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
};
const walk = (n, cb) => {
  cb(n);
  ts.forEachChild(n, (c) => walk(c, cb));
};
const isFn = (n) => n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n));
const calleeName = (c) => (ts.isIdentifier(c.expression) ? c.expression.text : ts.isPropertyAccessExpression(c.expression) ? c.expression.name.text : "");
const resolve = (id) => {
  let s = ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id ? checker.getShorthandAssignmentValueSymbol(id.parent) : checker.getSymbolAtLocation(id);
  if (s && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s);
  return s;
};
function fnName(fn) {
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
  let p = fn.parent;
  while (p && ts.isCallExpression(p) && ["memo", "forwardRef"].includes(calleeName(p))) p = p.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  return undefined;
}
const isComp = (s) => !!s && /^[A-Z]/.test(s);
const isHook = (s) => !!s && /^use[A-Z0-9]/.test(s);

// roots: outermost components and hooks, keyed by the declaration their name resolves to
const roots = [];
const rootByDecl = new Map();
for (const sf of files)
  walk(sf, (n) => {
    if (!isFn(n)) return;
    const name = fnName(n);
    if (!isComp(name) && !isHook(name)) return;
    for (let p = n.parent; p; p = p.parent) if (isFn(p) && (isComp(fnName(p)) || isHook(fnName(p)))) return;
    const r = { fn: n, name, file: path.relative(src, sf.fileName) };
    roots.push(r);
    let d = n;
    if (!ts.isFunctionDeclaration(n)) {
      d = n.parent;
      while (d && !ts.isVariableDeclaration(d)) d = d.parent;
    }
    if (d) rootByDecl.set(d, r);
  });
const rootOf = (node) => {
  for (let p = node; p; p = p.parent) if (isFn(p) && roots.some((r) => r.fn === p)) return roots.find((r) => r.fn === p);
  return undefined;
};
const declOfSym = (s) => s?.declarations?.find((d) => ts.isFunctionDeclaration(d) || ts.isVariableDeclaration(d));

// call graph: hook root -> roots that call it; component root -> JSX usages
const callers = new Map(); // root -> Set(root)
const jsxUses = new Map(); // component root -> [{ node, perItem, inRoot }]
for (const sf of files)
  walk(sf, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && isHook(n.expression.text)) {
      const target = rootByDecl.get(declOfSym(resolve(n.expression)));
      const from = rootOf(n);
      if (target && from && target !== from) {
        if (!callers.has(target)) callers.set(target, new Set());
        callers.get(target).add(from);
      }
    }
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && ts.isIdentifier(n.tagName) && isComp(n.tagName.text)) {
      const target = rootByDecl.get(declOfSym(resolve(n.tagName)));
      if (!target) return;
      // per item: inside .map/.flatMap, or inside a render function another component calls once
      // per row (DataTable cards/render/cell, React Aria collection children, any non-event JSX
      // function prop or function child). Conservative: a render prop called once also counts.
      let perItem = false;
      for (let p = n.parent; p; p = p.parent) {
        if (ts.isCallExpression(p) && ["map", "flatMap"].includes(calleeName(p))) perItem = true;
        if (isFn(p)) {
          let q = p.parent;
          while (q && ts.isParenthesizedExpression(q)) q = q.parent;
          if (ts.isJsxExpression(q) && (!ts.isJsxAttribute(q.parent) || !/^on[A-Z]/.test(q.parent.name.getText()))) perItem = true;
          if (ts.isPropertyAssignment(q) && /^(render|cell|renderItem|renderRow|row|card|cards|content)$/.test(q.name.getText())) perItem = true;
        }
        if (roots.some((r) => r.fn === p)) break;
      }
      if (!jsxUses.has(target)) jsxUses.set(target, []);
      jsxUses.get(target).push({ node: n, perItem, inRoot: rootOf(n) });
    }
  });

// components that end up executing a root (through hooks), with the hook chain
function componentsRunning(root, seen = new Set()) {
  if (seen.has(root)) return [];
  seen.add(root);
  if (isComp(root.name)) return [root];
  return [...(callers.get(root) ?? [])].flatMap((c) => componentsRunning(c, seen));
}
function perItemUses(comp) {
  return (jsxUses.get(comp) ?? []).filter((u) => u.perItem);
}

// ---------------------------------------------------------------- 1. useDemo() census
const demoRows = [];
for (const sf of files)
  walk(sf, (n) => {
    if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression) || n.expression.text !== "useDemo" || n.arguments.length) return;
    const r = rootOf(n);
    if (!r || r.name === "useDemo") return;
    const comps = componentsRunning(r);
    const items = comps.flatMap((c) => perItemUses(c).map((u) => `${c.name} per item at ${loc(u.node)}`));
    const area = /lab/.test(r.file) ? "lab" : /merchant|partners\/report|reports|routes\/store|routes\/partner|tours\/merchant|content\/merchant|requests\/merchant/.test(r.file) ? "merchant/partner" : "guest";
    demoRows.push({ site: loc(n), root: r.name, area, comps: comps.map((c) => c.name), items });
  });

// ---------------------------------------------------------------- 2. input handlers that write to the store
const STORE_WRITERS = new Set(["update", "setRole", "reset"]);
function isStoreWriterSym(s) {
  return !!s?.declarations?.some((d) => {
    const name = d.name?.getText?.();
    if (!STORE_WRITERS.has(name)) return false;
    if (path.basename(d.getSourceFile().fileName) === "demo-store.tsx") return true; // DemoActions members
    if (ts.isBindingElement(d)) {
      let v = d.parent;
      while (v && !ts.isVariableDeclaration(v)) v = v.parent;
      return /useDemo(Actions)?\(\)/.test(v?.initializer?.getText() ?? "");
    }
    return false;
  });
}
const memo = new Map();
// Returns the chain of names that reaches a store write from this function, or null.
function reachesStore(fnNode, depth = 0) {
  if (!fnNode || depth > 6) return null;
  if (memo.has(fnNode)) return memo.get(fnNode);
  memo.set(fnNode, null);
  let found = null;
  walk(fnNode, (n) => {
    if (found || !ts.isCallExpression(n)) return;
    const id = ts.isIdentifier(n.expression) ? n.expression : ts.isPropertyAccessExpression(n.expression) ? n.expression.name : undefined;
    if (!id) return;
    const s = resolve(id);
    if (isStoreWriterSym(s)) {
      found = [`${id.text}() ${loc(n)}`];
      return;
    }
    for (const target of functionTargets(s, id)) {
      const chain = reachesStore(target.fn, depth + 1);
      if (chain) {
        found = [`${id.text} ${target.via}`, ...chain];
        return;
      }
    }
  });
  memo.set(fnNode, found);
  return found;
}
// Function bodies a called symbol can stand for: its own declaration, a hook-returned property,
// or (for a destructured prop) every handler passed to that prop at the component's JSX uses.
function functionTargets(s, id) {
  const out = [];
  for (const d of s?.declarations ?? []) {
    if (isFn(d)) out.push({ fn: d, via: `(${loc(d)})` });
    else if ((ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d)) && d.initializer) {
      let init = d.initializer;
      if (ts.isCallExpression(init) && ["useCallback", "useEffectEvent"].includes(calleeName(init))) init = init.arguments[0];
      if (isFn(init)) out.push({ fn: init, via: `(${loc(d)})` });
      else if (ts.isIdentifier(init)) out.push(...functionTargets(resolve(init), init));
    } else if (ts.isShorthandPropertyAssignment(d)) {
      out.push(...functionTargets(checker.getShorthandAssignmentValueSymbol(d), d.name));
    } else if (ts.isMethodDeclaration(d)) out.push({ fn: d, via: `(${loc(d)})` });
    else if (ts.isBindingElement(d) && destructuredFromCall(d)) {
      // const { updateDraft } = useTourActions(): follow the property of the hook's return type
      const call = destructuredFromCall(d);
      const propName = (d.propertyName ?? d.name).getText();
      const prop = checker.getTypeAtLocation(call).getProperty(propName);
      if (prop) out.push(...functionTargets(prop, d.name).map((t) => ({ ...t, via: `${calleeName(call)}().${propName} ${t.via}` })));
    } else if (ts.isPropertySignature(d) || ts.isBindingElement(d) || ts.isParameter(d)) {
      // a prop: find the component and the handlers its users pass for this prop
      const propName = ts.isBindingElement(d) ? (d.propertyName ?? d.name).getText() : d.name.getText();
      let fn = d.parent;
      while (fn && !isFn(fn)) fn = fn.parent;
      const comp = fn && roots.find((r) => r.fn === fn);
      if (!comp) continue;
      for (const u of jsxUses.get(comp) ?? []) {
        const attrs = (ts.isJsxOpeningElement(u.node) || ts.isJsxSelfClosingElement(u.node) ? u.node.attributes.properties : []).filter(ts.isJsxAttribute);
        const a = attrs.find((x) => x.name.getText() === propName);
        const e = a?.initializer && ts.isJsxExpression(a.initializer) ? a.initializer.expression : undefined;
        if (!e) continue;
        if (isFn(e)) out.push({ fn: e, via: `prop ${propName} from <${comp.name}> at ${loc(u.node)}` });
        else if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e)) {
          const eid = ts.isIdentifier(e) ? e : e.name;
          out.push(...functionTargets(resolve(eid), eid).map((t) => ({ ...t, via: `prop ${propName} from <${comp.name}> at ${loc(u.node)} -> ${eid.text}` })));
        }
      }
    }
  }
  return out;
}

function destructuredFromCall(bindingElement) {
  let v = bindingElement.parent;
  while (v && (ts.isObjectBindingPattern(v) || ts.isArrayBindingPattern(v) || ts.isBindingElement(v))) v = v.parent;
  return v && ts.isVariableDeclaration(v) && v.initializer && ts.isCallExpression(v.initializer) ? v.initializer : undefined;
}

const INPUT_EVENTS = /^on(Change|Input|ValueChange|InputChange)$/;
const writes = [];
for (const sf of files)
  walk(sf, (n) => {
    let handler;
    let label;
    if (ts.isJsxAttribute(n) && INPUT_EVENTS.test(n.name.getText()) && n.initializer && ts.isJsxExpression(n.initializer)) {
      handler = n.initializer.expression;
      label = `<${n.parent.parent.tagName.getText()} ${n.name.getText()}>`;
    } else if (ts.isPropertyAssignment(n) && n.name.getText() === "onUpdate" && isFn(n.initializer)) {
      handler = n.initializer;
      label = "editor onUpdate";
    }
    if (!handler) return;
    let fns = [];
    if (isFn(handler)) fns = [{ fn: handler, via: "" }];
    else if (ts.isIdentifier(handler) || ts.isPropertyAccessExpression(handler)) {
      const id = ts.isIdentifier(handler) ? handler : handler.name;
      const s = resolve(id);
      if (isStoreWriterSym(s)) {
        writes.push({ site: loc(n), label, chain: [`${id.text}()`] });
        return;
      }
      fns = functionTargets(s, id);
    }
    for (const f of fns) {
      const chain = reachesStore(f.fn);
      if (chain) {
        writes.push({ site: loc(n), label, chain: f.via ? [f.via, ...chain] : chain });
        break;
      }
    }
  });

// ---------------------------------------------------------------- 3. what a keystroke wakes
// For each text-field write: the route component(s) above it, everything rendered or called below
// those routes and below the always-mounted layouts, and the whole-state useDemo() sites in that set.
const childRoots = new Map();
for (const r of roots) {
  const set = new Set();
  walk(r.fn, (n) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && ts.isIdentifier(n.tagName)) {
      const t = rootByDecl.get(declOfSym(resolve(n.tagName)));
      if (t) set.add(t);
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && isHook(n.expression.text)) {
      const t = rootByDecl.get(declOfSym(resolve(n.expression)));
      if (t) set.add(t);
    }
  });
  childRoots.set(r, set);
}
function down(start) {
  const seen = new Set();
  const stack = [...start];
  while (stack.length) {
    const r = stack.pop();
    if (seen.has(r)) continue;
    seen.add(r);
    stack.push(...(childRoots.get(r) ?? []));
  }
  return seen;
}
function upToRoutes(start) {
  const seen = new Set();
  const out = new Set();
  const stack = [start];
  while (stack.length) {
    const r = stack.pop();
    if (!r || seen.has(r)) continue;
    seen.add(r);
    if (r.file.startsWith("routes/")) out.add(r);
    for (const u of jsxUses.get(r) ?? []) stack.push(u.inRoot);
    for (const c of callers.get(r) ?? []) stack.push(c);
  }
  return out;
}
const named = (file, name) => roots.find((r) => r.file === file && r.name === name);
const shells = [named("routes/__root.tsx", "RootLayout"), named("routes/_guest.tsx", "GuestLayout") ?? roots.find((r) => r.file === "routes/_guest.tsx")].filter(Boolean);
const demoByRoot = new Map();
for (const row of demoRows) {
  const r = roots.find((x) => x.name === row.root && row.site.startsWith(x.file));
  if (!demoByRoot.has(r)) demoByRoot.set(r, []);
  demoByRoot.get(r).push(row.site);
}
const keystroke = writes.filter((w) => /TextField|TextArea|Input|SearchField|editor onUpdate/.test(w.label));
const woken = [];
for (const w of keystroke) {
  const file = w.site.split(":")[0];
  const line = Number(w.site.split(":")[1]);
  const sf = files.find((f) => path.relative(src, f.fileName) === file);
  let host;
  walk(sf, (n) => {
    if (!host && isFn(n) && roots.some((r) => r.fn === n)) {
      const s = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      const e = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
      if (s <= line && line <= e) host = roots.find((r) => r.fn === n);
    }
  });
  const routes = upToRoutes(host);
  const mounted = down([...routes, ...shells]);
  const sites = [...mounted].flatMap((r) => demoByRoot.get(r) ?? []);
  woken.push(`keystroke-wakes\t${w.site}\troutes=${[...routes].map((r) => `${r.file}#${r.name}`).join(",")}\twhole-state useDemo() mounted: ${sites.length ? sites.join(", ") : "none"}`);
}

// ---------------------------------------------------------------- output
console.log(`useDemo_calls\t${demoRows.length}`);
console.log(`useDemo_calls_per_list_item\t${demoRows.filter((r) => r.items.length).length}`);
console.log(`input_handlers_writing_store\t${writes.length}`);
for (const r of demoRows)
  console.log(`useDemo\t${r.site}\t${r.root}\t${r.area}\tcomponents=${[...new Set(r.comps)].join(",") || "(none found)"}\t${r.items.length ? `PER-ITEM: ${[...new Set(r.items)].join("; ")}` : "not per item"}`);
for (const w of writes) console.log(`input-write\t${w.site}\t${w.label}\t${w.chain.join(" => ")}`);
console.log(`keystroke_text_fields_writing_store\t${keystroke.length}`);
for (const line of woken) console.log(line);

// Selectors woken by the tour-draft keystrokes: the write replaces s, s.data and s.data.tours, so any
// mounted selector returning one of those (or the draft itself) re-renders its component per keystroke.
const draftSelector = /^\(?s\)?\s*=>\s*s(\.data(\.tours(\??\.draft)?)?)?\s*(\?\?.*)?$/;
for (const w of keystroke) {
  if (!w.chain.some((c) => c.includes("use-tours.ts"))) continue;
  const file = w.site.split(":")[0];
  const host = roots.find((r) => r.file === file && r.name === "TourReviewPage");
  const mounted = down([...upToRoutes(host), ...shells]);
  const hits = [];
  for (const r of mounted)
    walk(r.fn, (n) => {
      if (ts.isCallExpression(n) && calleeName(n) === "useDemoSelector" && draftSelector.test(n.arguments[0]?.getText().replace(/\s+/g, " ") ?? ""))
        hits.push(`${r.name}@${loc(n)} ${n.arguments[0].getText()}`);
    });
  console.log(`draft-keystroke-wakes-selectors\t${w.site}\t${hits.length}\t${hits.join("; ")}`);
  break;
}

// ---------------------------------------------------------------- 4. subscriptions inside list items
// Components rendered inside .map/.flatMap (and everything they render), with the store and clock
// subscriptions they make directly or through custom hooks. Lab code is skipped.
const perItem = new Set();
for (const [comp, uses] of jsxUses) if (uses.some((u) => u.perItem && !/lab/.test(u.inRoot?.file ?? ""))) perItem.add(comp);
const itemTree = new Set();
for (const c of perItem) for (const r of down([c])) if (isComp(r.name) && !/lab/.test(r.file)) itemTree.add(r);
function hookClosure(r, seen = new Set()) {
  for (const c of childRoots.get(r) ?? []) if (isHook(c.name) && !seen.has(c)) {
    seen.add(c);
    hookClosure(c, seen);
  }
  return seen;
}
const SUBS = /^(useDemo|useDemoSelector|useDemoNow|useSharedClock|useStorageFull)$/;
const itemRows = [];
for (const comp of itemTree) {
  const subs = [];
  for (const r of [comp, ...hookClosure(comp)])
    walk(r.fn, (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && SUBS.test(n.expression.text) && r.name !== "useDemoNow" && r.name !== "useDemo")
        subs.push(`${r === comp ? "" : `${r.name}:`}${n.expression.text}(${n.arguments.map((a) => a.getText().replace(/\s+/g, " ")).join(", ").slice(0, 60)})`);
    });
  if (subs.length) itemRows.push(`item-subscriptions\t${comp.file}#${comp.name}\t${subs.length}\t${subs.join("; ")}`);
}
console.log(`per_item_components_with_subscriptions\t${itemRows.length}`);
for (const row of itemRows) console.log(row);

// ---------------------------------------------------------------- 5. writes from effects and timers
// Store writes that no input triggers: effect callbacks and timer callbacks that reach update/setRole/reset.
// Their deps say how often they can fire (a clock dep means once per tick at most).
const effectWrites = [];
for (const r of roots)
  walk(r.fn, (n) => {
    if (!ts.isCallExpression(n)) return;
    const name = calleeName(n);
    const cb = n.arguments[0];
    if (!isFn(cb)) return;
    if (["useEffect", "useLayoutEffect"].includes(name)) {
      const chain = reachesStore(cb);
      if (chain) effectWrites.push(`effect-write\t${loc(n)}\t${r.name}\tdeps=${n.arguments[1]?.getText().replace(/\s+/g, " ") ?? "(none)"}\t${chain.join(" => ")}`);
    } else if (["setInterval", "setTimeout"].includes(name)) {
      const chain = reachesStore(cb);
      if (chain) effectWrites.push(`timer-write\t${loc(n)}\t${r.name}\t${name}\t${chain.join(" => ")}`);
    }
  });
console.log(`effect_or_timer_store_writes\t${effectWrites.length}`);
for (const row of effectWrites) console.log(row);

// ---------------------------------------------------------------- 6. which useDemo() callers are mounted at all
// Reachable = rendered or called below some route component or layout (JSX in comments does not count;
// React.lazy targets are not followed, so an "unreached" row must be checked by hand for lazy loading).
const routeSeeds = new Set(roots.filter((r) => r.file.startsWith("routes/")));
for (const sf of files)
  if (path.relative(src, sf.fileName).startsWith("routes/"))
    walk(sf, (n) => {
      // createFileRoute({ component: CalendarPage }) names a feature component without JSX
      if (ts.isIdentifier(n) && !ts.isImportSpecifier(n.parent)) {
        const t = rootByDecl.get(declOfSym(resolve(n)));
        if (t) routeSeeds.add(t);
      }
    });
const reachable = down([...routeSeeds]);
let unreached = 0;
for (const row of demoRows) {
  const r = roots.find((x) => x.name === row.root && row.site.startsWith(x.file));
  if (reachable.has(r)) continue;
  unreached++;
  console.log(`useDemo-unreached\t${row.site}\t${row.root}`);
}
console.log(`useDemo_calls_not_reached_from_any_route\t${unreached}`);
