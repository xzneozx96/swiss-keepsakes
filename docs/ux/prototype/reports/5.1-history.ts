// How much partner commission the generated M02 history (DEMO_HISTORY) carries, per month.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/5.1-history.ts
import { DEMO_HISTORY } from "@/features/merchant/today/lib/demo-history";
import { commission } from "@/features/orders/lib/selectors";

const sums: Record<string, { n: number; rec: number }> = {};
for (const o of DEMO_HISTORY) {
  if (!o.partnerId) continue;
  const c = commission(o);
  const month = (o.commissionRecordedAt ?? o.createdAt).slice(0, 7);
  const k = `${o.partnerId} ${month} ${c.state}`;
  sums[k] ??= { n: 0, rec: 0 };
  sums[k].n++;
  sums[k].rec += c.total;
}
console.log("history orders:", DEMO_HISTORY.length, "first:", DEMO_HISTORY.map((o) => o.createdAt).sort()[0]);
for (const [k, v] of Object.entries(sums).sort()) console.log(k, v.n, (v.rec / 100).toFixed(2));
