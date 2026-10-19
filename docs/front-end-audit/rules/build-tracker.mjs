// Builds the skeleton of rule-coverage.tsv from the react-best-practices rule files.
// Existing verdicts in the TSV are kept; only missing rules are appended as PENDING.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const dir = join(homedir(), ".claude/skills/react-best-practices/rules");
const out = new URL("../rule-coverage.tsv", import.meta.url).pathname;
const header = ["rule", "impact", "title", "applicable", "detector", "verdict", "evidence", "action"];
const rows = new Map();

if (existsSync(out)) {
  for (const line of readFileSync(out, "utf8").trim().split("\n").slice(1)) {
    const cols = line.split("\t");
    rows.set(cols[0], cols);
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_"))) {
  const rule = file.replace(/\.md$/, "");
  const text = readFileSync(join(dir, file), "utf8");
  const field = (name) => text.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].replace(/^["']|["']$/g, "").trim() ?? "";

  if (!rows.has(rule)) rows.set(rule, [rule, field("impact"), field("title"), "", "", "PENDING", "", ""]);
}

const sorted = [...rows.values()].sort((a, b) => a[0].localeCompare(b[0]));

writeFileSync(out, [header, ...sorted].map((r) => r.join("\t")).join("\n") + "\n");
console.log(`${sorted.length} rules, ${sorted.filter((r) => !r[1] || !r[2]).length} missing impact or title`);
