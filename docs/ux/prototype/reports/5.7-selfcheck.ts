// Step 5.7 self-check: P02 period payouts, refund adjustments and offsets match the M16 ledger.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/5.7-selfcheck.ts
import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { partnerLedger } from "@/features/partners/lib/ledger";
import { periodMoney } from "@/features/partners/report/lib/payouts";
import { periodRange } from "@/features/partners/report/lib/report";

let fails = 0;
const check = (ok: boolean, what: string) => { console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`); if (!ok) fails++; };
const chf = (r: number) => (r / 100).toFixed(2);
const data = createSeedState(DEMO_START).data;
const now = new Date(DEMO_START);

for (const id of ["hotel-am-see", "guide-marco", "guide-sophie"]) {
  const ledger = partnerLedger(data, id, now);
  const months = ["2026-08-15", "2026-09-15", "2026-10-13"].map((d) => periodMoney(data, id, periodRange("month", d), now));
  const [aug, sep, oct] = months;
  console.log(`${id}: paid Aug ${chf(aug.paid)} Sep ${chf(sep.paid)} Oct ${chf(oct.paid)} · Oct adjusted ${chf(oct.adjusted)} offset ${chf(oct.offset)} carried ${chf(oct.carriedIn)} · end to pay ${chf(oct.toPay)} to offset ${chf(oct.toOffset)}`);
  check(aug.paid + sep.paid + oct.paid === ledger.paid, "monthly payments add up to all payments");
  check(oct.toPay === ledger.toPay && oct.toOffset === ledger.toOffset, "the running month ends at the ledger's current balance");
  check(sep.toPay >= 0 && sep.toOffset >= 0 && oct.toPay >= 0, "no negative balance in any month");
  check(oct.allTime.paid === ledger.paid, "all-time paid equals the ledger");
}
const has = periodMoney(data, "hotel-am-see", periodRange("month", "2026-10-13"), now);
check(has.paid === 15080 && has.adjusted === 3570 && has.offset === 1125, "Hotel am See October: paid 150.80, refund −35.70, offset 11.25");
check(has.carriedIn === 0 && has.toOffset === 1110, "Hotel am See October: nothing carried in, 11.10 still to offset at the end");
check(has.entries.map((e) => e.type).join(",") === "payout,adjustment,offset,offset", "October entries in order: payout, refund, two offsets");
// A month after the refund but before new commission would carry the overpayment in.
const nov = periodMoney(data, "hotel-am-see", { start: "2026-10-08", end: "2026-10-11" }, now);
check(nov.carriedIn === 2235, `a period starting 8 Oct carries in 22.35 to offset (got ${chf(nov.carriedIn)})`);

console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
