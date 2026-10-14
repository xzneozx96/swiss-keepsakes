// Times the pre-stopgap M15 hook (perf-analytics-m15-prestopgap.mts) once, for the evidence table.
// Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/perf-analytics-m15-prestopgap-bench.mts
import { createRequire } from "node:module";

const require = createRequire(`${process.cwd()}/package.json`);
const { createElement } = require("react") as typeof import("react");
const { renderToString } = require("react-dom/server") as typeof import("react-dom/server");
let zurich = 0;
const Orig = Intl.DateTimeFormat;
Intl.DateTimeFormat = class extends Orig {
  constructor(l?: string | string[], o?: Intl.DateTimeFormatOptions) {
    super(l, o);
    if (o?.timeZone === "Europe/Zurich") zurich++;
  }
} as typeof Intl.DateTimeFormat;
const { LocaleProvider } = await import("@/contexts/locale-context");
const { DemoProvider } = await import("@/features/demo");
const { usePartnerAnalytics } = await import("./perf-analytics-m15-prestopgap.mts");
let ms = 0;
function Probe() {
  const t0 = performance.now();
  usePartnerAnalytics();
  ms = performance.now() - t0;
  return null;
}
renderToString(createElement(LocaleProvider, null, createElement(DemoProvider, null, createElement(Probe))));
console.log(`M15 usePartnerAnalytics before the stopgap: ${ms.toFixed(0)} ms, ${zurich} Europe/Zurich formatters built in one render (counting wrapper on)`);
