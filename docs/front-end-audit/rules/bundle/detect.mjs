// Detectors for the six bundle-* rules. Source checks use the TypeScript compiler API;
// build checks read graph.json and the dist folder written by build-graph.mjs.
//
// usage:
//   node build-graph.mjs <out>                       # fresh production build + graph
//   node detect.mjs --graph <out>/graph.json --dist <out>/dist [--log <build.log>] [--root <front-end>] [-v]
// Seed check (every rule must report hits):
//   node detect.mjs --root seed --graph seed/graph.json --dist seed/dist --log seed/build.log
//
// Prints detail lines, then one `rule<TAB>hits` line per rule.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const FE = resolve(HERE, "../../../../front-end");
const ts = createRequire(join(FE, "package.json"))("typescript");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? resolve(args[i + 1]) : fallback;
};
const verbose = args.includes("-v");
const ROOT = opt("root", FE);
const SRC = join(ROOT, "src");
const graphPath = opt("graph");
const distDir = opt("dist");
const logPath = opt("log");

if (!graphPath || !distDir) {
  console.error("usage: node detect.mjs --graph <graph.json> --dist <dist> [--log <build.log>] [--root <dir>] [-v]");
  process.exit(1);
}

// ---------- shared: source files, AST, import resolution ----------

const walkFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);

    if (statSync(p).isDirectory()) return walkFiles(p);

    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") ? [p] : [];
  });
const files = walkFiles(SRC).filter((f) => !f.endsWith("routeTree.gen.ts"));
const astCache = new Map();
const astOf = (file) => {
  if (!astCache.has(file)) {
    astCache.set(
      file,
      ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS),
    );
  }

  return astCache.get(file);
};
const rel = (p) => relative(ROOT, p.replace(/\?.*$/, ""));
const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const site = (sf, node) => `${rel(sf.fileName)}:${lineOf(sf, node)}`;
const visit = (node, fn) => {
  fn(node);
  ts.forEachChild(node, (child) => visit(child, fn));
};
const isLiteralPath = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));

function resolveImport(fromFile, spec) {
  let base;

  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null;
  base = base.replace(/\?.*$/, "");
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base + ext;

    if (existsSync(p) && statSync(p).isFile()) return p;
  }

  return null;
}

/** name -> { spec, file, typeOnly } for every binding a file imports. */
function importsOf(sf) {
  const map = new Map();

  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const spec = st.moduleSpecifier.text;
    const file = resolveImport(sf.fileName, spec);
    const clause = st.importClause;
    const allType = clause.isTypeOnly;

    if (clause.name) map.set(clause.name.text, { spec, file, typeOnly: allType });
    const nb = clause.namedBindings;

    if (nb && ts.isNamespaceImport(nb)) map.set(nb.name.text, { spec, file, typeOnly: allType, namespace: true });
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) {
        map.set(el.name.text, { spec, file, typeOnly: allType || el.isTypeOnly, imported: (el.propertyName ?? el.name).text });
      }
    }
  }

  return map;
}

/** Identifiers read inside a node, skipping types, property names and declared names. */
function referencedNames(node) {
  const names = new Set();
  const walk = (n) => {
    if (ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const declared =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isPropertyAssignment(p) && p.name === n) ||
        ((ts.isParameter(p) || ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isBindingElement(p)) && p.name === n) ||
        (ts.isJsxAttribute(p) && p.name === n);

      if (!declared) names.add(n.text);
    }
    ts.forEachChild(n, walk);
  };

  walk(node);

  return names;
}

// ---------- shared: build graph and first-load set ----------

const graphText = readFileSync(graphPath, "utf8").replaceAll("<ROOT>", ROOT);
const { chunks, modules } = JSON.parse(graphText);
const byFile = new Map(chunks.map((c) => [c.file, c]));
const firstChunks = new Set();
const walkChunks = (f) => {
  if (firstChunks.has(f)) return;
  firstChunks.add(f);
  byFile.get(f).imports.forEach(walkChunks);
};

walkChunks(chunks.find((c) => c.isEntry).file);
/** module id -> rendered bytes, for modules in first-load chunks. */
const FL = new Map();

