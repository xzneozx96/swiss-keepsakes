#!/usr/bin/env node
// Story traceability: lists every story in the plan with the number of tests that name it.
//
//   node scripts/trace.mjs <plan.md> [--tests <dir>]... [--status <status.json>] [--verbose]
//
// Test titles are matched by [E<n>.<n>] on test() and it() calls under e2e, packages, api, scripts and front-end/tests, skipping
// node_modules and scripts/fixtures. A tag on a describe() title counts for every test() and it() inside that block. A test in a folder with a playwright.config.ts counts once per project in that config,
// so a test that runs in English and German counts 2. Statuses come from status.json beside the plan;
// a missing file makes every story Backlog.
// A spike story has no automated test: its acceptance names a docs/spikes/SP<n>.md proof, and that file existing
// satisfies the check.
// A skip, fixme or todo test is not counted: it is listed as switched-off, and a Verified or Done story with only switched-off
// tests is named in a warning without failing the run.
// Exit 0 ok, 1 when a Verified or Done story has no test, 2 on a malformed story row or unreadable input.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(repoRoot, "scripts", "fixtures");
const TEST_FILE = /\.(?:[cm]?[jt]sx?)$/;
const TEST_CALL = /\b(test|it|describe)((?:\.\w+)*)\(\s*(["'`])((?:\\.|(?!\3).)*)\3/g;
const SWITCHED_OFF = /\.(?:skip|fixme|todo)\b/;
const SPIKE_PROOF = /docs\/spikes\/SP\d+\.md/;
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
    stories.push({ id: cells[0], story: cells[1], acceptance: cells[6] });
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

    if (path === fixtures) continue;

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

function blockEnd(source, from) {
  const open = source.indexOf("{", from);

  if (open === -1) return from;
  for (let i = open, depth = 0; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return i;
  }

  return source.length;
}

export function collectTests(roots, stop = repoRoot) {
  const found = [];

  for (const root of roots) {
    for (const file of walk(root)) {
      const runs = projectCount(file, stop);

      const source = readFileSync(file, "utf8");
      const blocks = [];

      for (const match of source.matchAll(TEST_CALL)) {
        const [, kind, modifiers, , title] = match;
        const enclosing = blocks.filter((b) => match.index < b.end);
        const inherited = enclosing.flatMap((b) => b.ids);
        const off = SWITCHED_OFF.test(modifiers) || enclosing.some((b) => b.off);
        const own = [...title.matchAll(/\[(E\d+\.\d+)\]/g)].map((m) => m[1]);

        if (kind === "describe") {
          blocks.push({ ids: own, off, end: blockEnd(source, match.index + match[0].length) });
          continue;
        }
        for (const id of new Set([...own, ...inherited])) found.push({ id, title, file, runs, off });
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
  const switchedOffOnly = [];

  for (const story of stories) {
    const all = tests.filter((t) => t.id === story.id);
    const mine = all.filter((t) => !t.off);
    const count = mine.reduce((n, t) => n + t.runs, 0);
    const off = all.length - mine.length;
    const status = statuses[story.id] ?? "Backlog";

    const proof = story.acceptance.match(SPIKE_PROOF)?.[0];
    const proofed = proof && existsSync(join(repoRoot, proof));

    lines.push(`${story.id} tests=${count}${off ? ` switched-off=${off}` : ""} status=${status}${proofed ? ` proof=${proof}` : ""}`);
    for (const t of mine) lines.push(`  ${t.title}${t.runs > 1 ? ` (x${t.runs} projects)` : ""}`);
    for (const t of all.filter((t) => t.off)) lines.push(`  switched off: ${t.title}`);
    if (count === 0 && !proofed && (status === "Verified" || status === "Done")) {
      // A story whose only tests are switched off is reported, not failed: its status is the owner's call.
      if (off > 0) switchedOffOnly.push(story.id);
      else missing.push(story.id);
    }
  }
  for (const t of tests) {
    if (!known.has(t.id)) warnings.push(`warning: unknown story ID ${t.id} in test title "${t.title}" (${t.file})`);
  }

  return { stories, lines, warnings, missing, switchedOffOnly };
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
  const testRoots = flag("--tests").length ? flag("--tests").map((p) => resolve(p)) : ["e2e", "packages", "api", "scripts", "front-end/tests"].map((d) => join(repoRoot, d));
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
  if (result.switchedOffOnly.length) {
    console.error(`warning: Verified or Done stories whose only tests are switched off (skip, fixme, todo): ${result.switchedOffOnly.join(", ")}`);
  }
  if (result.missing.length) {
    console.error(`error: Verified or Done stories without a test: ${result.missing.join(", ")}`);
    return 1;
  }

  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
