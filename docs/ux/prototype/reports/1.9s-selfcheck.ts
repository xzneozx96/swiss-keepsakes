import { DEMO_HISTORY } from "@/features/merchant/today/lib/demo-history";
import { overviewAnalytics, PERIODS } from "@/features/merchant/today/lib/analytics";
import { seedOrders } from "@/features/orders/seed";
import { products } from "@/features/catalog/seed";
const all = [...seedOrders(), ...DEMO_HISTORY];
console.log("history", DEMO_HISTORY.length, DEMO_HISTORY[0].createdAt, DEMO_HISTORY.at(-1)!.createdAt, DEMO_HISTORY.reduce((m,o)=>o.completedAt && o.completedAt>m?o.completedAt:m,""));
for (const p of PERIODS) { const t0=performance.now(); const a = overviewAnalytics(all, products, p, "2026-10-13"); console.log(p, (performance.now()-t0).toFixed(0)+"ms", a.current, a.previous, JSON.stringify(a.kpis.map(k=>[k.id,k.value,k.previous])), JSON.stringify(a.funnel), JSON.stringify(a.methods), JSON.stringify(a.places), JSON.stringify(a.groups.map(g=>[g.id,g.value]))); }
