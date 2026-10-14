import type { ReportPeriod } from "@/features/partners/report/lib/report";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PartnerShell } from "@/components/layout/partner-shell";
import { useLocale } from "@/contexts/locale-context";
import { PartnerAccessScreen } from "@/features/partners/access/partner-access-screen";
import { usePartnerAccess } from "@/features/partners/hooks/use-partner-access";
import { PartnerReport } from "@/features/partners/report/components/partner-report";
import { usePartnerReport } from "@/features/partners/report/hooks/use-partner-report";
import {
  DEFAULT_REPORT_PERIOD,
  isReportPeriod,
} from "@/features/partners/report/lib/report";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

interface PartnerSearch {
  /** Absent = month. */
  period?: ReportPeriod;
  /** Any Zurich day in the period, YYYY-MM-DD. Absent = today. */
  date?: string;
}

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

// P01 then P02 (step 5.6): the private report link opens the report only after the emailed
// code, then for 30 days on this browser (R10). /partner redirects here.
export const Route = createFileRoute("/partner/$token")({
  validateSearch: (search: Record<string, unknown>): PartnerSearch => ({
    period: isReportPeriod(search.period) ? search.period : undefined,
    date: isIsoDate(search.date) ? search.date : undefined,
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
  const { t } = useLocale();
  const { period = DEFAULT_REPORT_PERIOD, date } = Route.useSearch();
  const navigate = useNavigate({ from: "/partner/$token" });
  const report = usePartnerReport(partnerId, period, date);
  const isLoading = useSimulatedLoading();
  const go = (next: PartnerSearch) =>
    void navigate({
      search: {
        period: next.period === DEFAULT_REPORT_PERIOD ? undefined : next.period,
        date: next.date,
      },
      replace: true,
      // A period switch keeps the reader where they are (default would scroll to the top).
      resetScroll: false,
    });

  return (
    <PartnerShell partnerName={partnerName}>
      <PartnerReport
        allTime={report.allTime}
        canGoNext={report.next !== null}
        chart={report.chart}
        copy={{
          periodsLabel: t("partnerReport.period.label"),
          previous: t("partnerReport.period.previous"),
          next: t("partnerReport.period.next"),
          numbersHeading: t("partnerReport.numbersHeading"),
          groupsHeading: t("partnerReport.groupsHeading"),
          transactionsHeading: t("partnerReport.transactionsHeading"),
          columns: {
            order: t("partnerReport.column.order"),
            value: t("partnerReport.column.value"),
            status: t("partnerReport.column.status"),
            commission: t("partnerReport.column.commission"),
          },
          empty: t("partnerReport.empty"),
          emptyAction: t("partnerReport.empty.action"),
        }}
        demoNote={report.demoNote}
        groups={report.groups}
        isCurrent={report.isCurrent}
        isLoading={isLoading}
        kpis={report.kpis}
        payments={report.payments}
        period={period}
        periods={report.periods}
        rangeLabel={report.rangeLabel}
        rows={report.rows}
        onNext={() => report.next && go({ period, date: report.next })}
        onPeriodChange={(id) => go({ period: id, date })}
        onPrevious={() => go({ period, date: report.previous })}
      />
    </PartnerShell>
  );
}
