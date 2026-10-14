// Standalone check of the zurichDate fix for perf-analytics.md: the old pattern (a new
// Intl.DateTimeFormat on every call) against the shared formatter in pickup.ts and the
// zurichDayOf cache. First proves the outputs equal, including both 2026 DST switches, then
// times each. Run: cd front-end && npx -y tsx --tsconfig tsconfig.json ../docs/ux/prototype/reports/perf-analytics-zurich.mts
import { zurichDate, zurichDayOf } from "@/features/catalog/lib/pickup";

// The pre-fix code, verbatim: pickup.ts zurichDate and report.ts zurichHour before 14 Oct.
function oldZurichDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}
function oldZurichHour(at: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zurich",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(at),
  );
}
// report.ts now holds this formatter at module level (not exported); same options.
const zurichHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zurich",
  hour: "2-digit",
  hourCycle: "h23",
});
const newZurichHour = (at: Date) => Number(zurichHourFormat.format(at));

const MIN = 60_000;
const HOUR = 60 * MIN;
const instants: number[] = [];
// Every 15 minutes across both 2026 switches (29 Mar 02:00 → 03:00, 25 Oct 03:00 → 02:00).
for (const [from, to] of [
  ["2026-03-28T00:00:00Z", "2026-03-31T00:00:00Z"],
  ["2026-10-24T00:00:00Z", "2026-10-27T00:00:00Z"],
])
  for (let t = Date.parse(from); t < Date.parse(to); t += 15 * MIN) instants.push(t);
// Every hour of 2026, plus the minute either side of each local midnight in the demo span.
for (let t = Date.parse("2026-01-01T00:00:00Z"); t < Date.parse("2027-01-01T00:00:00Z"); t += HOUR)
  instants.push(t);
for (let t = Date.parse("2026-08-01T21:59:00Z"); t < Date.parse("2026-11-01T00:00:00Z"); t += 24 * HOUR)
  instants.push(t, t + MIN, t + HOUR, t + HOUR + MIN);

let mismatches = 0;
for (const t of instants) {
  const at = new Date(t);
  const iso = at.toISOString();
  const day = oldZurichDate(at);
  if (zurichDate(at) !== day || zurichDayOf(iso) !== day || zurichDayOf(iso) !== day) {
    mismatches++;
    if (mismatches < 5) console.log(`MISMATCH day ${iso}: old ${day}, new ${zurichDate(at)}, cached ${zurichDayOf(iso)}`);
  }
  if (newZurichHour(at) !== oldZurichHour(at)) {
    mismatches++;
    if (mismatches < 5) console.log(`MISMATCH hour ${iso}: old ${oldZurichHour(at)}, new ${newZurichHour(at)}`);
  }
}
const sample = (iso: string) => `${iso} → ${zurichDate(new Date(iso))} ${String(newZurichHour(new Date(iso))).padStart(2, "0")}h`;
console.log(`equality: ${instants.length} instants (2026 hourly, both DST switches every 15 min, Zurich midnights Aug–Oct): ${mismatches ? `${mismatches} MISMATCHES` : "ALL EQUAL"}`);
console.log(`  DST samples: ${sample("2026-03-29T00:59:00Z")} | ${sample("2026-03-29T01:00:00Z")} | ${sample("2026-10-25T00:59:00Z")} | ${sample("2026-10-25T01:00:00Z")} | ${sample("2026-10-25T22:59:00Z")} | ${sample("2026-10-25T23:00:00Z")}`);

// Timing: 20,000 distinct instants an hour apart, as the earlier evidence measured.
const N = 20_000;
const dates = Array.from({ length: N }, (_, i) => new Date(1_790_000_000_000 + i * HOUR));
const isos = dates.map((d) => d.toISOString());
const time = (name: string, fn: () => void) => {
  const runs = Array.from({ length: 5 }, () => {
    const t0 = performance.now();
    fn();
    return performance.now() - t0;
  }).sort((a, b) => a - b);
  console.log(`${name.padEnd(52)} median ${runs[2].toFixed(1).padStart(7)} ms  (${((runs[2] / N) * 1000).toFixed(2)} µs per call)`);
};
console.log(`timing, ${N.toLocaleString("en")} calls, median of 5, node ${process.version}`);
time("old zurichDate: new Intl.DateTimeFormat per call", () => dates.forEach(oldZurichDate));
time("new zurichDate: one shared formatter", () => dates.forEach(zurichDate));
time("new zurichDayOf: shared formatter + cache (warm)", () => isos.forEach(zurichDayOf));
time("old zurichHour: new Intl.DateTimeFormat per call", () => dates.forEach(oldZurichHour));
time("new zurichHour: one shared formatter", () => dates.forEach(newZurichHour));
process.exit(mismatches ? 1 : 0);
