import type { SalesPeriodId } from "@/features/merchant/sales/lib/periods";
import type { DayRange } from "@/lib/analytics";
import type { ReportFilters } from "@/features/reports/lib/money";
import type { ReactNode } from "react";

import { createContext, useContext, useMemo, useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { zurichDayOf } from "@/features/catalog/lib/pickup";
import { useDemo } from "@/features/demo";
import { useSalesOverview } from "@/features/merchant/sales/hooks/use-sales-overview";
import { allOrders, transactionKey } from "@/features/partners/lib/ledger";
import { useReports } from "@/features/reports/hooks/use-reports";
import { NO_FILTERS } from "@/features/reports/lib/money";
import { formatMoney, percentOf } from "@/lib/format";
import { pickText } from "@/lib/localized";

/** A previous range that holds nothing, for "All time" (no comparison). */
const NOTHING: DayRange = { start: "0000-01-01", end: "0000-01-01" };

export interface ShareBar {
  id: string;
  label: string;
  value: string;
  share: number;
  shareText: string;
  detail: string;
  kind: "gift" | "tour";
  /** Rappen, for charts. */
  amount: number;
  /** A row with gifts and tours in it: each one's share of the period total, for a stacked bar. */
  parts?: { gifts: number; tours: number };
  /** Rappen of keepsakes and of tours, for stacked charts. */
  amounts?: { gifts: number; tours: number };
}

function useReportPagesState() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const [period, setPeriod] = useState<SalesPeriodId>("7d");
  const [custom, setCustom] = useState<DayRange | null>(null);
  const [filters, setFilters] = useState<ReportFilters>(NO_FILTERS);
  const sales = useSalesOverview(
    period,
    period === "custom" ? custom : null,
    filters,
  );
  const report = useReports("30d", filters, {
    current: sales.current,
    previous: sales.previous ?? NOTHING,
  });
  const { products, subcategories, pickupPlaces, orders } = state.data;
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const pct = (part: number, whole: number) =>
    percentOf(part, whole, intlLocale);

  // The sales of the period (declined and cancelled left out), as the Sales figures count them.
  const placed = report.txs.filter(
    (tx) =>
      tx.status !== "lost" &&
      tx.day >= report.current.start &&
      tx.day <= report.current.end,
  );

  const toBars = (
    map: Map<string, { value: number; n: number; kind: "gift" | "tour" }>,
    name: (id: string) => string,
    of: "reportPages.ofTotalSales" | "reportPages.ofKeepsakeSales",
  ): ShareBar[] => {
    const total = [...map.values()].reduce((a, e) => a + e.value, 0);

    return [...map.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .map(([id, e]) => ({
        id,
        label: name(id),
        value: money(e.value),
        share: total ? e.value / total : 0,
        shareText: t(of, { share: pct(e.value, total) }),
        detail: t("reports.groups.count", { count: e.n }),
        kind: e.kind,
        amount: e.value,
      }));
  };

  // Product groups: each gift category, and tours as one group.
  const groupMap = new Map<
    string,
    { value: number; n: number; kind: "gift" | "tour" }
  >();

  for (const tx of placed) {
    const seen = new Set<string>();

    for (const l of tx.lines) {
      const group =
        l.kind === "tours"
          ? "tours"
          : (products.find((p) => p.id === l.itemId)?.subcategoryId ?? "other");
      const e = groupMap.get(group) ?? {
        value: 0,
        n: 0,
        kind: l.kind === "tours" ? "tour" : "gift",
      };

      e.value += l.value;
      if (!seen.has(group)) e.n += 1;
      seen.add(group);
      groupMap.set(group, e);
    }
  }
  const productGroups = toBars(
    groupMap,
    (id) => {
      if (id === "tours") return t("salesOverview.tours");
      const c = subcategories.find((x) => x.id === id);

      return c ? pickText(c.name, language).text : id;
    },
    "reportPages.ofTotalSales",
  );

  // Gift pickup places (tours have no pickup).
  const placeOf = useMemo(
    () =>
      new Map(
        allOrders({ orders }).map((o) => [
          transactionKey({ kind: "order", id: o.id }),
          o.pickupPlaceId,
        ]),
      ),
    [orders],
  );
  const placeMap = new Map<
    string,
    { value: number; n: number; kind: "gift" | "tour" }
  >();

  for (const tx of placed) {
    const id = placeOf.get(tx.key);

    if (tx.kind !== "goods" || !id) continue;
    const e = placeMap.get(id) ?? { value: 0, n: 0, kind: "gift" as const };

    e.value += tx.value;
    e.n += 1;
    placeMap.set(id, e);
  }
  const places = toBars(
    placeMap,
    (id) => {
      const p = pickupPlaces.find((x) => x.id === id);

      return p ? pickText(p.name, language).text : id;
    },
    "reportPages.ofKeepsakeSales",
  );

  // Guest groups: the share of the period's total sales, counted as the Sales figures.
  const groupTotal = placed.reduce((a, tx) => a + tx.value, 0);
  const guestGroups: ShareBar[] = report.funnel.groups.map((g) => {
    const list = placed.filter((tx) => tx.group === g.id);
    const value = list.reduce((a, tx) => a + tx.value, 0);
    const part = (kind: "goods" | "tours") =>
      list.filter((tx) => tx.kind === kind).reduce((a, tx) => a + tx.value, 0);

    return {
      id: g.id,
      label: g.label,
      value: money(value),
      share: groupTotal ? value / groupTotal : 0,
      shareText: t("reportPages.ofTotalSales", {
        share: pct(value, groupTotal),
      }),
      detail: t("reports.groups.count", { count: list.length }),
      kind: "gift",
      amount: value,
      parts: {
        gifts: groupTotal ? part("goods") / groupTotal : 0,
        tours: groupTotal ? part("tours") / groupTotal : 0,
      },
      amounts: { gifts: part("goods"), tours: part("tours") },
    };
  });

  // Sources: each one's total sales, keepsakes and tours apart (for the stacked chart).
  const sourceSplit = report.funnel.sources.map((src) => {
    const list = placed.filter((tx) =>
      src.id === "direct" ? !tx.partnerId : tx.partnerId === src.id,
    );
    const part = (kind: "goods" | "tours") =>
      list.filter((tx) => tx.kind === kind).reduce((a, tx) => a + tx.value, 0);

    return {
      id: src.id,
      label: src.name,
      gifts: part("goods"),
      tours: part("tours"),
    };
  });

  // How the period's orders and bookings ended (or are still running).
  const inPeriod = report.txs.filter(
    (tx) => tx.day >= report.current.start && tx.day <= report.current.end,
  );
  const ended = (status: string) =>
    inPeriod.filter((tx) => tx.status === status).length;
  const outcomes = {
    completed: ended("completed"),
    open: ended("open"),
    lost: ended("lost"),
    noShow: ended("no-show"),
  };

  // Inquiries sent in the period: advice requests (opened or not) and private tour requests.
  const sentIn = (iso: string) => {
    const day = zurichDayOf(iso);

    return day >= sales.current.start && day <= sales.current.end;
  };
  const adviceIn = state.data.adviceRequests.filter((r) => sentIn(r.sentAt));
  const privateIn = state.data.privateTourRequests.filter((r) =>
    sentIn(r.sentAt),
  );
  const inquiries = {
    advice: {
      read: adviceIn.filter((r) => r.readAt).length,
      unread: adviceIn.filter((r) => !r.readAt).length,
    },
    privateTours: {
      answered: privateIn.filter((r) => r.answeredAt).length,
      waiting: privateIn.filter((r) => !r.answeredAt).length,
      guests: privateIn.reduce((a, r) => a + r.groupSize, 0),
    },
  };

  return {
    inquiries,
    sourceSplit,
    outcomes,
    period,
    custom,
    filters,
    setPeriod: (p: SalesPeriodId) => {
      if (p === "custom" && !custom) setCustom(sales.current);
      setPeriod(p);
    },
    setCustom,
    setFilters,
    sales,
    report,
    productGroups,
    places,
    guestGroups,
  };
}

export type ReportPagesData = ReturnType<typeof useReportPagesState>;

const Ctx = createContext<ReportPagesData | null>(null);

/** One period and one set of filters for all four Reports pages (and each Analytics page). */
export function ReportPagesProvider({ children }: { children: ReactNode }) {
  const value = useReportPagesState();

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReportPages(): ReportPagesData {
  const value = useContext(Ctx);

  if (!value) throw new Error("useReportPages outside ReportPagesProvider");

  return value;
}