for (const f of firstChunks) for (const [id, len] of Object.entries(byFile.get(f).modules)) FL.set(id, len);
const pkgOf = (id) => id.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1] ?? null;
const flBytesOfPkg = (test) => [...FL].filter(([id]) => pkgOf(id) && test(pkgOf(id))).reduce((a, [, l]) => a + l, 0);
const isRouteFile = (f) => f.startsWith(join(SRC, "routes") + "/");
/** Does this importer file pull `target` into the first load? Route files count only through their post-split reference module. */
const importsInFirstLoad = (importerFile, targetFile) =>
  FL.has(importerFile) && (!isRouteFile(importerFile) || (modules[importerFile]?.importedIds ?? []).includes(targetFile));

const results = [];
const report = (rule, hits, lines) => {
  results.push([rule, hits]);
  console.log(`\n## ${rule} (${hits} hits)`);
  for (const l of lines) console.log(l);
};

// ---------- bundle-analyzable-paths ----------
{
  const lines = [];
  let hits = 0;
  let literal = 0;

  for (const file of files) {
    const sf = astOf(file);

    visit(sf, (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const isImport = callee.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(callee) && callee.text === "require";
        const isGlob = ts.isPropertyAccessExpression(callee) && callee.getText(sf) === "import.meta.glob";

        if (isImport || isRequire) {
          if (isLiteralPath(n.arguments[0])) literal++;
          else {
            hits++;
            lines.push(`HIT non-literal ${isImport ? "import()" : "require()"}\t${site(sf, n)}\t${n.getText(sf).slice(0, 80)}`);
          }
        }
        if (isGlob) {
          const options = n.arguments[1]?.getText(sf) ?? "";
          const eager = options.includes("eager: true");
          // Eager globs over asset files with import: "default" only inline URL strings.
          const assetUrls = /\.(jpe?g|png|webp|avif|gif|svg|mp3|mp4|webm|woff2?)["']\s*$/.test(n.arguments[0]?.getText(sf) ?? "") && /import:\s*["']default["']/.test(options);

          if (!isLiteralPath(n.arguments[0]) || (eager && !assetUrls)) {
            hits++;
            lines.push(`HIT import.meta.glob ${eager ? "eager over code modules" : "non-literal"}\t${site(sf, n)}`);
          } else lines.push(`ok  import.meta.glob literal${eager ? ", eager asset URLs only" : ", lazy"}\t${site(sf, n)}\t${n.arguments[0].getText(sf)}`);
        }
      }
      if (ts.isNewExpression(n) && n.expression.getText(sf) === "URL" && n.arguments?.length === 2 && n.arguments[1].getText(sf) === "import.meta.url") {
        if (isLiteralPath(n.arguments[0])) literal++;
        else {
          hits++;
          lines.push(`HIT new URL(non-literal, import.meta.url)\t${site(sf, n)}`);
        }
      }
    });
  }
  if (logPath) {
    const warn = readFileSync(logPath, "utf8").split("\n").filter((l) => /cannot be analyzed|dynamic-import-vars|unable to (analy|resolve) dynamic/i.test(l));

    hits += warn.length;
    warn.forEach((l) => lines.push(`HIT build log\t${l.trim().slice(0, 120)}`));
    lines.push(`info build log lines scanned for analysis warnings: ${readFileSync(logPath, "utf8").split("\n").length}`);
  }
  lines.push(`info literal import()/require()/new URL sites: ${literal}`);
  report("bundle-analyzable-paths", hits, lines);
}

