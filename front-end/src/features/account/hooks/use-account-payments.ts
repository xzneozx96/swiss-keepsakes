import type { MessageKey } from "@/i18n/en";
import type { ShownLabel } from "@/features/orders/hooks/use-orders";
import type { Order, Payment } from "@/features/orders/types";

import { useLocale } from "@/contexts/locale-context";
import { useGuestOrders } from "@/features/orders/hooks/use-orders";
import { formatOrderDateTime } from "@/features/orders/lib/format";
import {
  amountDueNow,
  paymentsAfterCancellation,
} from "@/features/orders/lib/selectors";
import { isClosedOrder } from "@/features/transactions/hooks/use-transaction-row";
import { formatMoney } from "@/lib/format";
import { pickText } from "@/lib/localized";

const methodKey: Record<Payment["method"], MessageKey> = {
  online: "guestOrder.method.online",
  cash: "guestOrder.method.cash",
  "bank-transfer": "guestOrder.method.bankTransfer",
  other: "guestOrder.method.other",
};

export interface AccountPaymentRow {
  id: string;
  orderId: string;
  method: Payment["method"];
  amount: string;
  ref: string;
  gift: string;
  /** "Cash · 09.10.2026, 16:20" (payments keep the full numeric date). */
  meta: string;
  status: ShownLabel;
}

export interface AccountPaymentMonth {
  /** "October 2026" / "Oktober 2026". */
  label: string;
  rows: AccountPaymentRow[];
}

/**
 * Payment info on the account hub: open orders with money due now, and every payment the
 * guest made or the shop recorded, newest first and grouped by month. The PRD stores no
 * cards, so there is no saved-method data to read.
 */
export function useAccountPayments() {
  const { t, language, intlLocale } = useLocale();
  const orders = useGuestOrders();

  const status = (order: Order, p: Payment): ShownLabel =>
    paymentsAfterCancellation(order).includes(p)
      ? { text: t("guestOrder.paymentStatus.late"), tone: "warning" }
      : p.status === "succeeded"
        ? { text: t("guestOrder.paymentStatus.succeeded"), tone: "success" }
        : p.status === "processing"
          ? { text: t("guestOrder.paymentStatus.processing"), tone: "info" }
          : { text: t("guestOrder.paymentStatus.failed"), tone: "danger" };

  const monthLabel = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zurich",
  });

  const months: AccountPaymentMonth[] = [];

  orders
    .flatMap((order) => order.payments.map((p) => ({ order, p })))
    .sort((a, b) => b.p.at.localeCompare(a.p.at))
    .forEach(({ order, p }) => {
      const label = monthLabel.format(new Date(p.at));
      const row: AccountPaymentRow = {
        id: p.id,
        orderId: order.id,
        method: p.method,
        amount: formatMoney(p.amount / 100, intlLocale),
        ref: order.ref,
        gift: pickText(order.lines[0].productName, language).text,
        meta: `${t(methodKey[p.method])} · ${formatOrderDateTime(p.at, intlLocale)}`,
        status: status(order, p),
      };
      const last = months[months.length - 1];

      if (last?.label === label) last.rows.push(row);
      else months.push({ label, rows: [row] });
    });

  return {
    due: orders.filter((o) => !isClosedOrder(o) && amountDueNow(o) > 0),
    months,
  };
}
