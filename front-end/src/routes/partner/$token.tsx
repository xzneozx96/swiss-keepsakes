import type { SalesPeriodId } from "@/features/merchant/sales/lib/periods";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PartnerShell } from "@/components/layout/partner-shell";
import { PartnerAccessScreen } from "@/features/partners/access/partner-access-screen";
import { usePartnerAccess } from "@/features/partners/hooks/use-partner-access";
import { PartnerDashboard } from "@/features/partners/report/components/partner-dashboard";
import { usePartnerOverview } from "@/features/partners/report/hooks/use-partner-overview";
import { SALES_PERIODS } from "@/features/merchant/sales/lib/periods";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

interface PartnerSearch {
  /** Absent = the last 4 weeks. */
  period?: SalesPeriodId;
  /** The custom range, YYYY-MM-DD; only with period "custom". */
  from?: string;
  to?: string;
}

const DEFAULT_PERIOD: SalesPeriodId = "28d";

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

const isPeriod = (value: unknown): value is SalesPeriodId =>
  SALES_PERIODS.includes(value as SalesPeriodId);

// P01 then P02 (step 5.6): the private report link opens the report only after the emailed
// code, then for 30 days on this browser (R10). /partner redirects here. Links from before
// the period dropdown (?period=month&date=…) fall back to the default period.
export const Route = createFileRoute("/partner/$token")({
  validateSearch: (search: Record<string, unknown>): PartnerSearch => ({
    period: isPeriod(search.period) ? search.period : undefined,
    from: isIsoDate(search.from) ? search.from : undefined,
    to: isIsoDate(search.to) ? search.to : undefined,
  }),
  component: PartnerPage,
});

function PartnerPage() {
  const { token } = Route.useParams();
  const access = usePartnerAccess(token);

  if (access.kind === "report") {
    return (
      <ReportPage
        partnerId={access.partner.id}
        partnerName={access.partner.name}
      />
    );
  }

  return (
    <PartnerShell
      partnerName={access.kind === "code" ? access.partner.name : undefined}
    >
      <PartnerAccessScreen access={access} />
    </PartnerShell>
  );
}

function ReportPage({
  partnerId,
  partnerName,
}: {
  partnerId: string;
  partnerName: string;
}) {
  const { period = DEFAULT_PERIOD, from, to } = Route.useSearch();
  const navigate = useNavigate({ from: "/partner/$token" });
  const custom = from && to ? { start: from, end: to } : null;
  const view = usePartnerOverview(
    partnerId,
    period,
    period === "custom" ? custom : null,
  );
  const isLoading = useSimulatedLoading();
  const go = (next: PartnerSearch) =>
    void navigate({
      search: {
        period: next.period === DEFAULT_PERIOD ? undefined : next.period,
        from: next.period === "custom" ? next.from : undefined,
        to: next.period === "custom" ? next.to : undefined,
      },
      replace: true,
      // A period switch keeps the reader where they are (default would scroll to the top).
      resetScroll: false,
    });

  return (
    <PartnerShell isWide partnerName={partnerName}>
      <PartnerDashboard
        custom={custom}
        isLoading={isLoading}
        period={period}
        view={view}
        onCustomChange={(range) =>
          go({ period: "custom", from: range.start, to: range.end })
        }
        onMonthSelect={(start) => {
          // A month opens as its days, up to today for the running month.
          const last = new Date(`${start.slice(0, 8)}01T12:00:00Z`);

          last.setUTCMonth(last.getUTCMonth() + 1, 0);
          const end = last.toISOString().slice(0, 10);

          go({
            period: "custom",
            from: start,
            to: end < view.sales.today ? end : view.sales.today,
          });
        }}
        onPeriodChange={(id) =>
          go({
            period: id,
            // Picking "Custom range" starts from the range on screen.
            ...(id === "custom"
              ? {
                  from: custom?.start ?? view.sales.current.start,
                  to: custom?.end ?? view.sales.current.end,
                }
              : {}),
          })
        }
      />
    </PartnerShell>
  );
}
