// Analytics A/B bench for perf-analytics.md. Times the pure analytics functions and the three
// analytics hooks (each hook mounted with react-dom/server inside the real providers), counts
// the Europe/Zurich DateTimeFormat and NumberFormat constructions, and writes every output so two
// source trees can be compared with cmp. Run from a front-end tree (its tsconfig maps @/):
//   cd <tree> && npx -y tsx --tsconfig tsconfig.json <path>/perf-analytics-ab.mts <label> <out.json> [runs]
// The hooks' period state is read from globalThis.__PERIOD in scratch copies only; in a live
// tree every hook mounts with its default period.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const [label = "run", outFile, runsArg] = process.argv.slice(2);
const RUNS = Number(runsArg ?? 7);
const require = createRequire(`${process.cwd()}/package.json`);
const { createElement } = require("react") as typeof import("react");
const { renderToString } = require("react-dom/server") as typeof import("react-dom/server");

const counts = { zurich: 0, number: 0 };
const Orig = { DateTimeFormat: Intl.DateTimeFormat, NumberFormat: Intl.NumberFormat };
class CountingDTF extends Orig.DateTimeFormat {
  constructor(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    super(locales, options);
    if (options?.timeZone === "Europe/Zurich") counts.zurich++;
  }
}
class CountingNF extends Orig.NumberFormat {
  constructor(locales?: string | string[], options?: Intl.NumberFormatOptions) {
    super(locales, options);
    counts.number++;
  }
}
const counting = (on: boolean) => {
  Object.assign(Intl, on ? { DateTimeFormat: CountingDTF, NumberFormat: CountingNF } : Orig);
  counts.zurich = counts.number = 0;
};

const { DEMO_START } = await import("@/features/demo/clock");
const { createSeedState } = await import("@/features/demo/seed");
const { DEMO_HISTORY } = await import("@/features/merchant/today/lib/demo-history");
const { zurichDate } = await import("@/features/catalog/lib/pickup");
const { overviewAnalytics, allTimeSummary } = await import("@/features/merchant/today/lib/analytics");
const { partnerReport, partnerAllTime } = await import("@/features/partners/report/lib/report");
const { LocaleProvider } = await import("@/contexts/locale-context");
const { DemoProvider } = await import("@/features/demo");
const { useOverviewAnalytics } = await import("@/features/merchant/today/hooks/use-overview-analytics");
const { useMerchantToday } = await import("@/features/merchant/today/hooks/use-merchant-today");
const { usePartnerReport } = await import("@/features/partners/report/hooks/use-partner-report");
const { usePartnerAnalytics } = await import("@/features/merchant/partners/hooks/use-partner-analytics");

const data = createSeedState(DEMO_START).data;
const now = new Date(DEMO_START);
const today = zurichDate(now);
const withHistory = [...DEMO_HISTORY, ...data.orders];
const PARTNERS = ["hotel-am-see", "guide-marco", "guide-sophie"];
const PERIODS = ["7d", "30d", "month"] as const;
const REPORT = ["day", "week", "month"] as const;

const pure: Record<string, () => unknown> = {};
for (const p of PERIODS)
  pure[`overviewAnalytics(${p})`] = () => overviewAnalytics(withHistory, data.products, p, today);
pure["allTimeSummary"] = () => allTimeSummary(withHistory, today);
for (const r of REPORT)
  pure[`partnerReport x3 partners (${r})`] = () =>
    PARTNERS.map((id) =>
      partnerReport({ orders: withHistory, guests: data.guests, products: data.products, tours: data.tours }, id, r, today, now),
    );
pure["partnerAllTime x3 partners"] = () =>
  PARTNERS.map((id) => partnerAllTime(withHistory, id, today, data.tours?.bookings));

const setPeriod = (p: string | undefined) => {
  (globalThis as { __PERIOD?: string }).__PERIOD = p;
};
const hooks: Record<string, () => unknown> = {};
for (const p of PERIODS)
  hooks[`M02 useOverviewAnalytics(${p})`] = () => (setPeriod(p), useOverviewAnalytics());
hooks["M02 useMerchantToday"] = () => useMerchantToday();
for (const r of REPORT)
  hooks[`P02 usePartnerReport(hotel-am-see, ${r})`] = () => usePartnerReport("hotel-am-see", r);
for (const p of PERIODS)
  hooks[`M15 usePartnerAnalytics(${p})`] = () => (setPeriod(p), usePartnerAnalytics());

function mount(use: () => unknown): { ms: number; out: unknown } {
  let ms = 0;
  let out: unknown;
  function Probe() {
    const t0 = performance.now();
    out = use();
    ms = performance.now() - t0;
    return null;
  }
  renderToString(createElement(LocaleProvider, null, createElement(DemoProvider, null, createElement(Probe))));
  return { ms, out };
}
const call = (fn: () => unknown) => {
  const t0 = performance.now();
  const out = fn();
  return { ms: performance.now() - t0, out };
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const outputs: Record<string, unknown> = {};
const timings: Record<string, { first: number; median: number; zurich: number; number: number }> = {};
const run = (name: string, once: () => { ms: number; out: unknown }) => {
  const first = once();
  // A pre-fix M15 mount takes seconds: two more runs are enough there.
  const n = first.ms > 1000 ? 2 : RUNS;
  const rest = Array.from({ length: n }, () => once().ms);
  counting(true);
  const counted = once();
  const c = { ...counts };
  counting(false);
  outputs[name] = counted.out;
  timings[name] = { first: first.ms, median: median(rest), zurich: c.zurich, number: c.number };
  console.log(
    `${name.padEnd(42)} | ${first.ms.toFixed(1).padStart(8)} | ${median(rest).toFixed(1).padStart(8)} | ${String(c.zurich).padStart(6)} | ${String(c.number).padStart(4)}`,
  );
};

console.log(`perf-analytics A/B (${label}), node ${process.version}, cwd ${process.cwd()}`);
console.log(`${"function or hook".padEnd(42)} | first ms | median ms | Zurich DTF built | NumberFormat built`);
for (const [name, fn] of Object.entries(pure)) run(name, () => call(fn));
for (const [name, use] of Object.entries(hooks)) run(name, () => mount(use));
setPeriod(undefined);

const replacer = (_: string, v: unknown) =>
  typeof v === "function" ? `[fn ${(v as { name?: string }).name ?? ""}]` : v instanceof Map ? Object.fromEntries(v) : v;
if (outFile) {
  writeFileSync(outFile, JSON.stringify(outputs, replacer, 1));
  writeFileSync(outFile.replace(/\.json$/, ".timings.json"), JSON.stringify(timings, null, 1));
  console.log(`outputs written to ${outFile}`);
}
