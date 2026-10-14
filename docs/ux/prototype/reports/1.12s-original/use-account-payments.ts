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
  amount: string;
  /** "SK-1012 · Chocolate set". */
  order: string;
  /** "Cash · 09.10.2026, 16:20". */
  meta: string;
  status: ShownLabel;
}

/**
 * Payment info on the account hub: open orders with money due now, and every payment the
 * guest made or the shop recorded, newest first. The PRD stores no cards, so there is no
 * saved-method data to read.
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

  const history: (AccountPaymentRow & { at: string })[] = orders.flatMap(
    (order) =>
      order.payments.map((p) => ({
        id: p.id,
        at: p.at,
        orderId: order.id,
        amount: formatMoney(p.amount / 100, intlLocale),
        order: `${order.ref} · ${pickText(order.lines[0].productName, language).text}`,
        meta: `${t(methodKey[p.method])} · ${formatOrderDateTime(p.at, intlLocale)}`,
        status: status(order, p),
      })),
  );

  return {
    due: orders.filter((o) => !isClosedOrder(o) && amountDueNow(o) > 0),
    history: history.sort((a, b) => b.at.localeCompare(a.at)),
  };
}