// ---------- bundle-barrel-imports ----------
{
  const lines = [];
  let hits = 0;
  const graphIdOfPkgMember = (pkg, member) =>
    Object.keys(modules).find((id) => pkgOf(id) === pkg && new RegExp(`/${member}\\.m?js$`).test(id));

  // Barrels: >= 2 re-export declarations, or >= 10 `export const X = f(NS.Member, ...)` wrappers of a namespace import.
  const barrels = [];

  for (const file of files) {
    const sf = astOf(file);
    const imports = importsOf(sf);
    const targets = new Map(); // export name -> graph module id
    let reexports = 0;
    let wrappers = 0;

    for (const st of sf.statements) {
      if (ts.isExportDeclaration(st) && st.moduleSpecifier && !st.isTypeOnly) {
        reexports++;
        const spec = st.moduleSpecifier.text;
        const target = resolveImport(file, spec) ?? spec;

        if (st.exportClause && ts.isNamedExports(st.exportClause)) {
          for (const el of st.exportClause.elements) if (!el.isTypeOnly) targets.set(el.name.text, target);
        }
      }
      if (ts.isVariableStatement(st) && st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const d of st.declarationList.declarations) {
          const init = d.initializer;
          const arg = init && ts.isCallExpression(init) ? init.arguments[0] : null;

          if (arg && ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.expression)) {
            const ns = imports.get(arg.expression.text);

            if (ns?.namespace && !ns.file) {
              wrappers++;
              targets.set(d.name.text, graphIdOfPkgMember(ns.spec, arg.name.text) ?? `${ns.spec}:${arg.name.text}`);
            }
          }
        }
      }
    }
    if (reexports >= 2 || wrappers >= 10) barrels.push({ file, targets, kind: wrappers >= 10 ? `${wrappers} wrapper consts` : `${reexports} re-exports` });
  }

  // Who imports which export of each barrel, and is that importer in the first load?
  const importersOf = new Map(barrels.map((b) => [b.file, []]));

  for (const file of files) {
    for (const [, imp] of importsOf(astOf(file))) {
      if (imp.typeOnly || !importersOf.has(imp.file)) continue;
      importersOf.get(imp.file).push({ file, name: imp.imported ?? imp.name, first: importsInFirstLoad(file, imp.file) });
    }
  }
  for (const b of barrels) {
    const users = importersOf.get(b.file);
    const barrelFirst = FL.has(b.file);
    const firstNames = new Set(users.filter((u) => u.first).map((u) => u.name));
    const usedNames = new Set(users.map((u) => u.name));
    const neededTargets = new Set([...b.targets].filter(([name]) => firstNames.has(name)).map(([, t]) => t));
    // A target another first-load module imports directly is needed whatever the barrel does.
    for (const t of b.targets.values()) {
      if ((modules[t]?.importers ?? []).some((i) => i !== b.file && FL.has(i) && !i.includes("/node_modules/"))) neededTargets.add(t);
    }
    const lazyOnly = [...b.targets].filter(([name, t]) => usedNames.has(name) && !neededTargets.has(t));
    const unused = [...b.targets].filter(([name]) => !usedNames.has(name)).map(([n]) => n);
    const lazyTargets = new Set(lazyOnly.map(([, t]) => t));
    const bytes = [...lazyTargets].reduce((a, t) => a + (FL.get(t) ?? 0), 0);
    const flagged = barrelFirst && bytes >= 1000;

    if (flagged) hits++;
    lines.push(
      `${flagged ? "HIT" : "ok "} barrel ${rel(b.file)} (${b.kind}; in first load: ${barrelFirst}; ${users.length} named imports from ${new Set(users.map((u) => u.file)).size} files)` +
        `\texports ${b.targets.size}, used by first-load code ${[...b.targets.keys()].filter((n) => firstNames.has(n)).length}, lazy-only ${lazyOnly.length}, unused ${unused.length}` +
        `\tlazy-only targets rendered in first load: ${bytes} B`,
    );
    if (verbose || flagged) {
      if (lazyOnly.length) lines.push(`    lazy-only: ${lazyOnly.map(([n]) => n).join(" ")}`);
      if (unused.length) lines.push(`    unused: ${unused.join(" ")}`);
    }
  }

  // Third-party entry points: a package imported from its root entry without sideEffects:false.
  const pkgs = new Map();

  for (const file of files) {
    for (const [, imp] of importsOf(astOf(file))) {
      if (imp.file || imp.typeOnly || imp.spec.startsWith(".") || imp.spec.startsWith("@/")) continue;
      const pkg = imp.spec.match(/^((?:@[^/]+\/)?[^/]+)/)[1];

      pkgs.set(pkg, (pkgs.get(pkg) ?? new Set()).add(rel(file)));
    }
  }
  for (const [pkg, users] of [...pkgs].sort((a, b) => b[1].size - a[1].size)) {
    const pj = join(ROOT, "node_modules", pkg, "package.json");
    const sideEffects = existsSync(pj) ? JSON.parse(readFileSync(pj, "utf8")).sideEffects : "n/a";
    const fl = flBytesOfPkg((p) => p === pkg);

    lines.push(`info pkg ${pkg}\tfiles importing ${users.size}\tsideEffects ${JSON.stringify(sideEffects)}\tfirst-load rendered ${fl} B`);
  }

  // The @heroui/react root barrel: every component in the first load needs a first-load user,
  // either a first-load source module importing it by name or another first-load HeroUI component.
  const heroDir = (id) => id.match(/@heroui\/react\/dist\/components\/([^/]+)\//)?.[1];
  const dirs = new Map();

  for (const [id, len] of FL) if (heroDir(id)) dirs.set(heroDir(id), (dirs.get(heroDir(id)) ?? 0) + len);
  const heroNames = new Set();

  for (const file of files) {
    for (const [, imp] of importsOf(astOf(file))) {
      if (imp.spec === "@heroui/react" && !imp.typeOnly && FL.has(file) && (!isRouteFile(file) || (modules[file]?.importedIds ?? []).some((i) => i.includes("/@heroui/react/")))) {
        heroNames.add((imp.imported ?? "").toLowerCase());
      }
    }
  }
  for (const [dir, len] of [...dirs].sort((a, b) => b[1] - a[1])) {
    const direct = heroNames.has(dir.replaceAll("-", ""));
    const internal = [...FL.keys()].some(
      (id) => heroDir(id) === dir && (modules[id]?.importers ?? []).some((i) => FL.has(i) && heroDir(i) && heroDir(i) !== dir),
    );

    if (!direct && !internal) hits++;
    lines.push(`${direct || internal ? "ok " : "HIT"} @heroui/react ${dir} in first load\t${len} B\t${direct ? "imported by first-load source" : internal ? "used by another first-load HeroUI component" : "no first-load user"}`);
  }
  report("bundle-barrel-imports", hits, lines);
}

