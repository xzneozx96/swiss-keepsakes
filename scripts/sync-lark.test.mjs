import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BLOCKED_PATTERN, classifyDeletes, diffEpicOptions, diffSections, fingerprint, initialStatus, needsPatch, parseArgs, parsePlan, readIds,
  sectionName, select, syncTasks,
} from "../docs/development-plan/sync-lark.mjs";

const plans = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "development-plan");
const plan = parsePlan(readFileSync(join(plans, "delivery-plan.md"), "utf8"));

test("parsePlan reads 10 epics, 21 sprints and every story row of the plan", () => {
  const rows = readFileSync(join(plans, "delivery-plan.md"), "utf8").split("\n").filter((l) => /^\| E\d+\.\d+ \|/.test(l));

  assert.equal(plan.epics.length, 10);
  assert.equal(plan.sprints.length, 21);
  assert.equal(plan.stories.length, rows.length);
  assert.deepEqual(plan.epics.map((e) => e.id), ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"]);
  assert.ok(plan.stories.every((s) => Number.isInteger(s.sprint)));
});

test("parsePlan expands a story range in the sprint map", () => {
  assert.deepEqual(plan.sprints[0].storyIds, Array.from({ length: 9 }, (_, i) => `E0.${i + 1}`));
});

test("a Blocked by O or Q reference starts a story as Blocked, and nothing else does", () => {
  assert.ok(BLOCKED_PATTERN.test("Blocked by O23 for the copy"));
  assert.ok(BLOCKED_PATTERN.test("Blocked by Q7"));
  assert.ok(!BLOCKED_PATTERN.test("Blocked by the lawyer"));
  assert.equal(initialStatus({ acceptance: "Blocked by O22." }), "Blocked");
  assert.equal(initialStatus({ acceptance: "Works on staging." }), "Backlog");
});

test("a blocker named in the Story column blocks the story, as in the real row E2.9", () => {
  const e29 = plan.stories.find((s) => s.id === "E2.9");

  assert.ok(/Blocked by [QO]\d+/.test(e29.story));
  assert.equal(initialStatus(e29), "Blocked");
  assert.equal(initialStatus({ story: "Blocked by O23.", acceptance: "Works." }), "Blocked");
});

test("readIds reads one id per line and skips blank lines and comments", () => {
  assert.deepEqual(readIds("E3.1\n\n # note\n E3.2 \nE3.1\n"), ["E3.1", "E3.2"]);
});

test("readIds reads a JSON array", () => {
  assert.deepEqual(readIds('["E4.1", "E4.2"]'), ["E4.1", "E4.2"]);
});

test("readIds rejects anything that is not a story id", () => {
  assert.throws(() => readIds("E3.1\nnonsense"), /not story ids: nonsense/);
  assert.throws(() => readIds("[1]"), /not story ids: 1/);
});

test("the retired list holds the 43 old E3 to E7 ids and no E0 to E2 id", () => {
  const ids = readIds(readFileSync(join(plans, "retired-ids.txt"), "utf8"));

  assert.equal(ids.length, 43);
  assert.ok(ids.every((id) => /^E[3-7]\./.test(id)));
});

test("diffEpicOptions keeps a matching option, renames one with the same epic id, and adds the rest", () => {
  const epics = [
    { id: "E1", name: "Same" }, { id: "E3", name: "New name" }, { id: "E10", name: "Ten" }, { id: "E8", name: "Fresh" },
  ];
  const options = { "E1 Same": "a", "E3 Old name": "b", "E1 Stray": "c", "E7 Gone": "d" };

  assert.deepEqual(diffEpicOptions(epics, options), {
    add: ["E10 Ten", "E8 Fresh"],
    rename: [{ from: "E3 Old name", to: "E3 New name" }],
    unused: ["E1 Stray", "E7 Gone"],
  });
});

test("diffEpicOptions does not take E1 for the owner of an E10 option", () => {
  const diff = diffEpicOptions([{ id: "E1", name: "One" }], { "E10 Ten": "x" });

  assert.deepEqual(diff, { add: ["E1 One"], rename: [], unused: ["E10 Ten"] });
});

test("diffEpicOptions has nothing to do once the options match the plan", () => {
  const options = Object.fromEntries(plan.epics.map((e) => [`${e.id} ${e.name}`, e.id]));

  assert.deepEqual(diffEpicOptions(plan.epics, options), { add: [], rename: [], unused: [] });
});

test("diffSections creates, renames, keeps and flags a section that Lark lost", () => {
  const sprints = [0, 1, 2, 3].map((number) => ({ number, goal: `Goal ${number}` }));
  const state = { 0: "g0", 1: "g1", 3: "g3" };
  const lark = new Map([["g0", "Sprint 0. Goal 0"], ["g1", "Sprint 1. Old goal"]]);

  assert.deepEqual(diffSections(sprints, state, lark).map(({ key, action }) => [key, action]), [
    ["0", "keep"], ["1", "rename"], ["2", "create"], ["3", "missing"],
  ]);
});

test("sectionName clips a long goal to the 100 characters Lark allows", () => {
  const name = sectionName({ number: 16, goal: "x".repeat(200) });

  assert.equal([...name].length, 100);
  assert.ok(name.endsWith("..."));
  assert.equal(sectionName({ number: 20, goal: "Going live" }), "Sprint 20. Going live");
});

test("classifyDeletes refuses active work unless forced, and skips a task that is already the new one", () => {
  const tasks = [
    { id: "E3.1", status: "Backlog" },
    { id: "E3.2", status: "Blocked" },
    { id: "E3.3", status: "In progress" },
    { id: "E3.4", status: "Done" },
    { id: "E3.5", status: "Backlog", current: true },
  ];
  const ids = (list) => list.map((t) => t.id);

  const strict = classifyDeletes(tasks, false);
  assert.deepEqual(ids(strict.remove), ["E3.1", "E3.2"]);
  assert.deepEqual(ids(strict.refused), ["E3.3", "E3.4"]);
  assert.deepEqual(ids(strict.skip), ["E3.5"]);

  const forced = classifyDeletes(tasks, true);
  assert.deepEqual(ids(forced.remove), ["E3.1", "E3.2", "E3.3", "E3.4"]);
  assert.deepEqual(forced.refused, []);
});

test("parseArgs reads the mode, the delete file and the flags", () => {
  assert.deepEqual(parseArgs(["--dry-run", "--delete-ids", "ids.txt", "--delete-only", "--force"]), {
    mode: "dry", deleteIds: "ids.txt", deleteOnly: true, force: true, forceAll: false,
  });
  assert.deepEqual(parseArgs([]), { mode: "live", deleteIds: undefined, deleteOnly: false, force: false, forceAll: false });
  assert.equal(parseArgs(["--parse"]).mode, "parse");
});

test("--force-all is its own flag and does not turn on the delete --force", () => {
  assert.deepEqual([parseArgs(["--force-all"]).forceAll, parseArgs(["--force-all"]).force], [true, false]);
  assert.deepEqual([parseArgs(["--force"]).forceAll, parseArgs(["--force"]).force], [false, true]);
});

const lark = {
  tasklist: "tl",
  sections: { 1: "s1" },
  fields: {
    Priority: { guid: "pf", options: { High: "p-high", Medium: "p-med", Low: "p-low" } },
    Epic: { guid: "ef", options: { "E1 One": "e-one" } },
    Status: { guid: "sf", options: { Backlog: "s-backlog", Blocked: "s-blocked" } },
  },
};
const miniPlan = {
  epics: [{ id: "E1", name: "One" }],
  stories: ["E1.1", "E1.2"].map((id) => ({
    id, story: `Story ${id}`, side: "FE", priority: "High", depends: "", acceptance: "Works.", epic: "E1", sprint: 1,
  })),
};
const ownedOf = (story) => [select(lark, "Priority", story.priority), select(lark, "Epic", "E1 One")];
const printOf = (story) => fingerprint(story, ownedOf(story));

function runSync({ fingerprints, have, forceAll = false, stories = miniPlan.stories }) {
  const calls = [];
  const state = { ...lark, fingerprints };
  const run = (args) => {
    calls.push(args.slice(0, 2).join(" "));
    return {};
  };
  const result = syncTasks({ ...miniPlan, stories }, state, new Set(), { have: new Map(have), run, persist: () => {}, forceAll });
  return { calls, state, result };
}

test("fingerprint is 16 hex characters and follows the title, description and owned field values", () => {
  const story = miniPlan.stories[0];
  const print = printOf(story);

  assert.match(print, /^[0-9a-f]{16}$/);
  assert.equal(print, printOf({ ...story }));
  assert.notEqual(print, printOf({ ...story, story: "Another title" }));
  assert.notEqual(print, printOf({ ...story, acceptance: "Different proof." }));
  assert.notEqual(print, printOf({ ...story, side: "BE" }));
  assert.notEqual(print, fingerprint(story, [select(lark, "Priority", "Low"), select(lark, "Epic", "E1 One")]));
});

test("needsPatch is false only when the stored fingerprint matches and no force is given", () => {
  assert.equal(needsPatch("abc", "abc", false), false);
  assert.equal(needsPatch("abc", "def", false), true);
  assert.equal(needsPatch(undefined, "abc", false), true);
  assert.equal(needsPatch("abc", "abc", true), true);
});

test("syncTasks patches nothing when every fingerprint matches", () => {
  const fingerprints = Object.fromEntries(miniPlan.stories.map((s) => [s.id, printOf(s)]));
  const { calls, result } = runSync({ fingerprints, have: [["E1.1", "g1"], ["E1.2", "g2"]] });

  assert.deepEqual(calls, []);
  assert.deepEqual(result, { created: 0, updated: 0, unchanged: 2 });
});

test("syncTasks patches only the story whose description changed, and records its new fingerprint", () => {
  const fingerprints = Object.fromEntries(miniPlan.stories.map((s) => [s.id, printOf(s)]));
  const changed = [miniPlan.stories[0], { ...miniPlan.stories[1], acceptance: "Now with proof." }];
  const { calls, state, result } = runSync({ fingerprints, have: [["E1.1", "g1"], ["E1.2", "g2"]], stories: changed });

  assert.deepEqual(calls, ["tasks patch"]);
  assert.deepEqual(result, { created: 0, updated: 1, unchanged: 1 });
  assert.equal(state.fingerprints["E1.1"], printOf(miniPlan.stories[0]));
  assert.equal(state.fingerprints["E1.2"], printOf(changed[1]));
});

test("syncTasks patches a task with no stored fingerprint, also when lark.json has no fingerprints key", () => {
  const { calls, state, result } = runSync({ fingerprints: undefined, have: [["E1.1", "g1"], ["E1.2", "g2"]] });

  assert.deepEqual(calls, ["tasks patch", "tasks patch"]);
  assert.deepEqual(result, { created: 0, updated: 2, unchanged: 0 });
  assert.deepEqual(state.fingerprints, { "E1.1": printOf(miniPlan.stories[0]), "E1.2": printOf(miniPlan.stories[1]) });
});

test("syncTasks with forceAll patches every task even when nothing changed", () => {
  const fingerprints = Object.fromEntries(miniPlan.stories.map((s) => [s.id, printOf(s)]));
  const { calls, result } = runSync({ fingerprints, have: [["E1.1", "g1"], ["E1.2", "g2"]], forceAll: true });

  assert.deepEqual(calls, ["tasks patch", "tasks patch"]);
  assert.deepEqual(result, { created: 0, updated: 2, unchanged: 0 });
});

test("syncTasks creates a story that is not in Lark and records its fingerprint", () => {
  const { calls, state, result } = runSync({ fingerprints: {}, have: [["E1.1", "g1"]] });

  assert.deepEqual(calls, ["tasks patch", "tasks create"]);
  assert.deepEqual(result, { created: 1, updated: 1, unchanged: 0 });
  assert.equal(state.fingerprints["E1.2"], printOf(miniPlan.stories[1]));
});

test("a failed write leaves no fingerprint, so the next run tries that task again", () => {
  const state = { ...lark, fingerprints: {} };
  const run = () => {
    throw new Error("lark-cli failed");
  };

  assert.throws(() => syncTasks(miniPlan, state, new Set(), { have: new Map([["E1.1", "g1"]]), run, persist: () => {} }), /lark-cli failed/);
  assert.deepEqual(state.fingerprints, {});
});

test("parseArgs rejects a delete option without its file", () => {
  assert.throws(() => parseArgs(["--delete-ids"]), /needs a file/);
  assert.throws(() => parseArgs(["--delete-ids", "--dry-run"]), /needs a file/);
  assert.throws(() => parseArgs(["--delete-only"]), /needs --delete-ids/);
});
