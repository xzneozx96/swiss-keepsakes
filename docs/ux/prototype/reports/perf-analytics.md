# Analytics screens: performance fix

Owner report, 14 October 2026: M02 Overview analytics, the P02 partner report and the M15 Analytics tab open with a long delay.

## Root cause (measured)

`zurichDate()` in `features/catalog/lib/pickup.ts` built a new `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", … })` on every call, about 50–60 µs each. The analytics code asks for a timestamp's Zurich day for every order, link open and transaction, per day and per series, so one render made tens of thousands of calls. The M15 Analytics tab took over 5 s per render and once crashed a headless browser; M02 and P02 had the same pattern on a smaller scale.

## Fix

| File | Change |
| --- | --- |
| `features/catalog/lib/pickup.ts` | One module-level Zurich-day formatter; new `zurichDayOf(iso)` caches each timestamp's day. Same output as before. |
| `features/merchant/today/lib/analytics.ts` | Uses `zurichDayOf` for every per-order day. |
| `features/merchant/today/hooks/use-overview-analytics.ts` | Heavy derived data in `useMemo` (history merge, analytics, all-time). |
| `features/partners/report/lib/report.ts`, `hooks/use-partner-report.ts` | Report and all-time data in `useMemo`; the hour formatter built once. |
| `features/merchant/partners/hooks/use-partner-analytics.ts` | Uses the shared `zurichDayOf` (replaces its local cache). |

These edits were made by the first performance sub-agent, which then stopped when the laptop shut down without verifying them; a second one ran out of memory with the laptop. The main session reviewed the edits (identical output: the cache returns the same string for the same timestamp; the memos only skip recomputing when their inputs are unchanged) and verified them below.

## Measurements (`reports/perf-bench.ts`, Node, seeded demo at 13.10.2026 10:00)

| Work | Time |
| --- | --- |
| 10,000 Zurich days, new formatter per call (old) | 601 ms |
| 10,000 Zurich days, shared formatter (now) | 12 ms |
| M02 `overviewAnalytics` 7d / 30d / month | 0.8 / 1.3 / 0.5 ms |
| P02 `partnerReport` day / week / month | 0.15 / 0.09 / 0.15 ms |
| P02 `partnerAllTime` | 0.20 ms |
| P02 `periodMoney` month | 0.59 ms |
| M15/M16 ledger, all three partners | 0.49 ms |

In the browser the M15 Analytics tab went from several seconds per render to about 0.3 s to switch tabs (measured during step 5.2).

## Verification

- `5.1-selfcheck.ts`, `5.3-selfcheck.ts`, `5.7-selfcheck.ts`: ALL PASS (partner figures, each partner's P02 September commission equal to its payout, period money equal to the ledger).
- Typecheck clean.

## Not changed, on purpose

- `useSimulatedLoading` keeps every list and dashboard on its skeleton for 350 ms on first render, so reviewers see the loading state spec §5.5 requires. It is a deliberate delay, not a performance problem.
- The remaining `new Intl.*Format` calls in these hooks run a few times per render (per KPI or per period), not per order, so they are not hot.
