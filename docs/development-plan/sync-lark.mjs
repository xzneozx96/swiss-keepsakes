#!/usr/bin/env node
// Pushes the stories in delivery-plan.md to the Lark task list "Swiss Keepsakes", one task per
// story and one section per sprint, then pulls each task's Status back into status.json for
// scripts/trace.mjs. The plan owns the summary, description, Priority and Epic; Lark owns
// Status, comments and assignees, so a sync never overwrites those.
//
// lark.json keeps a "fingerprints" map, one short hash per story of exactly what a patch sends (title,
// description, Priority and Epic). A run patches only the tasks whose hash differs or is missing, and
// records the new hash after each successful write. The first live run after this was added has no
// hashes, so it patches every task once and seeds them. Only a live run saves them.
//
//   node docs/development-plan/sync-lark.mjs --parse     print what the plan parses to, touch nothing
//   node docs/development-plan/sync-lark.mjs --dry-run   print every lark-cli write without running it
//   node docs/development-plan/sync-lark.mjs             create or update the task list
//   node docs/development-plan/sync-lark.mjs --force-all patch every task, changed or not, to repair drift
//
// Retiring tasks: --delete-ids <file> deletes the tasks whose ids are listed (one per line, or a JSON
// array) before the create and update pass, and --delete-only stops after the deletes. A task whose
// Status is In progress, In review, Verified or Done is refused unless --force is given. A task that
// already carries the plan's current title is never deleted, so the list can be run again safely.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const planPath = join(here, "delivery-plan.md");
const statePath = join(here, "lark.json");
const statusPath = join(here, "status.json");

export function parseArgs(argv) {
  const at = argv.indexOf("--delete-ids");
  if (at !== -1 && (!argv[at + 1] || argv[at + 1].startsWith("--"))) throw new Error("--delete-ids needs a file");
  const deleteOnly = argv.includes("--delete-only");
  if (deleteOnly && at === -1) throw new Error("--delete-only needs --delete-ids <file>");
  return {
    mode: argv.includes("--parse") ? "parse" : argv.includes("--dry-run") ? "dry" : "live",
    deleteIds: at === -1 ? undefined : argv[at + 1],
    deleteOnly,
    force: argv.includes("--force"),
    forceAll: argv.includes("--force-all"),
  };
}

const options = parseArgs(process.argv.slice(2));
const mode = options.mode;

const STATUSES = ["Backlog", "Ready", "In progress", "In review", "Verified", "Done", "Blocked"];
const PRIORITIES = ["High", "Medium", "Low"];
const SIDES = ["BE", "FE", "Both", "Ops"];
// Lark limits: an option name holds 50 characters, a section name 100.
const OPTION_LIMIT = 50;
const SECTION_LIMIT = 100;
// A task in one of these states has work or a review on it, so a delete needs --force.
const PROTECTED_STATUSES = ["In progress", "In review", "Verified", "Done"];
export const BLOCKED_PATTERN = /Blocked by [QO]\d+/;

// The blocker text sits in the Story column in some rows and in the Acceptance column in others.
export const initialStatus = (story) => (BLOCKED_PATTERN.test(`${story.story ?? ""}\n${story.acceptance ?? ""}`) ? "Blocked" : "Backlog");

const clip = (text, limit) => {
  const chars = [...text];
  return chars.length > limit ? `${chars.slice(0, limit - 3).join("")}...` : text;
};

export const epicLabel = (epic) => clip(`${epic.id} ${epic.name}`, OPTION_LIMIT);

export const sectionName = (sprint) => clip(`Sprint ${sprint.number}. ${sprint.goal}`, SECTION_LIMIT);

// options maps option name to guid. An option whose epic id matches but whose name differs is renamed.
export function diffEpicOptions(epics, options) {
  const names = Object.keys(options);
  const labels = epics.map(epicLabel);
  const claimed = new Set(labels.filter((label) => names.includes(label)));
  const add = [];
  const rename = [];
  epics.forEach((epic, i) => {
    if (claimed.has(labels[i])) return;
    const old = names.find((name) => name.startsWith(`${epic.id} `) && !claimed.has(name));
    if (old) {
      rename.push({ from: old, to: labels[i] });
      claimed.add(old);
    } else {
      add.push(labels[i]);
    }
  });
  const unused = names.filter((name) => !claimed.has(name) && !rename.some((r) => r.from === name));
  return { add, rename, unused };
}

// stateSections maps sprint number to section guid, larkNames maps section guid to its current name.
export function diffSections(sprints, stateSections, larkNames) {
  return sprints.map((sprint) => {
    const key = String(sprint.number);
    const name = sectionName(sprint);
    const guid = stateSections[key];
    if (!guid) return { key, name, action: "create" };
    if (!larkNames.has(guid)) return { key, name, guid, action: "missing" };
    return { key, name, guid, action: larkNames.get(guid) === name ? "keep" : "rename" };
  });
}

