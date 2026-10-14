import type { ReportsView } from "../hooks/use-reports";

import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { ReportsIcon } from "@/components/icons";
import { StatCard } from "@/components/stat-card";
import { useLocale } from "@/contexts/locale-context";
import { Widget } from "@/features/merchant/today/components/overview-analytics";

/** Completeness meter in the chart colour, as the other analytics screens. */
function Meter({ share }: { share: number }) {
  return (
    <span
      aria-hidden
      className="block h-2 overflow-hidden rounded-full bg-(--chart-track)"
    >
      <span
        className="block h-full rounded-full bg-(--chart-1)"
        style={{ width: `${Math.round(share * 100)}%` }}
      />
    </span>
  );
}

/**
 * M21 Margin tab (step 5.12, spec §4.13, R14): contribution margin for goods and tours from
 * sales with complete actual costs only, how complete the data is, and the sales still
 * missing costs with a way to M24. A partial margin is never presented as the period's.
 */
export function MarginTab({ view }: { view: ReportsView }) {
  const { t } = useLocale();
  const m = view.margin;

  if (!m.summary) {
    return (
      <div className="rounded-3xl bg-surface shadow-surface">
        <EmptyState icon={ReportsIcon} message={t("reports.margin.empty")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface">
        <p className="text-sm font-medium">{m.summary}</p>
        <Meter share={m.share} />
        <p className="text-xs text-pretty text-muted">
          {t("reports.margin.rule")}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
        {m.parts.map((part) => (
          <StatCard
            key={part.id}
            label={part.label}
            value={part.hasData ? part.value : t("reports.margin.noData")}
          >
            {part.hasData ? (
              <dd className="flex flex-col gap-0.5 pt-1 text-xs text-muted tabular-nums">
                <span>{t("reports.margin.rate", { rate: part.rate })}</span>
                <span>
                  {t("reports.margin.breakdown", {
                    revenue: part.revenue,
                    costs: part.costs,
                  })}
                </span>
              </dd>
            ) : null}
            <dd className="mt-auto flex flex-col gap-1.5 pt-3">
              <span className="text-xs text-muted">{part.coverage}</span>
              <Meter share={part.share} />
            </dd>
          </StatCard>
        ))}
      </dl>

      {m.missingCount > 0 && (
        <Widget
          actions={
            <Link
              className="shrink-0 rounded-lg text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
              to="/store/reports/costs"
            >
              {t("reports.margin.enterCosts")}
            </Link>
          }
          description={t("reports.margin.missingDescription", {
            count: m.missingCount,
          })}
          id="reports-margin-missing"
          title={t("reports.margin.missingTitle")}
        >
          <ul className="flex flex-col divide-y divide-separator">
            {m.missing.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium">
                  {row.name}
                  <span className="ms-2 text-xs font-normal text-muted">
                    {row.ref}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  {t("costData.missingList", { items: row.items })}
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      )}
    </div>
  );
}
