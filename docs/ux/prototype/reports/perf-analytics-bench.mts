// Analytics performance bench: mounts each analytics hook (M02 Overview, P02 report, M15
// Analytics) inside the real providers with react-dom/server, times the hook body, counts
// Intl formatter constructions per mount, and writes the hook output for a before/after diff.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/perf-analytics-bench.mts <label>
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const label = process.argv[2] ?? "run";
const require = createRequire(`${process.cwd()}/package.json`);
const { createElement } = require("react") as typeof import("react");
const { renderToString } = require("react-dom/server") as typeof import("react-dom/server");

// Count formatter constructions (zurichDate and zurichHour each build one per call).
const counts = { dateTime: 0, zurich: 0, number: 0, plural: 0 };
const Orig = {
  DateTimeFormat: Intl.DateTimeFormat,
  NumberFormat: Intl.NumberFormat,
  PluralRules: Intl.PluralRules,
};
class CountingDTF extends Orig.DateTimeFormat {
  constructor(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    super(locales, options);
    counts.dateTime++;
    if (options?.timeZone === "Europe/Zurich") counts.zurich++;
  }
}
class CountingNF extends Orig.NumberFormat {
  constructor(locales?: string | string[], options?: Intl.NumberFormatOptions) {
    super(locales, options);
    counts.number++;
  }
}
class CountingPR extends Orig.PluralRules {
  constructor(locales?: string | string[], options?: Intl.PluralRulesOptions) {
    super(locales, options);
    counts.plural++;
  }
}
const counting = (on: boolean) => {
  Object.assign(Intl, on
    ? { DateTimeFormat: CountingDTF, NumberFormat: CountingNF, PluralRules: CountingPR }
    : Orig);
  counts.dateTime = counts.zurich = counts.number = counts.plural = 0;
};

const { LocaleProvider } = await import("@/contexts/locale-context");
const { DemoProvider } = await import("@/features/demo");
const { useOverviewAnalytics } = await import("@/features/merchant/today/hooks/use-overview-analytics");
const { useMerchantToday } = await import("@/features/merchant/today/hooks/use-merchant-today");
const { usePartnerReport } = await import("@/features/partners/report/hooks/use-partner-report");
const { usePartnerAnalytics } = await import("@/features/merchant/partners/hooks/use-partner-analytics");

const hooks: Record<string, () => unknown> = {
  "M02 useMerchantToday": () => useMerchantToday(),
  "M02 useOverviewAnalytics": () => useOverviewAnalytics(),
  "P02 usePartnerReport(month)": () => usePartnerReport("hotel-am-see", "month"),
  "P02 usePartnerReport(week)": () => usePartnerReport("hotel-am-see", "week"),
  "P02 usePartnerReport(day)": () => usePartnerReport("hotel-am-see", "day"),
  "M15 usePartnerAnalytics": () => usePartnerAnalytics(),
};

/** Mounts the hook once inside fresh providers; returns the hook's own time and output. */
function mount(use: () => unknown): { ms: number; out: unknown } {
  let ms = 0;
  let out: unknown;
  function Probe() {
    const t0 = performance.now();
    out = use();
    ms = performance.now() - t0;
    return null;
  }
  renderToString(
    createElement(LocaleProvider, null, createElement(DemoProvider, null, createElement(Probe))),
  );
  return { ms, out };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const RUNS = 15;
const outputs: Record<string, unknown> = {};

console.log(`perf-analytics bench (${label}), node ${process.version}`);
console.log("hook | first mount ms | median of next mounts ms | Intl per mount: DateTimeFormat (Europe/Zurich) / NumberFormat / PluralRules");
for (const [name, use] of Object.entries(hooks)) {
  const first = mount(use);
  const rest = Array.from({ length: RUNS }, () => mount(use).ms);
  counting(true);
  const counted = mount(use);
  const c = { ...counts };
  counting(false);
  outputs[name] = counted.out;
  console.log(
    `${name} | ${first.ms.toFixed(1)} | ${median(rest).toFixed(1)} | ${c.dateTime} (${c.zurich}) / ${c.number} / ${c.plural}`,
  );
}

// Bare helper cost, for the evidence table.
const { zurichDate } = await import("@/features/catalog/lib/pickup");
const t0 = performance.now();
for (let i = 0; i < 20_000; i++) zurichDate(new Date(1_790_000_000_000 + i * 3_600_000));
console.log(`zurichDate x20000: ${(performance.now() - t0).toFixed(1)} ms`);

const replacer = (_: string, v: unknown) =>
  typeof v === "function" ? `[fn ${(v as { name?: string }).name ?? ""}]` : v;
const file = `${process.cwd()}/../docs/ux/prototype/reports/perf-analytics-${label}.json`;
writeFileSync(file, JSON.stringify(outputs, replacer, 1));
console.log(`outputs written to ${file}`);