// ---------- bundle-conditional ----------
{
  const lines = [];
  let hits = 0;
  const shortId = (id) => id.replace(/^.*\/node_modules\//, "nm:").replace(ROOT + "/", "");
  const flImporters = (id) => (modules[id]?.importers ?? []).filter((i) => FL.has(i)).map(shortId);

  // Candidates: third-party packages >= 10 KB and source modules >= 15 KB rendered in the first load.
  // Each one is judged by hand in report.tsv (feature-gated or needed for the first screen).
  const perPkg = new Map();

  for (const [id, len] of FL) if (pkgOf(id)) perPkg.set(pkgOf(id), (perPkg.get(pkgOf(id)) ?? 0) + len);
  const FRAMEWORK = /^(react|react-dom|scheduler|@tanstack\/|react-aria|react-aria-components|react-stately|@react-aria\/|@react-stately\/|@heroui\/|tailwind-variants|@internationalized\/|use-sync-external-store)/;

  for (const [pkg, len] of [...perPkg].sort((a, b) => b[1] - a[1])) {
    if (len < 10000) continue;
    if (FRAMEWORK.test(pkg)) {
      lines.push(`info framework pkg in first load\t${pkg}\t${len} B`);
      continue;
    }
    hits++;
    const entry = [...FL.keys()].filter((id) => pkgOf(id) === pkg);
    const users = [...new Set(entry.flatMap(flImporters).filter((i) => !i.startsWith("nm:")))];

    lines.push(`CANDIDATE pkg\t${pkg}\t${len} B\tfirst-load importers: ${users.join(", ")}`);
  }
  for (const [id, len] of [...FL].sort((a, b) => b[1] - a[1])) {
    if (pkgOf(id) || len < 15000 || !id.startsWith(SRC)) continue;
    hits++;
    lines.push(`CANDIDATE src\t${rel(id)}\t${len} B\tfirst-load importers: ${flImporters(id).join(", ")}`);
  }

  // Locale data the app never shows: react-aria ships strings for every locale; the app has en and de.
  const locale = [...FL].filter(([id]) => /\/intl\/[^/]+\/[a-z]{2}-[A-Z]{2}\.m?js$/.test(id));
  const kept = locale.filter(([id]) => /\/(en-US|de-DE)\.m?js$/.test(id));
  const localeBytes = locale.reduce((a, [, l]) => a + l, 0);

  if (localeBytes - kept.reduce((a, [, l]) => a + l, 0) >= 10000) hits++;
  lines.push(`${localeBytes >= 10000 ? "CANDIDATE" : "info"} locale strings\t${locale.length} modules, ${localeBytes} B rendered; en-US + de-DE ${kept.reduce((a, [, l]) => a + l, 0)} B`);

  // Merchant and partner message namespaces inside the English dictionary every guest downloads.
  const en = join(SRC, "i18n/en.ts");
  const merchantMsgs = (modules[en]?.importedIds ?? []).filter((id) => /\/(merchant|reports|partners\/report)\//.test(id) || /\/reports\/pages-messages/.test(id));
  const mBytes = merchantMsgs.reduce((a, id) => a + (FL.get(id) ?? 0), 0);

  if (mBytes >= 10000) hits++;
  lines.push(`${mBytes >= 10000 ? "CANDIDATE" : "info"} merchant message files imported by i18n/en.ts\t${merchantMsgs.length} files, ${mBytes} B rendered\t${merchantMsgs.map(rel).join(", ")}`);
  report("bundle-conditional", hits, lines);
}

// ---------- bundle-defer-third-party ----------
{
  const lines = [];
  let hits = 0;
  const TELEMETRY = /^(@vercel\/analytics|@vercel\/speed-insights|posthog-js|@sentry\/|@datadog\/|mixpanel|amplitude|@amplitude\/|@segment\/|analytics|react-ga|react-gtm|@hotjar\/|logrocket|@fullstory\/|@bugsnag\/|rollbar|@newrelic\/|plausible|umami|@microsoft\/clarity|heap)/;
  const pj = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

  for (const dep of Object.keys({ ...pj.dependencies })) {
    if (TELEMETRY.test(dep)) {
      hits++;
      lines.push(`HIT telemetry dependency\t${dep}`);
    }
  }
  const CALLS = /\b(gtag|dataLayer|posthog|Sentry|mixpanel|amplitude|plausible|umami|hotjar|clarity|googletagmanager|google-analytics|segment\.(com|io))\b/;

  for (const file of files) {
    readFileSync(file, "utf8").split("\n").forEach((l, i) => {
      if (CALLS.test(l)) {
        hits++;
        lines.push(`HIT telemetry call\t${rel(file)}:${i + 1}\t${l.trim().slice(0, 80)}`);
      }
    });
  }
  const html = readFileSync(join(ROOT, "index.html"), "utf8").replace(/<noscript>[\s\S]*?<\/noscript>/g, "");

  for (const m of html.matchAll(/<script[^>]*\bsrc="(https?:[^"]+)"[^>]*>/g)) {
    hits++;
    lines.push(`HIT external script in index.html\t${m[1]}${/\b(async|defer)\b/.test(m[0]) ? " (async/defer)" : " (blocking)"}`);
  }
  for (const m of html.matchAll(/<link[^>]*>/g)) {
    const tag = m[0];
    const href = tag.match(/href="([^"]+)"/)?.[1] ?? "";

    if (!href.startsWith("http")) continue;
    if (/rel="stylesheet"/.test(tag)) {
      hits++;
      lines.push(`HIT render-blocking external stylesheet\t${href}`);
    } else lines.push(`info external link ${tag.match(/rel="([^"]+)"/)?.[1]}${/onload=/.test(tag) ? " (swapped to stylesheet on load)" : ""}\t${href.slice(0, 90)}`);
  }
  // Third-party library CSS inside the render-blocking first-load stylesheet.
  const distHtml = readFileSync(join(distDir, "index.html"), "utf8");
  const cssFiles = [...distHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\.?\/?([^"]+\.css)"/g)].map((m) => m[1]);
  const css = cssFiles.map((f) => readFileSync(join(distDir, f), "utf8")).join("");
  const LIBCSS = { "maplibre-gl": /\.maplibregl-[\w-]+/g, leaflet: /\.leaflet-[\w-]+/g, "@fullcalendar": /\.fc-[\w-]+/g, "tiptap/prosemirror": /\.ProseMirror[\w-]*/g, recharts: /\.recharts-[\w-]+/g };

  for (const [lib, re] of Object.entries(LIBCSS)) {
    const found = new Set(css.match(re) ?? []);

    if (!found.size) continue;
    // A handful of selectors is app CSS styling the library (e.g. a Tailwind arbitrary variant), not the library sheet.
    const flagged = found.size >= 5;
    const importers = Object.keys(modules).filter((id) => id.includes(`/node_modules/${lib}/`) && id.endsWith(".css"));

    if (flagged) hits++;
    lines.push(
      `${flagged ? "HIT" : "ok "} ${lib} CSS in first-load stylesheet ${cssFiles.join(",")}\t${found.size} selectors (${[...found].slice(0, 3).join(" ")})\tlibrary CSS imported by: ${[...new Set(importers.flatMap((id) => (modules[id]?.importers ?? []).filter((i) => !i.includes("?")).map(rel)))].join(", ") || "-"}`,
    );
  }
  // Media that downloads before the user asks for it.
  for (const file of files) {
    const sf = astOf(file);

    visit(sf, (n) => {
      if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && /^(audio|video)$/.test(n.tagName.getText(sf))) {
        const attrs = n.attributes.getText(sf);
        const preload = attrs.match(/preload="(\w+)"/)?.[1];
        const eager = /\bautoPlay\b/.test(attrs) || preload === "auto" || (!preload && n.tagName.getText(sf) === "video");

        if (eager) hits++;
        lines.push(`${eager ? "HIT" : "ok "} <${n.tagName.getText(sf)}> preload=${preload ?? "(default)"}\t${site(sf, n)}`);
      }
    });
  }
  report("bundle-defer-third-party", hits, lines);
}

