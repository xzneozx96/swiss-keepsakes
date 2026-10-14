// Step 1.9t: prints the demo-history refs that are NOT Hotel am See's (Guide Marco and direct
// orders), comma-separated, for 1.9t-1.17r-drive.mjs. Also sanity-checks the P02 all-time sums.
// Usage: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/1.9t-refs.ts
import { DEMO_HISTORY } from "@/features/merchant/today/lib/demo-history";
import { partnerAllTime, partnerReport } from "@/features/partners/report/lib/report";
import { createSeedState } from "@/features/demo/seed";

const notMine = DEMO_HISTORY.filter((o) => o.partnerId !== "hotel-am-see").map((o) => o.ref);
const data = createSeedState().data;
const orders = [...DEMO_HISTORY, ...data.orders];
const all = partnerAllTime(orders, "hotel-am-see", "2026-10-13")!;
const months = all.months.map((m) => m.earned ?? 0).reduce((a, b) => a + b, 0);
const now = new Date("2026-10-13T08:00:00Z");
const oct = partnerReport({ ...data, orders }, "hotel-am-see", "month", "2026-10-13", now);
const sept = partnerReport({ ...data, orders }, "hotel-am-see", "month", "2026-09-15", now);
console.error(`all-time earned ${all.earned}, months sum ${months}: ${all.earned === months ? "PASS" : "FAIL"}`);
console.error(`Oct bar ${all.months[6].earned} = Oct report earned ${oct.earned}: ${all.months[6].earned === oct.earned ? "PASS" : "FAIL"}`);
console.error(`Sept bar ${all.months[5].earned} = Sept report earned ${sept.earned}: ${all.months[5].earned === sept.earned ? "PASS" : "FAIL"}`);
console.error(`rows of other partners in Oct/Sept: ${[...oct.rows, ...sept.rows].filter((r) => notMine.includes(r.ref)).length}`);
console.log(notMine.join(","));
