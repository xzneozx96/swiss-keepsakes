import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "trace.mjs");
const fixture = join(here, "fixtures", "trace");
const scratch = mkdtempSync(join(tmpdir(), "trace-"));

after(() => rmSync(scratch, { recursive: true, force: true }));

const run = (args, cwd = here) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });

function workspace(name, { plan, status, tests }) {
  const dir = join(scratch, name);

  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "plan.md"), plan);
  if (status) writeFileSync(join(dir, "status.json"), JSON.stringify(status));
  for (const [file, body] of Object.entries(tests ?? {})) writeFileSync(join(dir, "tests", file), body);

  return { plan: join(dir, "plan.md"), tests: join(dir, "tests") };
}

const header = "## 4. Backlog\n\n| ID | Story | Side | Pts | Priority | Depends | Acceptance |\n|---|---|---|---|---|---|---|\n";
const testCall = (title) => `test(${JSON.stringify(title)}, () => {});\n`;
const row = (id) => `| ${id} | A story | FE | 1 | High | | Proof |\n`;

test("[E0.9] a plan whose Verified stories all have tests exits 0 and prints one line per story", () => {
  const w = workspace("pass", {
    plan: header + row("E0.1") + row("E0.2"),
    status: { "E0.1": "Verified" },
    tests: { "a.spec.ts": testCall("[E0.1] works") + testCall("[E0.1] also works") },
  });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), ["E0.1 tests=2 status=Verified", "E0.2 tests=0 status=Backlog"]);
});

test("[E0.9] a Verified story with no test exits 1 and names the story", () => {
  const result = run([join(fixture, "plan.md"), "--tests", join(fixture, "tests")]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /^E0\.1 tests=1 status=Verified$/m);
  assert.match(result.stdout, /^E0\.3 tests=0 status=Backlog$/m);
  assert.match(result.stderr, /without a test: E0\.2\b/);
  assert.doesNotMatch(result.stderr, /E0\.3/);
});

test("[E0.9] a Done story with no test also exits 1", () => {
  const w = workspace("done", { plan: header + row("E0.1"), status: { "E0.1": "Done" } });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /E0\.1/);
});

test("[E0.9] an unknown story ID in a test title warns and does not fail", () => {
  const w = workspace("unknown", { plan: header + row("E0.1"), tests: { "a.spec.ts": testCall("[E9.9] stray") } });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /warning: unknown story ID E9\.9/);
});

test("[E0.9] a malformed table row exits 2 and quotes the row", () => {
  const bad = "| E0.1 | Missing columns | FE | 1 |";
  const w = workspace("malformed", { plan: `${header}${bad}\n` });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes(bad), result.stderr);
});

test("[E0.9] a missing status.json makes every story Backlog", () => {
  const w = workspace("nostatus", { plan: header + row("E0.1") });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "E0.1 tests=0 status=Backlog");
});

test("[E0.9] the output is the same from a subdirectory", () => {
  const plan = resolve(here, "..", "docs", "development-plan", "delivery-plan.md");
  const fromRoot = run([plan], resolve(here, ".."));
  const fromSub = run([plan], resolve(here, "fixtures", "trace"));

  assert.equal(fromSub.status, fromRoot.status);
  assert.equal(fromSub.stdout, fromRoot.stdout);
});

test("[E0.9] a test inside a Playwright project folder counts once per project", () => {
  const w = workspace("projects", {
    plan: header + row("E0.1"),
    tests: { "a.spec.ts": testCall("[E0.1] runs twice") },
  });
  writeFileSync(join(w.tests, "playwright.config.ts"), 'export default { projects: [\n  { name: "a" },\n  { name: "b" },\n],\n};\n');
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.stdout.trim(), "E0.1 tests=2 status=Backlog");
});

test("[E0.9] fixture test titles do not count toward the real plan", () => {
  const plan = resolve(here, "..", "docs", "development-plan", "delivery-plan.md");
  const real = run([plan]);
  const own = (readFileSync(script.replace("trace.mjs", "trace.test.mjs"), "utf8").match(/^test\("\[E0\.9\]/gm) ?? []).length;

  assert.equal(real.status, 0, real.stderr);
  assert.match(real.stdout, new RegExp(`^E0\\.9 tests=${own} `, "m"));
  assert.match(real.stdout, /^E0\.1 tests=0 /m);
  assert.doesNotMatch(real.stderr, /unknown story ID/);
});

test("[E0.9] a tag on describe() counts for each test inside it and not for the next block", () => {
  const w = workspace("describe", {
    plan: header + row("E0.1") + row("E0.2"),
    tests: {
      "a.test.ts": `describe('[${"E0.1"}] group', () => {\n  it('one', () => { const x = { a: 1 } })\n  it('two', () => {})\n})\ndescribe('plain', () => {\n  it('three', () => {})\n  it('[${"E0.2"}] four', () => {})\n})\n`,
    },
  });
  const result = run([w.plan, "--tests", w.tests]);

  assert.deepEqual(result.stdout.trim().split("\n"), ["E0.1 tests=2 status=Backlog", "E0.2 tests=1 status=Backlog"]);
});

test("[E0.9] a Done spike whose proof document exists passes without a test", () => {
  const w = workspace("spike", {
    plan: `${header}| E0.1 | A spike | BE | 1 | High | | Proof is \`docs/spikes/SP1.md\` |\n`,
    status: { "E0.1": "Done" },
  });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "E0.1 tests=0 status=Done proof=docs/spikes/SP1.md");
});

const offCall = (modifier, title) => `test.${modifier}(${JSON.stringify(title)}, () => {});\n`;

test("[E0.9] skip, fixme and todo tests are listed as switched off and not counted", () => {
  const w = workspace("off", {
    plan: header + row("E0.1") + row("E0.2"),
    status: { "E0.1": "Done", "E0.2": "Done" },
    tests: {
      "a.spec.ts": testCall("[E0.1] runs") + offCall("fixme", "[E0.1] off") + offCall("skip", "[E0.2] off") + `describe.${"skip"}(${JSON.stringify("[E0.2] block")}, () => { test("inside", () => {}); });\n`,
    },
  });
  const result = run([w.plan, "--tests", w.tests]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /E0\.1 tests=1 switched-off=1 status=Done/);
  assert.match(result.stdout, /E0\.2 tests=0 switched-off=2 status=Done/);
  assert.match(result.stderr, /only tests are switched off.*E0\.2/);
});
