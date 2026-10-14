// Steps 5.10–5.12 self-check: funnel order and coverage, sources, groups, margin rules.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/5.10-selfcheck.ts
import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { periodRanges } from "@/features/merchant/today/lib/analytics";
import { FUNNEL_STEPS, funnel } from "@/features/reports/lib/behaviour";
import { margin } from "@/features/reports/lib/margin";
import { reportTransactions } from "@/features/reports/lib/transactions";

let fails = 0;
const check = (ok: boolean, what: string) => { console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) fails++; };
const chf = (r: number) => (r / 100).toFixed(2);
const data = createSeedState(DEMO_START).data;
const txs = reportTransactions(data);
const r30 = periodRanges("30d", "2026-10-13").current;

const f = funnel(data, txs, r30, "all");
console.log("30-day funnel:", f.steps, "coverage", f.coverage.toFixed(3));
check(FUNNEL_STEPS.every((s, i) => i === 0 || f.steps[s] <= f.steps[FUNNEL_STEPS[i - 1]]), "each funnel step is at most the step before");
check(f.coverage < 1 && f.coverage > 0.9, "the 30 days include the partially tracked week (coverage below 100%)");
const r7 = periodRanges("7d", "2026-10-13").current;
check(funnel(data, txs, r7, "all").coverage === 1, "the last 7 days are fully tracked");

const sources = ["direct", ...data.partners.map((p) => p.id)].map((id) =>
  funnel(data, txs.filter((tx) => (id === "direct" ? !tx.partnerId : tx.partnerId === id)), r30, id));
check(sources.reduce((s, x) => s + x.steps.sent, 0) === f.steps.sent, "sales by source add up to all sales");
check(sources.every((x) => x.steps.sent <= x.steps.visits), "no source converts more sales than visits");

const m = margin(txs, data.costs, data.commissionAdjustments, r30);
console.log("30-day margin goods:", { ...m.goods, revenue: chf(m.goods.revenue), costs: chf(m.goods.costs), margin: chf(m.goods.margin) });
console.log("30-day margin tours:", { ...m.tours, revenue: chf(m.tours.revenue), costs: chf(m.tours.costs), margin: chf(m.tours.margin) });
check(m.goods.complete + m.tours.complete + m.missing.length === m.goods.sales + m.tours.sales, "every completed sale is either in the margin or listed as missing costs");
check(m.missing.length === 5 && m.missing.every((x) => x.types.length > 0), "the five seeded sales with a missing cost are left out and listed");
check(m.goods.revenue - m.goods.costs === m.goods.margin, "margin = revenue − costs");
// Filling in a missing cost brings that sale into the margin.
const first = m.missing[0];
const filled = data.costs.map((c) => (c.transaction.id === first.tx.transaction.id ? { ...c, costs: { ...c.costs, ...Object.fromEntries(first.types.map((t) => [t, { notApplicable: true }])) } } : c));
const m2 = margin(txs, filled, data.commissionAdjustments, r30);
check(m2.missing.length === 4 && m2[first.tx.kind].complete === m[first.tx.kind].complete + 1, `completing ${first.tx.ref}'s costs moves it into the margin`);

console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
