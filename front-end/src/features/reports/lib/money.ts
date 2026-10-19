import type { GuestGroup, ReportTx } from "./transactions";
import type { Rappen } from "@/features/catalog/types";
import type { DayRange } from "@/lib/analytics";
import type { CommissionAdjustment } from "@/features/partners/types";

import { zurichDayOf } from "@/features/catalog/lib/pickup";
import { transactionKey } from "@/features/partners/lib/ledger";

/** M21 filters (spec §4.13): source, goods or tours, guest group, product or tour. */
export interface ReportFilters {
  /** "all", "direct" or a partner id. */
  source: string;
  type: "all" | "goods" | "tours";
  group: "all" | GuestGroup;
  /** "all" or a product or tour id. */
  item: string;
}

export const NO_FILTERS: ReportFilters = {
  source: "all",
  type: "all",
  group: "all",
  item: "all",
};

export function matchesFilters(tx: ReportTx, f: ReportFilters): boolean {
  if (f.source === "direct" && tx.partnerId) return false;
  if (f.source !== "all" && f.source !== "direct" && tx.partnerId !== f.source)
    return false;
  if (f.type !== "all" && tx.kind !== f.type) return false;
  if (f.group !== "all" && tx.group !== f.group) return false;
  if (f.item !== "all" && !tx.lines.some((l) => l.itemId === f.item))
    return false;

  return true;
}

export const MONEY_METRICS = [
  "value",
  "collected",
  "outstanding",
  "refunds",
  "commission",
] as const;
export type MoneyMetric = (typeof MONEY_METRICS)[number];

export type Split = { goods: Rappen; tours: Rappen };

const inRange = (day: string | null, r: DayRange) =>
  !!day && day >= r.start && day <= r.end;

/**
 * The money summary for one period (spec §4.13): kept apart, never added into one revenue
 * figure, and split into goods and tours. Value and outstanding follow the day a sale was
 * placed; collected, refunds and commission follow the day the money moved or was recorded.
 */
export function moneySummary(
  txs: ReportTx[],
  adjustments: CommissionAdjustment[],
  range: DayRange,
): Record<MoneyMetric, Split> {
  const zero = (): Split => ({ goods: 0, tours: 0 });
  const out: Record<MoneyMetric, Split> = {
    value: zero(),
    collected: zero(),
    outstanding: zero(),
    refunds: zero(),
    commission: zero(),
  };
  const byKey = new Map(txs.map((tx) => [tx.key, tx]));

  for (const tx of txs) {
    if (inRange(tx.day, range)) {
      out.value[tx.kind] += tx.value;
      out.outstanding[tx.kind] += tx.outstanding;
    }
    for (const p of tx.payments) {
      if (inRange(p.day, range)) out.collected[tx.kind] += p.amount;
    }
    if (inRange(tx.commissionDay, range))
      out.commission[tx.kind] += tx.commission;
  }
  for (const a of adjustments) {
    const tx = byKey.get(transactionKey(a.transaction));

    if (!tx || !inRange(zurichDayOf(a.at), range)) continue;
    out.refunds[tx.kind] += a.refunded;
    out.commission[tx.kind] -= a.commission;
  }

  return out;
}

export const total = (s: Split) => s.goods + s.tours;
