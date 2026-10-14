import type { ReportsView } from "../hooks/use-reports";

import { RankedList } from "./ranked-list";

import { useLocale } from "@/contexts/locale-context";
import { Widget } from "@/features/merchant/today/components/overview-analytics";

/**
 * M21 Funnel tab (step 5.10, spec §4.13): the funnel with the drop at each step, conversion
 * by source, and the four guest groups plus "Not determined", in the Overview's chart colours. When a
 * filter applies only to sales, the funnel starts at "Request or booking sent".
 */
export function FunnelTab({ view }: { view: ReportsView }) {
  const { t } = useLocale();
  const f = view.funnel;
  const scale = Math.max(...f.rows.map((r) => r.value), 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Widget
        description={
          f.businessOnly
            ? t("reports.funnel.businessOnly")
            : t("reports.funnel.description")
        }
        id="reports-funnel"
        title={t("reports.funnel.title")}
      >
        {f.coverage && (
          <p className="mb-3 rounded-2xl bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
            {f.coverage}
          </p>
        )}
        <RankedList
          label={t("reports.funnel.title")}
          rows={f.rows.map((r) => ({ ...r, detail: r.drop }))}
          scale={scale}
        />
      </Widget>

      <Widget
        description={t("reports.groups.description")}
        id="reports-groups"
        title={t("reports.groups.title")}
      >
        <p className="mb-4 text-2xl font-semibold tracking-tight tabular-nums">
          {f.groupsTotal}
        </p>
        <RankedList label={t("reports.groups.title")} rows={f.groups} />
      </Widget>

      <Widget
        className="lg:col-span-2"
        description={t("reports.sources.description")}
        id="reports-sources"
        title={t("reports.sources.title")}
      >
        <ul className="flex flex-col divide-y divide-separator">
          {f.sources.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{s.name}</span>
                <span className="font-semibold tabular-nums">{s.value}</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums sm:grid-cols-4">
                {(
                  [
                    [t("reports.sources.visits"), s.visits],
                    [t("reports.sources.sent"), s.sent],
                    [t("reports.sources.completed"), s.completed],
                    [t("reports.sources.conversion"), s.conversion],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-col">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </Widget>
    </div>
  );
}