// Accepts a JSON array or one id per line. Blank lines and lines that start with # are skipped.
export function readIds(text) {
  const raw = text.trim().startsWith("[") ? JSON.parse(text) : text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const bad = raw.filter((id) => typeof id !== "string" || !/^E\d+\.\d+$/.test(id));
  if (bad.length) throw new Error(`not story ids: ${bad.join(", ")}`);
  return [...new Set(raw)];
}

// candidates carry { id, guid, status, current }. current is true when the task already has the plan's title.
export function classifyDeletes(candidates, force) {
  const result = { remove: [], skip: [], refused: [] };
  for (const c of candidates) {
    if (c.current) result.skip.push(c);
    else if (!force && PROTECTED_STATUSES.includes(c.status)) result.refused.push(c);
    else result.remove.push(c);
  }
  return result;
}

export function parsePlan(md) {
  const epics = [];
  const stories = [];
  const sprints = [];
  let section = "";

  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) section = line.slice(3);
    const cells = line.startsWith("| ") ? line.replace(/^\|\s*|\s*\|$/g, "").split(/\s*\|\s*/) : null;
    if (!cells) continue;

    if (section.startsWith("3.") && /^E\d\. /.test(cells[0]) && cells.length === 4) {
      const [, id, name] = cells[0].match(/^(E\d)\. (.+)$/);
      epics.push({ id, name });
    }
    if (section.startsWith("4.") && /^E\d+\.\d+$/.test(cells[0])) {
      const [id, story, side, points, priority, depends, acceptance] = cells;
      if (cells.length !== 7 || !SIDES.includes(side) || !/^\d+$/.test(points) || !PRIORITIES.includes(priority)) {
        throw new Error(`malformed story row: ${line}`);
      }
      stories.push({ id, story, side, priority, depends, acceptance, epic: id.split(".")[0] });
    }
    if (section.startsWith("5.") && /^\d+$/.test(cells[0]) && cells.length === 3) {
      sprints.push({ number: Number(cells[0]), goal: cells[1], storyIds: expandIds(cells[2]) });
    }
  }

  const sprintOf = new Map(sprints.flatMap((s) => s.storyIds.map((id) => [id, s.number])));
  for (const story of stories) story.sprint = sprintOf.get(story.id);
  const unplanned = stories.filter((s) => s.sprint === undefined).map((s) => s.id);
  if (unplanned.length) throw new Error(`stories missing from the sprint map: ${unplanned.join(", ")}`);

  return { epics, stories, sprints };
}

function expandIds(cell) {
  return cell.split(", ").flatMap((part) => {
    const range = part.match(/^E(\d+)\.(\d+) to E\1\.(\d+)$/);
    if (!range) return [part];
    const [, epic, from, to] = range.map(Number);
    return Array.from({ length: to - from + 1 }, (_, i) => `E${epic}.${from + i}`);
  });
}

function task(args, { write = false } = {}) {
  const full = ["task", ...args, "--as", "user"];
  if (write && mode === "dry") {
    console.log(`lark-cli ${full.map((a) => (/[\s"{]/.test(a) ? `'${a}'` : a)).join(" ")}`);
    return {};
  }
  const out = execFileSync("lark-cli", [...full, "--format", "json"], { encoding: "utf8", maxBuffer: 64 << 20 });
  return JSON.parse(out).data;
}

function loadState() {
  return existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { fields: {}, sections: {} };
}

