#!/usr/bin/env node
// Pushes the stories in delivery-plan.md to the Lark task list "Swiss Keepsakes", one task per
// story and one section per sprint, then pulls each task's Status back into status.json for
// scripts/trace.mjs. The plan owns the summary, description, Priority and Epic; Lark owns
// Status, comments and assignees, so a sync never overwrites those.
//
//   node docs/plan/sync-lark.mjs --parse     print what the plan parses to, touch nothing
//   node docs/plan/sync-lark.mjs --dry-run   print every lark-cli write without running it
//   node docs/plan/sync-lark.mjs             create or update the task list
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const planPath = join(here, "delivery-plan.md");
const statePath = join(here, "lark.json");
const statusPath = join(here, "status.json");
const mode = process.argv.includes("--parse") ? "parse" : process.argv.includes("--dry-run") ? "dry" : "live";

const STATUSES = ["Backlog", "Ready", "In progress", "In review", "Verified", "Done", "Blocked"];
const PRIORITIES = ["High", "Medium", "Low"];
const SIDES = ["BE", "FE", "Both", "Ops"];

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

  const wantedFields = {
    Status: STATUSES,
    Priority: PRIORITIES,
    Epic: plan.epics.map((e) => `${e.id} ${e.name}`),
  };
  for (const [name, options] of Object.entries(wantedFields)) {
    if (state.fields[name]) continue;
    const res = task(["custom_fields", "create", "--data", JSON.stringify({
      name, type: "single_select", resource_type: "tasklist", resource_id: state.tasklist,
      single_select_setting: { options: options.map((o) => ({ name: o })) },
    })], { write: true });
    const field = res.custom_field ?? { guid: `<${name}>`, single_select_setting: { options: options.map((o) => ({ name: o, guid: `<${o}>` })) } };
    state.fields[name] = { guid: field.guid, options: Object.fromEntries(field.single_select_setting.options.map((o) => [o.name, o.guid])) };
    save(state);
  }

  let previous;
  for (const sprint of plan.sprints) {
    const name = `Sprint ${sprint.number}. ${sprint.goal}`;
    const key = String(sprint.number);
    if (!state.sections[key]) {
      const res = task(["sections", "create", "--data", JSON.stringify({
        name, resource_type: "tasklist", resource_id: state.tasklist, ...(previous ? { insert_after: previous } : {}),
      })], { write: true });
      state.sections[key] = res.section?.guid ?? `<section ${key}>`;
      save(state);
    }
    previous = state.sections[key];
  }
}

function existingTasks(state) {
  if (mode === "dry" && state.tasklist === "<tasklist>") return new Map();
  const found = new Map();
  let pageToken;
  do {
    const params = { tasklist_guid: state.tasklist, page_size: 100, ...(pageToken ? { page_token: pageToken } : {}) };
    const res = task(["tasklists", "tasks", "--params", JSON.stringify(params)]);
    for (const item of res.items ?? []) {
      const id = item.summary?.match(/^(E\d+\.\d+) /)?.[1];
      if (id) found.set(id, item.guid);
    }
    pageToken = res.has_more ? res.page_token : undefined;
  } while (pageToken);
  return found;
}

function describe(story) {
  return [
    story.story,
    "",
    `Side: ${story.side}`,
    `Depends on: ${story.depends || "nothing"}`,
    "",
    "Acceptance and proof",
    story.acceptance,
    "",
    "Source: docs/plan/delivery-plan.md",
  ].join("\n");
}

function title(story) {
  const short = story.story.length > 120 ? `${story.story.slice(0, 117)}...` : story.story;
  return `${story.id} ${short}`;
}

const select = (state, field, option) => ({ guid: state.fields[field].guid, single_select_value: state.fields[field].options[option] });

function clientToken(id) {
  const h = createHash("sha256").update(`swiss-keepsakes:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function syncTasks(plan, state) {
  const have = existingTasks(state);
  const epicLabel = new Map(plan.epics.map((e) => [e.id, `${e.id} ${e.name}`]));
  let created = 0;
  let updated = 0;

  for (const story of plan.stories) {
    const owned = [select(state, "Priority", story.priority), select(state, "Epic", epicLabel.get(story.epic))];
    const guid = have.get(story.id);
    if (!guid) {
      const status = /Blocked by Q\d+/.test(story.acceptance) ? "Blocked" : "Backlog";
      task(["tasks", "create", "--data", JSON.stringify({
        summary: title(story),
        description: describe(story),
        client_token: clientToken(story.id),
        tasklists: [{ tasklist_guid: state.tasklist, section_guid: state.sections[String(story.sprint)] }],
        custom_fields: [...owned, select(state, "Status", status)],
      })], { write: true });
      created++;
    } else {
      task(["tasks", "patch", "--params", JSON.stringify({ task_guid: guid }), "--data", JSON.stringify({
        update_fields: ["summary", "description", "custom_fields"],
        task: { summary: title(story), description: describe(story), custom_fields: owned },
      })], { write: true });
      updated++;
    }
  }

  const orphans = [...have.keys()].filter((id) => !plan.stories.some((s) => s.id === id));
  if (orphans.length) console.warn(`in Lark but not in the plan, left alone: ${orphans.join(", ")}`);
  console.log(`tasks: ${created} created, ${updated} updated`);
}

function pullStatus(state) {
  const byOption = new Map(Object.entries(state.fields.Status.options).map(([name, guid]) => [guid, name]));
  const status = {};
  for (const [id, guid] of existingTasks(state)) {
    const res = task(["tasks", "get", "--params", JSON.stringify({ task_guid: guid })]);
    const value = res.task?.custom_fields?.find((f) => f.guid === state.fields.Status.guid)?.single_select_value;
    status[id] = byOption.get(value) ?? "Backlog";
  }
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  console.log(`status.json: ${Object.keys(status).length} stories`);
}

const plan = parsePlan(readFileSync(planPath, "utf8"));
if (mode === "parse") {
  console.log(`${plan.epics.length} epics, ${plan.sprints.length} sprints, ${plan.stories.length} stories`);
  for (const p of PRIORITIES) console.log(`${p}: ${plan.stories.filter((s) => s.priority === p).length}`);
  process.exit(0);
}
const state = loadState();
ensureList(plan, state);
syncTasks(plan, state);
if (mode === "live") pullStatus(state);
if (state.url) console.log(state.url);
