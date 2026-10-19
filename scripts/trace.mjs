#!/usr/bin/env node
// Story traceability: lists every story in the plan with the number of tests that name it.
//
//   node scripts/trace.mjs <plan.md> [--tests <dir>]... [--status <status.json>] [--verbose]
//
// Test titles are matched by [E<n>.<n>] on test() and it() calls under e2e, packages and api, skipping
// node_modules. A test in a folder with a playwright.config.ts counts once per project in that config,
// so a test that runs in English and German counts 2. Statuses come from status.json beside the plan;
// a missing file makes every story Backlog.
// Exit 0 ok, 1 when a Verified or Done story has no test, 2 on a malformed story row or unreadable input.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_FILE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_CALL = /\b(?:test|it)(?:\.\w+)*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
const STORY_ID = /^E\d+\.\d+$/;

export function parseStories(md) {
  const stories = [];
  let section = "";

  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) section = line.slice(3);
    if (!section.startsWith("4.") || !line.startsWith("| ")) continue;
    const cells = line.replace(/^\|\s*|\s*\|$/g, "").split(/\s*\|\s*/);

    if (!STORY_ID.test(cells[0])) continue;
    if (cells.length !== 7) throw new MalformedRow(line);
    stories.push({ id: cells[0], story: cells[1] });
  }

  return stories;
}

export class MalformedRow extends Error {
  constructor(line) {
    super(`malformed story row (expected 7 columns): ${line}`);
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(dir, entry.name);

    if (entry.isDirectory()) walk(path, out);
    else if (TEST_FILE.test(entry.name)) out.push(path);
  }

  return out;
}

function projectCount(file, stop) {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    const config = join(dir, "playwright.config.ts");

    if (existsSync(config)) {
      const block = readFileSync(config, "utf8").match(/projects:\s*\[([\s\S]*?)\n\s*\],/);
      const names = block ? block[1].match(/name:\s*["']/g) : null;

      return names ? names.length : 1;
    }
    if (dir === stop || dir === dirname(dir)) return 1;
  }
}

export function collectTests(roots, stop = repoRoot) {
  const found = [];

  for (const root of roots) {
    for (const file of walk(root)) {
      const runs = projectCount(file, stop);

      for (const [, , title] of readFileSync(file, "utf8").matchAll(TEST_CALL)) {
        for (const [, id] of title.matchAll(/\[(E\d+\.\d+)\]/g)) found.push({ id, title, file, runs });
      }
    }
  }

  return found;
}

export function trace({ plan, testRoots, statusPath }) {
  const stories = parseStories(readFileSync(plan, "utf8"));
  const statuses = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, "utf8")) : {};
  const tests = collectTests(testRoots);
  const known = new Set(stories.map((s) => s.id));
  const lines = [];
  const warnings = [];
  const missing = [];

  for (const story of stories) {
    const mine = tests.filter((t) => t.id === story.id);
    const count = mine.reduce((n, t) => n + t.runs, 0);
    const status = statuses[story.id] ?? "Backlog";

    lines.push(`${story.id} tests=${count} status=${status}`);
    for (const t of mine) lines.push(`  ${t.title}${t.runs > 1 ? ` (x${t.runs} projects)` : ""}`);
    if (count === 0 && (status === "Verified" || status === "Done")) missing.push(story.id);
  }
  for (const t of tests) {
    if (!known.has(t.id)) warnings.push(`warning: unknown story ID ${t.id} in test title "${t.title}" (${t.file})`);
  }

  return { stories, lines, warnings, missing };
}

function main(argv) {
  const args = argv.slice(2);
  const verbose = args.includes("--verbose");
  const flag = (name) => {
    const values = [];

    args.forEach((a, i) => { if (a === name) values.push(args[i + 1]); });

    return values;
  };
  const flagValues = new Set([...flag("--tests"), ...flag("--status")]);
  const positional = args.filter((a) => !a.startsWith("--") && !flagValues.has(a));

  if (positional.length !== 1) {
    console.error("usage: node scripts/trace.mjs <plan.md> [--tests <dir>]... [--status <status.json>] [--verbose]");
    return 2;
  }
  const plan = resolve(positional[0]);
  const testRoots = flag("--tests").length ? flag("--tests").map((p) => resolve(p)) : ["e2e", "packages", "api"].map((d) => join(repoRoot, d));
  const statusPath = flag("--status")[0] ? resolve(flag("--status")[0]) : join(dirname(plan), "status.json");

  let result;

  try {
    result = trace({ plan, testRoots, statusPath });
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  for (const line of result.lines) if (verbose || !line.startsWith("  ")) console.log(line);
  for (const w of result.warnings) console.error(w);
  if (result.missing.length) {
    console.error(`error: Verified or Done stories without a test: ${result.missing.join(", ")}`);
    return 1;
  }

  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
