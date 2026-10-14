// Step 5.9 self-check: M21 money summary reconciles with the partner ledger and itself.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/5.9-selfcheck.ts
import { zurichDayOf } from "@/features/catalog/lib/pickup";
import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { periodRanges } from "@/features/merchant/today/lib/analytics";
import { partnerLedger } from "@/features/partners/lib/ledger";
import { NO_FILTERS, matchesFilters, moneySummary, total } from "@/features/reports/lib/money";
import { reportTransactions } from "@/features/reports/lib/transactions";

let fails = 0;
const check = (ok: boolean, what: string) => { console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) fails++; };
const chf = (r: number) => (r / 100).toFixed(2);
const data = createSeedState(DEMO_START).data;
const now = new Date(DEMO_START);
const txs = reportTransactions(data);
const { current } = periodRanges("30d", "2026-10-13");
const m = moneySummary(txs, data.commissionAdjustments, current);
console.log("30 days:", Object.fromEntries(Object.entries(m).map(([k, v]) => [k, `goods ${chf(v.goods)} · tours ${chf(v.tours)}`])));

// Commission: the ledgers' recorded commission minus refund adjustments in the same days.
const inR = (day: string) => day >= current.start && day <= current.end;
let ledgerCommission = 0;
for (const p of data.partners) {
  for (const e of partnerLedger(data, p.id, now).entries) {
    if (!inR(zurichDayOf(e.at))) continue;
    if (e.type === "recorded") ledgerCommission += e.amount;
    if (e.type === "adjustment") ledgerCommission -= e.adjustment.commission;
  }
}
check(total(m.commission) === ledgerCommission, `commission ${chf(total(m.commission))} equals the partner ledgers ${chf(ledgerCommission)}`);
check(total(m.refunds) === 23800, "the 7 Oct refund (CHF 238.00) is in the period's refunds");

// Filters partition: source all = direct + each partner; type all = goods + tours.
const by = (f: Partial<typeof NO_FILTERS>) => moneySummary(txs.filter((tx) => matchesFilters(tx, { ...NO_FILTERS, ...f })), data.commissionAdjustments, current);
const sources = ["direct", ...data.partners.map((p) => p.id)].map((source) => by({ source }));
for (const k of ["value", "collected", "outstanding", "commission"] as const) {
  check(sources.reduce((s, x) => s + total(x[k]), 0) === total(m[k]), `${k}: direct + partners = all sources`);
}
check(total(by({ type: "goods" }).value) === m.value.goods && total(by({ type: "tours" }).value) === m.value.tours, "goods-only and tours-only match the split");
const groups = ["group-day", "group-multi", "independent-multi", "independent-day", "unknown"] as const;
check(groups.reduce((s, group) => s + total(by({ group }).value), 0) === total(m.value), "the five guest groups add up to all");
const counts = Object.fromEntries(groups.map((g) => [g, txs.filter((t) => t.group === g).length]));
console.log("transactions per group:", counts);
check(counts.unknown > 0 && counts["group-day"] > 0 && counts["independent-multi"] > 0, "every group has transactions, and some are not determined");

console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
