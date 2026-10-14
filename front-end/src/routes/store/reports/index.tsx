import type { ReportTab } from "@/features/reports/components/reports-page";
import type { ReportFilters } from "@/features/reports/lib/money";
import type { PeriodId } from "@/features/merchant/today/lib/analytics";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PERIODS } from "@/features/merchant/today/lib/analytics";
import {
  REPORT_TABS,
  ReportsPage,
} from "@/features/reports/components/reports-page";
import { FunnelTab } from "@/features/reports/components/funnel-tab";
import { MarginTab } from "@/features/reports/components/margin-tab";
import { ProductsTab } from "@/features/reports/components/products-tab";
import { NO_FILTERS } from "@/features/reports/lib/money";

interface ReportsSearch {
  /** Absent = the money tab. */
  tab?: Exclude<ReportTab, "money">;
  /** Absent = 30 days. */
  period?: Exclude<PeriodId, "30d">;
  source?: string;
  type?: "goods" | "tours";
  group?: Exclude<ReportFilters["group"], "all">;
  item?: string;
}

const text = (value: unknown) =>
  typeof value === "string" && value && value !== "all" ? value : undefined;

// M21 Reports (steps 5.9–5.12). M24 cost data is /store/reports/costs.
export const Route = createFileRoute("/store/reports/")({
  validateSearch: (search: Record<string, unknown>): ReportsSearch => ({
    tab:
      REPORT_TABS.includes(search.tab as ReportTab) && search.tab !== "money"
        ? (search.tab as Exclude<ReportTab, "money">)
        : undefined,
    period:
      PERIODS.includes(search.period as PeriodId) && search.period !== "30d"
        ? (search.period as Exclude<PeriodId, "30d">)
        : undefined,
    source: text(search.source),
    type:
      search.type === "goods" || search.type === "tours"
        ? search.type
        : undefined,
    group: text(search.group) as ReportsSearch["group"],
    item: text(search.item),
  }),
  component: ReportsRoute,
});

function ReportsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/store/reports/" });
  const filters: ReportFilters = {
    source: search.source ?? NO_FILTERS.source,
    type: search.type ?? NO_FILTERS.type,
    group: search.group ?? NO_FILTERS.group,
    item: search.item ?? NO_FILTERS.item,
  };
  const go = (next: Partial<ReportsSearch>) =>
    void navigate({
      search: (s) => ({ ...s, ...next }),
      replace: true,
      resetScroll: false,
    });
  const none = (v: string) => (v === "all" ? undefined : v);

  return (
    <ReportsPage
      filters={filters}
      panels={{
        funnel: (view) => <FunnelTab view={view} />,
        products: (view) => <ProductsTab view={view} />,
        margin: (view) => <MarginTab view={view} />,
      }}
      period={search.period ?? "30d"}
      tab={search.tab ?? "money"}
      onFiltersChange={(f) =>
        go({
          source: none(f.source),
          type: none(f.type) as ReportsSearch["type"],
          group: none(f.group) as ReportsSearch["group"],
          item: none(f.item),
        })
      }
      onPeriodChange={(p) => go({ period: p === "30d" ? undefined : p })}
      onTabChange={(id) => go({ tab: id === "money" ? undefined : id })}
    />
  );
}
