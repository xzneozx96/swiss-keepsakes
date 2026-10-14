import type { PartnerFilter } from "@/features/merchant/partners/hooks/use-merchant-partners";
import type { PartnersView } from "@/features/merchant/partners/components/merchant-partners";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { MerchantPartners } from "@/features/merchant/partners/components/merchant-partners";
import { PARTNER_FILTERS } from "@/features/merchant/partners/hooks/use-merchant-partners";

interface PartnersSearch {
  /** Absent = the Partners tab. */
  view?: "analytics";
  /** Absent = all active partners. */
  filter?: Exclude<PartnerFilter, "all">;
}

// M15 Partners (step 5.2). M16 partner detail is /store/partners/$partnerId.
export const Route = createFileRoute("/store/partners/")({
  validateSearch: (search: Record<string, unknown>): PartnersSearch => ({
    view: search.view === "analytics" ? "analytics" : undefined,
    filter:
      PARTNER_FILTERS.includes(search.filter as PartnerFilter) &&
      search.filter !== "all"
        ? (search.filter as Exclude<PartnerFilter, "all">)
        : undefined,
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const { view, filter = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/store/partners/" });

  return (
    <MerchantPartners
      filter={filter}
      view={view ?? "partners"}
      onFilterChange={(next) =>
        void navigate({
          search: (s) => ({ ...s, filter: next === "all" ? undefined : next }),
          replace: true,
          resetScroll: false,
        })
      }
      onViewChange={(next: PartnersView) =>
        void navigate({
          search: (s) => ({
            ...s,
            view: next === "analytics" ? "analytics" : undefined,
          }),
          replace: true,
          resetScroll: false,
        })
      }
    />
  );
}
