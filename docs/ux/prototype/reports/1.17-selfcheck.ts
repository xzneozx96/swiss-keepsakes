// P02 self-check: runs the pure report over the seed (as right after Reset) at the demo start.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/1.17-selfcheck.ts
import type { ReportPeriod } from "@/features/partners/report/lib/report";

import { createSeedState } from "@/features/demo/seed";
import { partnerReport } from "@/features/partners/report/lib/report";

const { data } = createSeedState();
const chf = (r: number) => `CHF ${(r / 100).toFixed(2)}`;
let fails = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) fails++;
  console.log(`  ${ok ? "PASS" : "FAIL"} ${name}`);
};

const cases: [ReportPeriod, string, string[], number, number, number][] = [
  // period, anchor, refs, earned, estimated, value of counted orders
  ["month", "2026-10-13", ["SK-1031", "SK-1028", "SK-1017"], 540, 1130, 16700],
  ["week", "2026-10-13", ["SK-1031", "SK-1028"], 0, 1130, 11300],
  ["day", "2026-10-13", ["SK-1031"], 0, 490, 4900],
  ["day", "2026-10-11", [], 0, 0, 0],
  ["month", "2026-09-01", [], 0, 0, 0],
];

for (const [period, anchor, refs, earned, estimated, value] of cases) {
  const r = partnerReport(data, "hotel-am-see", period, anchor);
  console.log(`\n${period} ${r.range.start}..${r.range.end}`);
  for (const row of r.rows)
    console.log(`  ${row.ref} ${row.createdAt.slice(0, 10)} ${row.guestName} ${chf(row.value)} ${row.status.key} ${row.commission.label.key} ${chf(row.commission.amount)}`);
  for (const g of r.groups)
    console.log(`  group ${g.categoryId}: ${g.orders} orders, ${chf(g.value)}, recorded ${chf(g.recorded)}, estimated ${chf(g.estimated)}`);
  console.log(`  earned ${chf(r.earned)} · paid ${chf(r.paid)} · to pay ${chf(r.toPay)} · estimated ${chf(r.estimated)}`);
  check("refs", JSON.stringify(r.rows.map((x) => x.ref)) === JSON.stringify(refs));
  check("earned", r.earned === earned);
  check("estimated", r.estimated === estimated);
  check("paid 0, to pay = earned", r.paid === 0 && r.toPay === earned);
  check("groups sum to numbers",
    r.groups.reduce((s, g) => s + g.recorded, 0) === r.earned &&
    r.groups.reduce((s, g) => s + g.estimated, 0) === r.estimated &&
    r.groups.reduce((s, g) => s + g.value, 0) === value);
}

// AC12: nothing from Guide Marco or direct orders, and no private fields on a row.
const all = partnerReport(data, "hotel-am-see", "month", "2026-10-13");
const others = data.orders.filter((o) => o.partnerId !== "hotel-am-see").map((o) => o.ref);
console.log(`\nAC12: other orders in seed: ${others.join(", ")}`);
check("no foreign refs", all.rows.every((row) => !others.includes(row.ref)));
const json = JSON.stringify(all.rows);
check("no email, engraving, pickup or payment fields",
  !/@|engraving|pickup|payments|Papa/.test(json));

console.log(`\n${fails ? `${fails} FAIL` : "ALL PASS"}`);
process.exit(fails ? 1 : 0);
