import type { ReportPeriod, ReportRow } from "../lib/report";
import type {
  ReportGroupView,
  ReportNumber,
  ReportRowView,
} from "../components/partner-report";
import type { MessageKey } from "@/i18n/en";

import {
  partnerReport,
  periodRange,
  REPORT_PERIODS,
  shiftPeriod,
} from "../lib/report";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { categories } from "@/features/catalog/seed";
import { useDemo, useDemoNow } from "@/features/demo";
import { formatLabel } from "@/features/orders/lib/labels";
import { formatOrderDate } from "@/features/orders/lib/format";
import { partners } from "@/features/partners/seed";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

const periodLabels: Record<ReportPeriod, MessageKey> = {
  day: "partnerReport.period.day",
  week: "partnerReport.period.week",
  month: "partnerReport.period.month",
};

/**
 * P02 Partner report for the signed-in partner (Hotel am See in flow 1, as PartnerShell).
 * `anchor` is any Zurich day inside the period; absent = today.
 */
export function usePartnerReport(period: ReportPeriod, anchor?: string) {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const today = zurichDate(now);
  const day = anchor ?? today;
  const partner = partners[0];
  const report = partnerReport(state.data, partner.id, period, day);
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const plural = new Intl.PluralRules(intlLocale);
  const { start, end } = report.range;

  const rangeLabel =
    period === "day"
      ? formatShortDate(start, today, intlLocale)
      : period === "week"
        ? `${formatShortDate(start, today, intlLocale)} – ${formatShortDate(end, today, intlLocale)}`
        : new Intl.DateTimeFormat(intlLocale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${start}T12:00:00Z`));

  const gifts = ({ lines }: ReportRow) => {
    const [first, ...rest] = lines;
    const product = first ? pickText(first.productName, language).text : "";
    const vars = {
      product,
      quantity: first?.quantity ?? 0,
      count: rest.length,
    };

    return t(
      rest.length ? "partnerReport.giftsMore" : "partnerReport.gifts",
      vars,
    );
  };

  const rows: ReportRowView[] = report.rows.map((row) => ({
    id: row.id,
    reference: row.ref,
    date: formatOrderDate(zurichDate(new Date(row.createdAt)), intlLocale),
    guestName: row.guestName,
    gifts: gifts(row),
    value: money(row.value),
    status: {
      text: formatLabel(row.status, t, intlLocale),
      tone: row.status.tone,
    },
    commission: {
      amount:
        row.commission.state === "not-applicable"
          ? null
          : money(row.commission.amount),
      label: {
        text: formatLabel(row.commission.label, t, intlLocale),
        tone: row.commission.label.tone,
      },
    },
  }));

  const groups: ReportGroupView[] = report.groups.map((g) => {
    const category = categories.find((c) => c.id === g.categoryId);

    return {
      id: g.categoryId,
      name: category ? pickText(category.name, language).text : g.categoryId,
      summary: t(
        plural.select(g.orders) === "one"
          ? "partnerReport.group.summary.one"
          : "partnerReport.group.summary.other",
        { count: g.orders, value: money(g.value) },
      ),
      commission: money(g.recorded),
      estimated: g.estimated
        ? t("partnerReport.group.estimated", { amount: money(g.estimated) })
        : null,
    };
  });

  const numbers: ReportNumber[] = [
    {
      id: "earned",
      label: t("partnerReport.number.earned"),
      value: money(report.earned),
      hint: report.estimated
        ? t("partnerReport.number.earned.hintEstimated", {
            amount: money(report.estimated),
          })
        : t("partnerReport.number.earned.hint"),
    },
    {
      id: "paid",
      label: t("partnerReport.number.paid"),
      value: money(report.paid),
      hint: t("partnerReport.number.paid.hint"),
    },
    {
      id: "to-pay",
      label: t("partnerReport.number.toPay"),
      value: money(report.toPay),
      hint: t("partnerReport.number.toPay.hint"),
    },
  ];

  return {
    periods: REPORT_PERIODS.map((id) => ({
      id,
      label: t(periodLabels[id]),
    })),
    rangeLabel,
    previous: shiftPeriod(period, day, -1),
    // No paging into the future: the next period must have started by today.
    next:
      periodRange(period, shiftPeriod(period, day, 1)).start <= today
        ? shiftPeriod(period, day, 1)
        : null,
    isCurrent: today >= start && today <= end,
    numbers,
    groups,
    rows,
  };
}
