import type { CostFilter } from "@/features/reports/lib/search-params";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CostDataPage } from "@/features/reports/components/cost-data-page";
import { COST_FILTERS } from "@/features/reports/lib/search-params";

interface CostSearch {
  /** Absent = missing first. */
  filter?: Exclude<CostFilter, "missing">;
  /** Monday of the week picked in the chart, YYYY-MM-DD; absent = every week. */
  week?: string;
}

// M24 Cost data (step 5.8). M21 Reports links here from its margin section (step 5.12).
export const Route = createFileRoute("/store/reports/costs")({
  validateSearch: (search: Record<string, unknown>): CostSearch => ({
    filter:
      COST_FILTERS.includes(search.filter as CostFilter) &&
      search.filter !== "missing"
        ? (search.filter as Exclude<CostFilter, "missing">)
        : undefined,
    week:
      typeof search.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.week)
        ? search.week
        : undefined,
  }),
  component: CostsPage,
});

function CostsPage() {
  const { filter = "missing", week } = Route.useSearch();
  const navigate = useNavigate({ from: "/store/reports/costs" });

  return (
    <CostDataPage
      filter={filter}
      week={week ?? null}
      onFilterChange={(next) =>
        void navigate({
          search: (s) => ({
            ...s,
            filter: next === "missing" ? undefined : next,
          }),
          replace: true,
          resetScroll: false,
        })
      }
      onWeekChange={(next) =>
        void navigate({
          search: (s) => ({ ...s, week: next ?? undefined }),
          replace: true,
          resetScroll: false,
        })
      }
    />
  );
}