// ---------- bundle-dynamic-imports ----------
{
  const lines = [];
  let hits = 0;
  const SPLIT = new Set(["component", "errorComponent", "notFoundComponent"]); // router-plugin defaultCodeSplitGroupings
  const HEAVY = /^(maplibre-gl|leaflet|mapbox-gl|recharts|d3-|@fullcalendar\/|@tiptap\/|prosemirror-|ai$|@ai-sdk\/|zod$|temporal-polyfill|use-stick-to-bottom|qrcode\.react|monaco-editor|@monaco-editor\/|chart\.js|echarts|three)/;
  const isHookModule = (file) => /\/hooks\//.test(file) || /export (function|const) use[A-Z]/.test(readFileSync(file, "utf8"));
  const isComponentModule = (file) => /\/components\//.test(file) || file.endsWith(".tsx");

  // Route files: value imports read by route options that stay in the main bundle.
  for (const file of files.filter((f) => isRouteFile(f) && !f.endsWith("/__root.tsx"))) {
    const sf = astOf(file);
    const imports = importsOf(sf);
    const topDecls = new Map();
    const kept = new Set();

    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && !st.importClause) {
        hits++;
        lines.push(`HIT side-effect import in route file\t${site(sf, st)}\t${st.getText(sf)}`);
      }
      if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) topDecls.set(st.name.text, st);
      if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) topDecls.set(d.name.text, d);
    }
    // Route options outside the split groupings, plus top-level statements that always run.
    visit(sf, (n) => {
      if (ts.isCallExpression(n) && ts.isCallExpression(n.expression) && /^create(Lazy)?FileRoute$/.test(n.expression.expression.getText(sf))) {
        const obj = n.arguments[0];

        if (obj && ts.isObjectLiteralExpression(obj)) {
          for (const p of obj.properties) {
            const key = p.name?.getText(sf);

            if (!SPLIT.has(key)) referencedNames(p).forEach((x) => kept.add(x));
          }
        }
      }
    });
    for (const st of sf.statements) if (ts.isExpressionStatement(st)) referencedNames(st).forEach((x) => kept.add(x));
    // Expand through local declarations the kept code calls.
    const queue = [...kept];

    while (queue.length) {
      const name = queue.pop();
      const decl = topDecls.get(name);

      if (!decl) continue;
      for (const x of referencedNames(decl)) if (!kept.has(x)) kept.add(x), queue.push(x);
    }
    for (const name of kept) {
      const imp = imports.get(name);

      if (!imp || imp.typeOnly || !imp.file) continue;
      const leak = isHookModule(imp.file) || isComponentModule(imp.file);

      if (leak) hits++;
      lines.push(`${leak ? "HIT" : "ok "} route option reads ${name} from ${leak ? (isHookModule(imp.file) ? "hook" : "component") : "plain"} module\t${rel(file)}\t${rel(imp.file)}\tfirst-load: ${FL.has(imp.file)}`);
    }
  }
  // Heavy libraries that reach the first load.
  const perPkg = new Map();

  for (const [id, len] of FL) if (pkgOf(id) && HEAVY.test(pkgOf(id))) perPkg.set(pkgOf(id), (perPkg.get(pkgOf(id)) ?? 0) + len);
  for (const [pkg, len] of perPkg) {
    if (len === 0) continue;
    hits++;
    lines.push(`HIT heavy package in first load\t${pkg}\t${len} B`);
  }
  const lazyHeavy = new Map();

  for (const c of chunks) {
    if (firstChunks.has(c.file)) continue;
    for (const [id, len] of Object.entries(c.modules)) if (pkgOf(id) && HEAVY.test(pkgOf(id))) lazyHeavy.set(pkgOf(id), (lazyHeavy.get(pkgOf(id)) ?? 0) + len);
  }
  lines.push(`info heavy packages only in lazy chunks: ${[...lazyHeavy].filter(([p]) => !perPkg.get(p)).map(([p, l]) => `${p} ${l}`).join(", ")}`);
  report("bundle-dynamic-imports", hits, lines);
}

