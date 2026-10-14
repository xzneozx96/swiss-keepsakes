import type { StatusTone } from "@/components/status-chip";

export interface PaymentsView {
  heading: string;
  /** "CHF 22.35 to offset carried from before 1 Oct", or null. */
  carriedIn: string | null;
  rows: {
    id: string;
    text: string;
    date: string;
    amount: string;
    tone: StatusTone;
  }[];
  /** "Offset in this period", "Still to offset" and their values. */
  totals: { label: string; value: string }[];
}

const amountTone: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-foreground",
  neutral: "text-muted",
};

/**
 * P02 payouts, refund adjustments and offsets for the period (step 5.7, AC13, D16): what
 * the shop paid, what a refund took back, and how an overpayment was offset, with the part
 * carried from an earlier period. Same white widget as the other P02 sections.
 */
export function PaymentsWidget({ view }: { view: PaymentsView }) {
  return (
    <section
      aria-labelledby="report-payments"
      className="flex min-w-0 flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface"
    >
      <h2 className="font-semibold" id="report-payments">
        {view.heading}
      </h2>
      {view.carriedIn && (
        <p className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
          {view.carriedIn}
        </p>
      )}
      {view.rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-separator">
          {view.rows.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium">{row.text}</span>
                <span className="text-xs text-muted tabular-nums">
                  {row.date}
                </span>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${amountTone[row.tone]}`}
              >
                {row.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
      {view.totals.length > 0 && (
        <dl className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3 text-sm">
          {view.totals.map((total) => (
            <div
              key={total.label}
              className="flex justify-between gap-3 tabular-nums"
            >
              <dt className="text-muted">{total.label}</dt>
              <dd className="font-medium">{total.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
