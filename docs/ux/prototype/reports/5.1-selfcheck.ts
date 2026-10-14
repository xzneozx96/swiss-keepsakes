// Step 5.1 self-check: worked numbers and ledger invariants from a fresh seed.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/5.1-selfcheck.ts
import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { upgradeDemoData } from "@/features/demo/upgrade";
import { allOrders, partnerLedger, transactionKey } from "@/features/partners/lib/ledger";
import { partnerReport } from "@/features/partners/report/lib/report";
import { linkOpens } from "@/features/partners/lib/link-opens";
import { COST_TYPES } from "@/features/reports/types";

const chf = (r: number) => (r / 100).toFixed(2);
let fails = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`);
  if (!ok) fails++;
};

const data = createSeedState(DEMO_START).data;
const now = new Date(DEMO_START);
const day30 = DEMO_START - 30 * 86_400_000;

console.log("Partners:", data.partners.map((p) => `${p.name} (${p.reportToken ?? "revoked"})`).join(", "));
console.log("Payouts:", data.partnerPayouts.map((p) => `${p.partnerId} ${p.paidOn} ${chf(p.amount)}`).join("; "));
console.log("Adjustments:", data.commissionAdjustments.map((a) => `${a.transaction.id} line ${a.lineId} refunded ${chf(a.refunded)} commission -${chf(a.commission)} at ${a.at}`).join("; "));

for (const p of data.partners) {
  const l = partnerLedger(data, p.id, now);
  const opens = linkOpens(data).filter((o) => o.partnerId === p.id);
  const opens30 = opens.filter((o) => Date.parse(o.at) >= day30 && Date.parse(o.at) <= DEMO_START).length;
  const counts: Record<string, number> = {};
  for (const i of l.items) counts[i.state] = (counts[i.state] ?? 0) + 1;
  console.log(`\n${p.name}: earned ${chf(l.earned)} · paid ${chf(l.paid)} · offset ${chf(l.offset)} · to pay ${chf(l.toPay)} · to offset ${chf(l.toOffset)} · estimated ${chf(l.estimated)}`);
  console.log(`  opens: ${opens.length} total, ${opens30} in last 30 days · transactions ${l.items.length} ${JSON.stringify(counts)}`);
  for (const e of l.entries.filter((e) => e.type !== "recorded")) {
    const what = e.type === "payout" ? chf(e.payout.amount) : e.type === "adjustment" ? `-${chf(e.adjustment.commission)}` : `${chf(e.amount)} on ${e.item.ref}`;
    console.log(`  ${e.at.slice(0, 16)} ${e.type} ${what} → to pay ${chf(e.toPay)}, to offset ${chf(e.toOffset)}`);
  }
  // Invariants
  check(l.earned - l.paid === l.toPay - l.toOffset, "earned − paid = to pay − to offset");
  check(l.toPay >= 0 && l.toOffset >= 0 && (l.toPay === 0 || l.toOffset === 0), "never negative; never both owed and overpaid");
  const settled = [...l.settled.values()].reduce((a, b) => a + b, 0);
  check(settled === l.earned - l.toPay, "per-transaction settled sums to earned − still to pay");
  check(l.items.every((i) => (l.settled.get(transactionKey(i.transaction)) ?? 0) <= Math.max(0, i.amount - i.adjusted)), "no transaction settled beyond its net commission");
  check(opens30 > 0 && opens30 < opens.length, "30-day opens exclude older opens");
}

// P02 groups by order date and adds the history, as its hook does. The September settlement
// must equal P02's September commission, so the partner sees September as paid.
const withHistory = { ...data, orders: allOrders(data) };
for (const p of data.partners) {
  const sept = partnerReport(withHistory, p.id, "month", "2026-09-15", now);
  const payout = data.partnerPayouts.find((x) => x.partnerId === p.id && x.paidOn === "2026-10-05")?.amount ?? 0;
  console.log(`${p.name}: P02 September earned ${chf(sept.earned)}, 5 Oct payout ${chf(payout)}`);
  check(sept.earned === payout, `${p.name}: September payout equals P02 September commission`);
}

// Live cases on Hotel am See, which starts with an overpayment still to offset. A newly
// recorded commission is offset first; whatever the overpayment does not cover is owed, and
// that transaction is only partly paid. Expectations follow from the seeded carry-over.
const start = partnerLedger(data, "hotel-am-see", now);
function complete(kind: "order" | "booking", ref: string) {
  const live = structuredClone(data);
  const at = new Date(DEMO_START + 1_800_000).toISOString();
  let id = "";
  if (kind === "order") {
    const o = live.orders.find((x) => x.ref === ref)!;
    Object.assign(o, { status: "completed", completedAt: at, commissionRecordedAt: at });
    id = o.id;
  } else {
    const b = live.tours!.bookings.find((x) => x.ref === ref)!;
    Object.assign(b, { status: "completed", commissionRecordedAt: at });
    id = b.id;
  }
  const l = partnerLedger(live, "hotel-am-see", new Date(DEMO_START + 3_600_000));
  const item = l.items.find((i) => i.transaction.id === id)!;
  const got = l.settled.get(transactionKey(item.transaction)) ?? 0;
  const covered = Math.min(item.amount, start.toOffset);
  console.log(`Complete ${ref} (${chf(item.amount)}): to pay ${chf(l.toPay)}, to offset ${chf(l.toOffset)}, settled ${chf(got)}`);
  check(l.toPay === item.amount - covered && l.toOffset === start.toOffset - covered, `${ref}: offset ${chf(covered)}, owed ${chf(item.amount - covered)}`);
  check(got === covered, `${ref}: settled ${chf(covered)} of ${chf(item.amount)}${covered < item.amount ? " (partly paid)" : " (paid by offset)"}`);
  check([...l.settled.values()].reduce((a, b) => a + b, 0) === l.earned - l.toPay, `${ref}: settled sums to earned − still to pay`);
  return covered < item.amount;
}
complete("order", "SK-1028");
check(complete("booking", "SK-T1049"), "a commission larger than the overpayment ends partly paid");

const has = data.partners.find((p) => p.id === "hotel-am-see")!;
const hl = partnerLedger(data, has.id, now);
check(hl.entries.some((e) => e.type === "offset"), "Hotel am See shows at least one offset");
check(hl.toOffset > 0, "Hotel am See still has an overpayment to carry over");
check(data.partners.find((p) => p.id === "guide-sophie")?.reportToken === null, "Guide Sophie's link is revoked");

const missing = data.costs.filter((c) => COST_TYPES.some((t) => !(t in c.costs)));
console.log(`\nCosts: ${data.costs.length} transactions, ${missing.length} with a missing cost: ${missing.map((c) => c.transaction.id).join(", ")}`);
check(missing.length === 5, "five transactions miss one cost each");
check(data.costs.every((c) => c.costs.delivery && "notApplicable" in c.costs.delivery), "delivery confirmed not applicable everywhere (pickup only)");

// A browser that stored demo data before Phase 5 gets the new collections from the seed.
const { partners, partnerPayouts, commissionAdjustments, costs, ...old } = data;
const upgraded = upgradeDemoData(old);
check(upgraded.partners.length === 3 && upgraded.partnerPayouts.length === partnerPayouts.length && upgraded.costs.length === costs.length && upgraded.commissionAdjustments.length === commissionAdjustments.length, "upgrade fills Phase 5 collections from the seed");
void partners;

console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} FAILED`}`);
process.exit(fails ? 1 : 0);
