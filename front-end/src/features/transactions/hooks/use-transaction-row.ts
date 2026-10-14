import type { IntlLocale } from "@/lib/format";
import type { ShownLabel } from "@/features/orders/hooks/use-orders";
import type { Order } from "@/features/orders/types";

import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { useOrderSummary } from "@/features/orders/hooks/use-orders";
import { formatOrderDate } from "@/features/orders/lib/format";
import { pickupChangedBySeller } from "@/features/orders/lib/selectors";
import { cancelBlock } from "@/features/orders/lib/transitions";
import { formatMoney } from "@/lib/format";
import { pickText } from "@/lib/localized";

/** Orders that need nothing more from the guest or the shop: C14 lists them under "Past". */
export const isClosedOrder = (order: Order) =>
  order.status === "completed" ||
  order.status === "declined" ||
  order.status === "cancelled";

export interface TransactionRowView {
  id: string;
  ref: string;
  photo?: string;
  /** First line's product as ordered (AC15), plus "+N more" for further lines. */
  title: string;
  amount: string;
  /** "SK-1012 · Pickup 09.10.2026". */
  meta: string;
  /** Date tile of the pickup ticket, e.g. Wed / 21 / Oct. */
  pickupDay: { weekday: string; day: string; month: string };
  place: string;
  progress: ShownLabel;
  payment: ShownLabel;
  /** R04: the seller changed the requested date or place, and the guest can still cancel. */
  changedNote?: string;
}

function pickupDay(isoDate: string, locale: IntlLocale) {
  const at = new Date(`${isoDate}T12:00:00Z`);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" })
      .format(at)
      .replace(/\.$/, "");

  return {
    weekday: part({ weekday: "short" }),
    day: part({ day: "numeric" }),
    month: part({ month: "short" }),
  };
}

/** One C14 row: product, amount, reference, pickup date and place, and both labels from T0. */
export function useTransactionRow(order: Order): TransactionRowView {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const summary = useOrderSummary(order, "guest");
  const [first, ...rest] = order.lines;
  const product = state.data.products.find((p) => p.id === first.productId);
  const name = pickText(first.productName, language).text;
  const place = state.data.pickupPlaces.find(
    (p) => p.id === order.pickupPlaceId,
  );

  return {
    id: order.id,
    ref: order.ref,
    photo: product?.photo,
    title:
      rest.length > 0
        ? t("transactions.row.more", { name, count: rest.length })
        : name,
    amount: formatMoney(summary.total / 100, intlLocale),
    meta: `${order.ref} · ${t("transactions.row.pickup", {
      date: formatOrderDate(order.pickupDate, intlLocale),
    })}`,
    pickupDay: pickupDay(order.pickupDate, intlLocale),
    place: place ? pickText(place.name, language).text : order.pickupPlaceId,
    progress: summary.progress,
    payment: summary.payment,
    changedNote:
      pickupChangedBySeller(order) && !cancelBlock(order, "guest")
        ? t("transactions.row.changedNote")
        : undefined,
  };
}
