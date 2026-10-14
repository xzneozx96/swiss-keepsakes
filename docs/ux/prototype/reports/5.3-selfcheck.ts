// Steps 5.3–5.4 self-check: a recorded payout settles what is owed, oldest first, and
// overpaying leaves an amount to offset. Run:
// cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/5.3-selfcheck.ts
import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { partnerLedger, transactionKey } from "@/features/partners/lib/ledger";

let fails = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${what}`);
  if (!ok) fails++;
};
const now = new Date(DEMO_START + 3_600_000);
const base = createSeedState(DEMO_START).data;
const pay = (data: typeof base, partnerId: string, amount: number) => ({
  ...data,
  partnerPayouts: [
    ...data.partnerPayouts,
    { id: `p-${amount}`, partnerId, amount, method: "bank-transfer" as const, paidOn: "2026-10-13", recordedBy: "manager" as const, recordedAt: now.toISOString() },
  ],
});

const before = partnerLedger(base, "guide-marco", now);
console.log(`Guide Marco before: to pay ${before.toPay / 100}`);

// Pay exactly what is owed: nothing left, every recorded commission settled.
const exact = partnerLedger(pay(base, "guide-marco", before.toPay), "guide-marco", now);
check(exact.toPay === 0 && exact.toOffset === 0, "paying the full amount leaves 0 to pay and 0 to offset");
check(exact.items.filter((i) => i.recordedAt).every((i) => (exact.settled.get(transactionKey(i.transaction)) ?? 0) === i.amount - i.adjusted), "every recorded commission is fully settled");
check(exact.entries.at(-1)?.type === "payout", "the payout is the newest ledger entry");

// Pay part: the oldest commissions are settled first, one is partly paid.
const part = partnerLedger(pay(base, "guide-marco", 1000), "guide-marco", now);
check(part.toPay === before.toPay - 1000, "a partial payout lowers what is owed by its amount");
const partial = part.items.filter((i) => { const s = part.settled.get(transactionKey(i.transaction)) ?? 0; return i.recordedAt && s > 0 && s < i.amount - i.adjusted; });
check(partial.length === 1, `exactly one transaction is partly paid (${partial.map((i) => i.ref).join(", ")})`);

// Pay more than owed (D6): the extra becomes an amount to offset, never a negative to pay.
const over = partnerLedger(pay(base, "guide-marco", before.toPay + 500), "guide-marco", now);
check(over.toPay === 0 && over.toOffset === 500, "overpaying by 5.00 leaves 5.00 to offset");

console.log(fails ? `${fails} FAILED` : "ALL PASS");
process.exit(fails ? 1 : 0);
