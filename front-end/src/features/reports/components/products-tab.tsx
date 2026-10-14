import type { ReportsView } from "../hooks/use-reports";

import { RankedList } from "./ranked-list";

import { useLocale } from "@/contexts/locale-context";
import { Widget } from "@/features/merchant/today/components/overview-analytics";

/** A small label/value grid, as in the M15 and M16 cards. */
function Facts({
  items,
}: {
  items: { id: string; label: string; value: string | number }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 tabular-nums">
      {items.map((item) => (
        <div key={item.id} className="flex min-w-0 flex-col">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="text-lg font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * M21 Products tab (step 5.11, spec §4.13): best sellers for goods and tours, how sales ended,
 * stock and seats that need attention, and how articles and the advice widget perform.
 * Bars and seat meters in the chart colours; sales figures follow the filters, stock and seats
 * do not.
 */
export function ProductsTab({ view }: { view: ReportsView }) {
  const { t } = useLocale();
  const p = view.products;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {(["goods", "tours"] as const).map((kind) => (
        <Widget
          key={kind}
          description={t("reports.products.description")}
          id={`reports-best-${kind}`}
          title={t(`reports.products.${kind}`)}
        >
          {p[kind].length ? (
            <RankedList label={t(`reports.products.${kind}`)} rows={p[kind]} />
          ) : (
            <p className="text-sm text-muted">{t("reports.products.none")}</p>
          )}
        </Widget>
      ))}

      <Widget
        description={t("reports.outcome.description")}
        id="reports-outcomes"
        title={t("reports.outcome.title")}
      >
        <Facts items={p.outcomes} />
      </Widget>

      <Widget
        description={t("reports.capacity.description")}
        id="reports-capacity"
        title={t("reports.capacity.title")}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">
              {t("reports.capacity.stock")}
            </h4>
            {p.lowStock.length ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {p.lowStock.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span className="min-w-0">{s.name}</span>
                    <span
                      className={`shrink-0 tabular-nums ${s.left === 0 ? "font-semibold text-danger" : "text-muted"}`}
                    >
                      {t("reports.capacity.left", { count: s.left })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                {t("reports.capacity.stockOk")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">
              {t("reports.capacity.seats")}
            </h4>
            {p.seats.length ? (
              <ul className="flex flex-col gap-3 text-sm">
                {p.seats.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {s.name} · {s.when}
                      </span>
                      <span className="shrink-0 text-muted tabular-nums">
                        {t("reports.capacity.taken", {
                          taken: s.taken,
                          capacity: s.capacity,
                        })}
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className="h-1.5 overflow-hidden rounded-full bg-(--chart-track)"
                    >
                      <span
                        className="block h-full rounded-full bg-(--chart-1)"
                        style={{
                          width: `${Math.round((s.taken / Math.max(1, s.capacity)) * 100)}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                {t("reports.capacity.noDepartures")}
              </p>
            )}
          </div>
        </div>
      </Widget>

      <Widget
        description={t("reports.content.description")}
        id="reports-content"
        title={t("reports.content.title")}
      >
        {p.articles.length ? (
          <ul className="flex flex-col divide-y divide-separator">
            {p.articles.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium">
                  {a.title}
                  <span className="ms-2 text-xs font-normal text-muted">
                    {a.language}
                  </span>
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {t("reports.content.line", {
                    views: a.views,
                    clicks: a.clicks,
                    rate: a.rate,
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("reports.content.none")}</p>
        )}
      </Widget>

      <Widget
        description={t("reports.widget.description")}
        id="reports-widget"
        title={t("reports.widget.title")}
      >
        <Facts items={p.widget} />
      </Widget>

      <p className="text-xs text-pretty text-muted lg:col-span-2">
        {t("reports.products.note")}
      </p>
    </div>
  );
}
