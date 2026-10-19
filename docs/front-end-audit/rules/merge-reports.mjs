// Fills docs/audit/rule-coverage.tsv from each family's report.tsv and outcomes.tsv.
import { readFileSync, writeFileSync } from "node:fs";

const here = new URL("./", import.meta.url).pathname;
const trackerPath = `${here}../rule-coverage.tsv`;
const clean = (v) => (v ?? "").replace(/[\t\r\n]+/g, " ").trim();
const rows = readFileSync(trackerPath, "utf8").trim().split("\n").map((l) => l.split("\t"));
const header = rows.shift();

if (!header.includes("status")) header.push("status");
const reports = new Map();

for (const family of ["sac", "bundle", "rerender", "rendering", "js-advanced"]) {
  const lines = readFileSync(`${here}${family}/report.tsv`, "utf8").trim().split("\n").slice(1);

  for (const line of lines) {
    const [rule, applicable, detector, verdict, evidence, action] = line.split("\t");

    reports.set(rule, { family, applicable, detector, verdict, evidence, action });
  }
}
const outcomes = new Map(
  readFileSync(`${here}outcomes.tsv`, "utf8").trim().split("\n").slice(1).map((l) => l.split("\t")),
);
const missing = [];

for (const row of rows) {
  const report = reports.get(row[0]);

  if (!report) {
    missing.push(row[0]);
    continue;
  }
  row[3] = clean(report.applicable);
  row[4] = `${report.family}/${clean(report.detector).slice(0, 120)}`;
  row[5] = clean(report.verdict).split(/[\s(]/)[0];
  row[6] = clean(report.evidence).slice(0, 400);
  row[7] = outcomes.get(row[0]) ?? clean(report.action);
  row[8] = row[5] === "VIOLATED" ? (row[7].match(/^(PARTLY FIXED|FIXED|LEFT|NOT REPRODUCED)/)?.[1] ?? "OPEN") : row[5];
}
writeFileSync(trackerPath, [header, ...rows].map((r) => r.join("\t")).join("\n") + "\n");
const tally = {};

for (const row of rows) tally[row[8]] = (tally[row[8]] ?? 0) + 1;
console.log(JSON.stringify(tally), "missing from reports:", missing);
