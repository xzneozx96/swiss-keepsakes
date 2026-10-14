// 1.17r P02 self-check: chart buckets and order counts over the seed (as right after Reset) and the
// 1.19b review state, at the demo start (13.10.2026 10:00 Zurich).
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/1.17r-selfcheck.ts
import type { ReportPeriod } from "@/features/partners/report/lib/report";
import type { DemoData } from "@/features/demo/types";

import { readFileSync } from "node:fs";

import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { partnerReport } from "@/features/partners/report/lib/report";

const now = new Date(DEMO_START);
const chf = (r: number) => `CHF ${(r / 100).toFixed(2)}`;
let fails = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "PASS" : "FAIL"} ${name}`);
};
const review: DemoData = JSON.parse(
  readFileSync(new URL("./1.17r-review-state.json", import.meta.url), "utf8"),
).data;
const PRIVATE = /@|example\.com|Papa|engrav|pickup|phone|\+41/i;

for (const [name, data] of [["seed", createSeedState().data], ["review", review]] as const) {
  for (const [period, anchor, columns] of [
    ["month", "2026-10-13", 5],
    ["week", "2026-10-13", 7],
    ["day", "2026-10-13", 24],
    ["day", "2026-10-11", 24],
    ["month", "2026-09-01", 5],
  ] as [ReportPeriod, string, number][]) {
    const r = partnerReport(data, "hotel-am-see", period, anchor, now);
    console.log(`\n${name} ${period} ${r.range.start}..${r.range.end}: earned ${chf(r.earned)}, estimated ${chf(r.estimated)}, counts ${JSON.stringify(r.counts)}`);
    for (const b of r.buckets)
      if (b.orders || b.isCurrent)
        console.log(`  ${b.start}..${b.end}${b.hour !== undefined ? ` ${b.hour}h` : ""}: ${b.orders} orders, rec ${chf(b.recorded)}, est ${chf(b.estimated)}${b.isCurrent ? " (current)" : ""}`);
    check(`${columns} columns`, r.buckets.length === columns);
    check("columns cover the range without gaps",
      r.buckets[0].start === r.range.start && r.buckets.at(-1)!.end === r.range.end);
    check("column sums = headline numbers",
      r.buckets.reduce((s, b) => s + b.recorded, 0) === r.earned &&
      r.buckets.reduce((s, b) => s + b.estimated, 0) === r.estimated);
    check("column orders = rows", r.buckets.reduce((s, b) => s + b.orders, 0) === r.rows.length);
    check("counts = rows", r.counts.recorded + r.counts.estimated + r.counts["not-applicable"] === r.rows.length && r.counts.none === 0);
    check("no future column holds orders", r.buckets.every((b) => !b.isFuture || b.orders === 0));
    check("at most one current column", r.buckets.filter((b) => b.isCurrent).length <= 1);
    check("groups sum to numbers",
      r.groups.reduce((s, g) => s + g.recorded, 0) === r.earned &&
      r.groups.reduce((s, g) => s + g.estimated, 0) === r.estimated);
    check("no private fields in rows or buckets (AC12)",
      !PRIVATE.test(JSON.stringify(r.rows.map(({ lines, ...rest }) => rest))) && !PRIVATE.test(JSON.stringify(r.buckets)) &&
      r.rows.every((row) => Object.keys(row).join() === "id,ref,createdAt,guestName,lines,value,status,commission"));
  }
}

const seedMonth = partnerReport(createSeedState().data, "hotel-am-see", "month", "2026-10-13", now);
check("seed month weeks: 5–11 Oct CHF 5.40 recorded, 12–18 Oct CHF 11.30 estimated, 19–31 future",
  seedMonth.buckets[1].recorded === 540 && seedMonth.buckets[2].estimated === 1130 &&
  seedMonth.buckets[2].isCurrent && seedMonth.buckets[3].isFuture && seedMonth.buckets[4].isFuture);
const seedDay = partnerReport(createSeedState().data, "hotel-am-see", "day", "2026-10-13", now);
check("seed day: 08:00 CHF 4.90 estimated, 10:00 current, 11:00+ future",
  seedDay.buckets[8].estimated === 490 && seedDay.buckets[10].isCurrent && seedDay.buckets[11].isFuture && !seedDay.buckets[9].isFuture);
console.log(`\n${fails ? `${fails} FAIL` : "ALL PASS"}`);
process.exit(fails ? 1 : 0);