function save(state) {
  if (mode === "live") writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function ensureList(plan, state) {
  if (!state.tasklist) {
    const res = task(["tasklists", "create", "--data", JSON.stringify({ name: "Swiss Keepsakes" })], { write: true });
    state.tasklist = res.tasklist?.guid ?? "<tasklist>";
    state.url = res.tasklist?.url;
    save(state);
  }

  const wantedFields = { Status: STATUSES, Priority: PRIORITIES };
  for (const [name, options] of Object.entries(wantedFields)) createField(state, name, options);
  if (state.fields.Epic) syncEpicOptions(plan, state);
  else createField(state, "Epic", plan.epics.map(epicLabel));

  syncSections(plan, state);
}

function createField(state, name, options) {
  if (state.fields[name]) return;
  const res = task(["custom_fields", "create", "--data", JSON.stringify({
    name, type: "single_select", resource_type: "tasklist", resource_id: state.tasklist,
    single_select_setting: { options: options.map((o) => ({ name: o })) },
  })], { write: true });
  const field = res.custom_field ?? { guid: `<${name}>`, single_select_setting: { options: options.map((o) => ({ name: o, guid: `<${o}>` })) } };
  state.fields[name] = { guid: field.guid, options: Object.fromEntries(field.single_select_setting.options.map((o) => [o.name, o.guid])) };
  save(state);
}

function syncEpicOptions(plan, state) {
  const field = state.fields.Epic;
  const { add, rename, unused } = diffEpicOptions(plan.epics, field.options);

  for (const { from, to } of rename) {
    const guid = field.options[from];
    task(["custom_field_options", "patch", "--params", JSON.stringify({ custom_field_guid: field.guid, option_guid: guid }), "--data", JSON.stringify({
      option: { name: to }, update_fields: ["name"],
    })], { write: true });
    delete field.options[from];
    field.options[to] = guid;
    save(state);
  }
  for (const name of add) {
    const res = task(["custom_field_options", "create", "--params", JSON.stringify({ custom_field_guid: field.guid }), "--data", JSON.stringify({ name })], { write: true });
    field.options[name] = res.option?.guid ?? `<option ${name}>`;
    save(state);
  }
  if (unused.length) console.warn(`Epic options in Lark but not in the plan, left alone: ${unused.join("; ")}`);
  console.log(`epic options: ${add.length} added, ${rename.length} renamed, ${unused.length} unused`);
}

function sectionNames(state) {
  const names = new Map();
  if (state.tasklist === "<tasklist>") return names;
  let pageToken;
  do {
    const params = { resource_type: "tasklist", resource_id: state.tasklist, page_size: 50, ...(pageToken ? { page_token: pageToken } : {}) };
    const res = task(["sections", "list", "--params", JSON.stringify(params)]);
    for (const item of res.items ?? []) names.set(item.guid, item.name);
    pageToken = res.has_more ? res.page_token : undefined;
  } while (pageToken);
  return names;
}

function syncSections(plan, state) {
  const steps = diffSections(plan.sprints, state.sections, sectionNames(state));
  const counts = { create: 0, rename: 0 };
  let previous;
  for (const step of steps) {
    if (step.action === "create") {
      const res = task(["sections", "create", "--data", JSON.stringify({
        name: step.name, resource_type: "tasklist", resource_id: state.tasklist, ...(previous ? { insert_after: previous } : {}),
      })], { write: true });
      state.sections[step.key] = res.section?.guid ?? `<section ${step.key}>`;
      save(state);
      counts.create++;
    } else if (step.action === "rename") {
      task(["sections", "patch", "--params", JSON.stringify({ section_guid: step.guid }), "--data", JSON.stringify({
        section: { name: step.name }, update_fields: ["name"],
      })], { write: true });
      counts.rename++;
    } else if (step.action === "missing") {
      console.warn(`section for sprint ${step.key} is in lark.json but not in Lark, left alone: ${step.guid}`);
    }
    previous = state.sections[step.key];
  }
  console.log(`sections: ${counts.create} created, ${counts.rename} renamed`);
}

function listTasks(state) {
  if (state.tasklist === "<tasklist>") return [];
  const items = [];
  let pageToken;
  do {
    const params = { tasklist_guid: state.tasklist, page_size: 100, ...(pageToken ? { page_token: pageToken } : {}) };
    const res = task(["tasklists", "tasks", "--params", JSON.stringify(params)]);
    for (const item of res.items ?? []) items.push({ id: item.summary?.match(/^(E\d+\.\d+) /)?.[1], guid: item.guid, summary: item.summary });
    pageToken = res.has_more ? res.page_token : undefined;
  } while (pageToken);
  return items;
}

// gone holds the guids of tasks this run deletes, so a dry run plans creates where a live run would.
function existingTasks(state, gone = new Set()) {
  const found = new Map();
  for (const { id, guid } of listTasks(state)) if (id && !gone.has(guid)) found.set(id, guid);
  return found;
}

function statusOf(state, guid) {
  const res = task(["tasks", "get", "--params", JSON.stringify({ task_guid: guid })]);
  const value = res.task?.custom_fields?.find((f) => f.guid === state.fields.Status.guid)?.single_select_value;
  return Object.entries(state.fields.Status.options).find(([, optionGuid]) => optionGuid === value)?.[0] ?? "Backlog";
}

function deleteRetired(plan, state, ids, force) {
  const wanted = new Set(ids);
  const currentTitle = new Map(plan.stories.map((s) => [s.id, title(s)]));
  const candidates = listTasks(state)
    .filter((t) => wanted.has(t.id))
    .map((t) => ({ ...t, status: statusOf(state, t.guid), current: currentTitle.get(t.id) === t.summary }));
  const { remove, skip, refused } = classifyDeletes(candidates, force);

  if (refused.length) {
    throw new Error(`refusing to delete, nothing was deleted. Use --force to override:\n${refused.map((t) => `  ${t.id} is ${t.status}`).join("\n")}`);
  }
  for (const t of remove) task(["tasks", "delete", "--params", JSON.stringify({ task_guid: t.guid }), "--yes"], { write: true });

  const found = new Set(candidates.map((t) => t.id));
  const missing = ids.filter((id) => !found.has(id));
  if (skip.length) console.log(`skipped, already the new task: ${skip.map((t) => t.id).join(", ")}`);
  if (missing.length) console.log(`not in Lark: ${missing.length} (${missing.join(", ")})`);
  console.log(`deletes: ${remove.length}`);
  return new Set(remove.map((t) => t.guid));
}

export function describe(story) {
  return [
    story.story,
    "",
    `Side: ${story.side}`,
    `Depends on: ${story.depends || "nothing"}`,
    "",
    "Acceptance and proof",
    story.acceptance,
    "",
    "Source: docs/development-plan/delivery-plan.md",
  ].join("\n");
}

export function title(story) {
  const short = story.story.length > 120 ? `${story.story.slice(0, 117)}...` : story.story;
  return `${story.id} ${short}`;
}

export const select = (state, field, option) => {
  const value = state.fields[field].options[option];
  if (!value) throw new Error(`no ${field} option named "${option}"`);
  return { guid: state.fields[field].guid, single_select_value: value };
};

function clientToken(id) {
  const h = createHash("sha256").update(`swiss-keepsakes:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// Hashes what a patch sends, so a story whose plan row did not change can be skipped.
export function fingerprint(story, owned) {
  const sent = JSON.stringify([title(story), describe(story), owned.map((f) => [f.guid, f.single_select_value])]);
  return createHash("sha256").update(sent).digest("hex").slice(0, 16);
}

export const needsPatch = (stored, current, forceAll) => forceAll || stored !== current;

export function syncTasks(plan, state, gone, { have = existingTasks(state, gone), run = task, persist = save, forceAll = options.forceAll } = {}) {
  const labelOf = new Map(plan.epics.map((e) => [e.id, epicLabel(e)]));
  state.fingerprints ??= {};
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const story of plan.stories) {
    const owned = [select(state, "Priority", story.priority), select(state, "Epic", labelOf.get(story.epic))];
    const print = fingerprint(story, owned);
    const guid = have.get(story.id);
    if (guid && !needsPatch(state.fingerprints[story.id], print, forceAll)) {
      unchanged++;
      continue;
    }
    if (!guid) {
      run(["tasks", "create", "--data", JSON.stringify({
        summary: title(story),
        description: describe(story),
        client_token: clientToken(story.id),
        tasklists: [{ tasklist_guid: state.tasklist, section_guid: state.sections[String(story.sprint)] }],
        custom_fields: [...owned, select(state, "Status", initialStatus(story))],
      })], { write: true });
      created++;
    } else {
      run(["tasks", "patch", "--params", JSON.stringify({ task_guid: guid }), "--data", JSON.stringify({
        update_fields: ["summary", "description", "custom_fields"],
        task: { summary: title(story), description: describe(story), custom_fields: owned },
      })], { write: true });
      updated++;
    }
    state.fingerprints[story.id] = print;
    persist(state);
  }

  const orphans = [...have.keys()].filter((id) => !plan.stories.some((s) => s.id === id));
  if (orphans.length) console.warn(`in Lark but not in the plan, left alone: ${orphans.join(", ")}`);
  console.log(`tasks: ${created} created, ${updated} updated, ${unchanged} unchanged`);
  return { created, updated, unchanged };
}

function pullStatus(state) {
  const status = {};
  for (const [id, guid] of existingTasks(state)) status[id] = statusOf(state, guid);
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  console.log(`status.json: ${Object.keys(status).length} stories`);
}

function main() {
  const plan = parsePlan(readFileSync(planPath, "utf8"));
  if (mode === "parse") {
    console.log(`${plan.epics.length} epics, ${plan.sprints.length} sprints, ${plan.stories.length} stories`);
    for (const p of PRIORITIES) console.log(`${p}: ${plan.stories.filter((s) => s.priority === p).length}`);
    return;
  }
  const state = loadState();
  let gone = new Set();
  if (options.deleteIds) {
    gone = deleteRetired(plan, state, readIds(readFileSync(options.deleteIds, "utf8")), options.force);
    if (options.deleteOnly) return;
  }
  ensureList(plan, state);
  syncTasks(plan, state, gone);
  if (mode === "live") pullStatus(state);
  if (state.url) console.log(state.url);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