// ---------- bundle-preload ----------
{
  const lines = [];
  let hits = 0;
  let linkPreloadProps = 0;
  let preloadCalls = 0;

  for (const file of files) {
    const sf = astOf(file);
    const text = sf.getFullText();
    const hasIntentPreload = /on(MouseEnter|PointerEnter|Focus|HoverStart|TouchStart|PressStart)=\{[^}]*(import\(|preload)/.test(text);

    visit(sf, (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "createRouter") {
        const o = n.arguments[0];
        const has = o && ts.isObjectLiteralExpression(o) && o.properties.some((p) => p.name?.getText(sf) === "defaultPreload");

        if (!has) hits++;
        lines.push(`${has ? "ok " : "HIT"} createRouter ${has ? "sets" : "without"} defaultPreload\t${site(sf, n)}`);
      }
      if (ts.isJsxAttribute(n) && n.name.getText(sf) === "preload") {
        const tag = n.parent.parent.tagName?.getText(sf);

        if (tag && !/^(audio|video)$/.test(tag)) linkPreloadProps++;
      }
      if (ts.isCallExpression(n) && /\b(preloadRoute|loadRouteChunk)$/.test(n.expression.getText(sf))) preloadCalls++;
      // Lazy boundaries (React.lazy or a dynamic import inside a component file) with no intent preload in the same file.
      const isLazyCall = (x) => ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === "lazy";
      const isLazy = isLazyCall(n);
      let insideLazy = false;

      for (let p = n.parent; p; p = p.parent) if (isLazyCall(p)) insideLazy = true;
      const isDyn = ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && !insideLazy;

      if ((isLazy || isDyn) && !hasIntentPreload && file.endsWith(".tsx")) {
        hits++;
        lines.push(`HIT ${isLazy ? "lazy()" : "import()"} with no hover/focus preload\t${site(sf, n)}\t${n.getText(sf).replace(/\s+/g, " ").slice(0, 70)}`);
      }
    });
  }
  lines.push(`info <Link preload=...> props: ${linkPreloadProps}; router.preloadRoute/loadRouteChunk calls: ${preloadCalls}`);
  report("bundle-preload", hits, lines);
}

console.log("\nrule\thits");
for (const [rule, hits] of results) console.log(`${rule}\t${hits}`);
