import type { PartnerRowProps } from "../components/partner-rows";

import { PARTNER_FILTERS, type PartnerFilter } from "../lib/search-params";

import { useLocale } from "@/contexts/locale-context";
import { useDemo, useDemoNow } from "@/features/demo";
import { canDeletePartner } from "@/features/partners/hooks/use-partner-actions";
import { partnerLedger } from "@/features/partners/lib/ledger";
import { linkOpens } from "@/features/partners/lib/link-opens";
import { formatMoney, numberFormat } from "@/lib/format";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const inFilter = (row: PartnerRowProps, filter: PartnerFilter) => {
  if (filter === "archived") return row.isArchived;
  if (row.isArchived) return false;
  if (filter === "toPay") return row.toPayAmount > 0;

  return row.linkRevoked;
};

/**
 * M15 Partners: each partner's link opens and conversion in the last 30 days, transactions,
 * and what is still to pay after offsets (spec §5.2). Most still to pay first, so payouts
 * come first. Archived partners only show under their own filter (D17).
 */
export function useMerchantPartners(filter: PartnerFilter[], query: string) {
  const { t, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const percent = numberFormat(intlLocale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const opens = linkOpens(state.data);
  const to = now.getTime();
  const from = to - WINDOW_MS;
  const within = (at: string) => {
    const ms = Date.parse(at);

    return ms >= from && ms <= to;
  };

  const all: PartnerRowProps[] = state.data.partners
    .map((partner) => {
      const ledger = partnerLedger(state.data, partner.id, now);
      const opens30 = opens.filter(
        (o) => o.partnerId === partner.id && within(o.at),
      ).length;
      const transactions30 = ledger.items.filter((i) =>
        within(i.createdAt),
      ).length;

      return {
        id: partner.id,
        href: `#/store/partners/${partner.id}`,
        name: partner.name,
        code: partner.code,
        email: partner.email,
        kind: t(`merchantPartners.kind.${partner.kind}`),
        opens: opens30,
        transactions: ledger.items.filter((i) => Date.parse(i.createdAt) <= to)
          .length,
        conversion: opens30 ? percent.format(transactions30 / opens30) : null,
        toPayAmount: ledger.toPay,
        toPay: money(ledger.toPay),
        toOffset: ledger.toOffset > 0 ? money(ledger.toOffset) : null,
        linkRevoked: partner.reportToken === null,
        isArchived: !!partner.archivedAt,
        canDelete: canDeletePartner(state.data, partner.id),
      };
    })
    .sort(
      (a, b) => b.toPayAmount - a.toPayAmount || a.name.localeCompare(b.name),
    );

  const needle = query.trim().toLowerCase();
  const matches = (row: PartnerRowProps) =>
    !needle ||
    [row.name, row.code, row.email].some((v) =>
      v.toLowerCase().includes(needle),
    );

  return {
    // Several filters add up; none ticked is every active partner.
    rows: all.filter(
      (row) =>
        (filter.length
          ? filter.some((id) => inFilter(row, id))
          : !row.isArchived) && matches(row),
    ),
    filters: PARTNER_FILTERS.map((id) => ({
      id,
      label: t(`merchantPartners.filter.${id}`),
      count: all.filter((row) => inFilter(row, id)).length,
    })),
    activeCount: all.filter((row) => !row.isArchived).length,
    existingCodes: state.data.partners.map((p) => p.code),
    total: all.length,
  };
}
