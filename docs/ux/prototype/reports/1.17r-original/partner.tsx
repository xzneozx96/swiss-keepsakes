import type { ReportPeriod } from "@/features/partners/report/lib/report";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PartnerShell } from "@/components/layout/partner-shell";
import { useLocale } from "@/contexts/locale-context";
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

// P02 Partner report. The partner link with email code (P01) comes in Phase 5.
export const Route = createFileRoute("/partner")({
  validateSearch: (search: Record<string, unknown>): PartnerSearch => ({
    period: isReportPeriod(search.period) ? search.period : undefined,
    date: isIsoDate(search.date) ? search.date : undefined,
  }),
  component: PartnerPage,
});

function PartnerPage() {
  const { t } = useLocale();
  const { period = DEFAULT_REPORT_PERIOD, date } = Route.useSearch();
  const navigate = useNavigate({ from: "/partner" });
  const report = usePartnerReport(period, date);
  const isLoading = useSimulatedLoading();
  const go = (next: PartnerSearch) =>
    void navigate({
      search: {
        period: next.period === DEFAULT_REPORT_PERIOD ? undefined : next.period,
        date: next.date,
      },
      replace: true,
    });

  return (
    <PartnerShell>
      <PartnerReport
        canGoNext={report.next !== null}
        copy={{
          periodsLabel: t("partnerReport.period.label"),
          previous: t("partnerReport.period.previous"),
          next: t("partnerReport.period.next"),
          numbersHeading: t("partnerReport.numbersHeading"),
          groupsHeading: t("partnerReport.groupsHeading"),
          groupCommission: t("partnerReport.column.commission"),
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
        groups={report.groups}
        isCurrent={report.isCurrent}
        isLoading={isLoading}
        numbers={report.numbers}
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
