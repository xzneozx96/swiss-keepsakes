// Analytics timing after the zurichDate fix, plus the old per-call formatter for comparison.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/perf-bench.ts
import { zurichDate } from "@/features/catalog/lib/pickup";
import { DEMO_START } from "@/features/demo/clock";
import { createSeedState } from "@/features/demo/seed";
import { overviewAnalytics } from "@/features/merchant/today/lib/analytics";
import { DEMO_HISTORY } from "@/features/merchant/today/lib/demo-history";
import { partnerLedger } from "@/features/partners/lib/ledger";
import { periodMoney } from "@/features/partners/report/lib/payouts";
import { partnerAllTime, partnerReport, periodRange } from "@/features/partners/report/lib/report";

const time = (label: string, fn: () => unknown, runs = 20) => {
  fn(); // warm up
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn();
  console.log(`${label.padEnd(44)} ${((performance.now() - t0) / runs).toFixed(2)} ms`);
};

const oldZurichDate = (at: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
const dates = Array.from({ length: 10_000 }, (_, i) => new Date(DEMO_START - i * 600_000));
time("10,000 days, new formatter per call (old)", () => dates.forEach(oldZurichDate), 3);
time("10,000 days, shared formatter (now)", () => dates.forEach(zurichDate), 3);

const data = createSeedState(DEMO_START).data;
const orders = [...DEMO_HISTORY, ...data.orders];
const now = new Date(DEMO_START);
const today = zurichDate(now);
for (const p of ["7d", "30d", "month"] as const) time(`M02 overviewAnalytics ${p}`, () => overviewAnalytics(orders, data.products, p, today));
const src = { ...data, orders };
for (const p of ["day", "week", "month"] as const) time(`P02 partnerReport ${p}`, () => partnerReport(src, "hotel-am-see", p, today, now));
time("P02 partnerAllTime", () => partnerAllTime(orders, "hotel-am-see", today, data.tours?.bookings));
time("P02 periodMoney month", () => periodMoney(data, "hotel-am-see", periodRange("month", today), now));
time("M15/M16 partnerLedger, 3 partners", () => data.partners.forEach((p) => partnerLedger(data, p.id, now)));
