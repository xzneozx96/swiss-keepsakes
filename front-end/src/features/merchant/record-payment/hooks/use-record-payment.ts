import type {
  OfflineMethod,
  OfflinePaymentInput,
} from "@/features/orders/lib/transitions";
import type { Order } from "@/features/orders/types";
import type { MessageKey } from "@/i18n/en";
import type { ZonedDateTime } from "@internationalized/date";

import { fromDate, toCalendarDate } from "@internationalized/date";
import { useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { useDemoSelector } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import {
  useBlockText,
  useOrderActions,
} from "@/features/orders/hooks/use-orders";
import { formatOrderDate } from "@/features/orders/lib/format";
import {
  amountPaid,
  balance,
  orderTotal,
} from "@/features/orders/lib/selectors";
import { recordOfflinePaymentBlock } from "@/features/orders/lib/transitions";
import { formatMoney } from "@/lib/format";

export const offlineMethods: OfflineMethod[] = [
  "cash",
  "bank-transfer",
  "other",
];

export const methodLabelKeys: Record<OfflineMethod, MessageKey> = {
  cash: "merchantOrder.method.cash",
  "bank-transfer": "merchantOrder.method.bankTransfer",
  other: "merchantOrder.method.other",
};

const confirmKeys: Record<OfflineMethod, MessageKey> = {
  cash: "recordPayment.confirm.cash",
  "bank-transfer": "recordPayment.confirm.bankTransfer",
  other: "recordPayment.confirm.other",
};

const confirmAgainKeys: Record<OfflineMethod, MessageKey> = {
  cash: "recordPayment.confirmAgain.cash",
  "bank-transfer": "recordPayment.confirmAgain.bankTransfer",
  other: "recordPayment.confirmAgain.other",
};

const ZURICH = "Europe/Zurich";

/**
 * M08 Record payment (spec §4.7, AC08): amount (defaults to the balance), method, time
 * (defaults to the demo now, today only), note. The T0 guard runs on every change, so
 * an amount above the balance blocks at once and a duplicate warns before the tap.
 */
export function useRecordPayment(order: Order) {
  const { t, intlLocale } = useLocale();
  const clockStartedAt = useDemoSelector((s) => s.clockStartedAt);
  const actions = useOrderActions();
  const blockText = useBlockText();
  const owed = balance(order);
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);

  // Fixed when the sheet opens: the latest time the money can have arrived.
  const [openedAt] = useState(() => fromDate(demoNow(clockStartedAt), ZURICH));
  const [amount, setAmount] = useState(owed / 100);
  const [method, setMethod] = useState<OfflineMethod>("cash");
  const [time, setTime] = useState<ZonedDateTime>(openedAt);
  const [note, setNote] = useState("");

  const rappen = Number.isNaN(amount) ? 0 : Math.round(amount * 100);
  const input: OfflinePaymentInput = {
    amount: rappen,
    method,
    at: time.toDate().toISOString(),
    note,
  };
  const block = recordOfflinePaymentBlock(order, input);
  const isDuplicate = block?.code === "duplicate";
  const isFuture = time.compare(openedAt) > 0;
  const amountError =
    block?.code === "above-balance" || block?.code === "invalid-amount"
      ? blockText(block).text
      : undefined;
  const after = money(Math.max(0, owed - rappen));
  const confirmLabel = t(
    (isDuplicate ? confirmAgainKeys : confirmKeys)[method],
    { amount: money(rappen), balance: after },
  );

  /** Records the payment; a shown duplicate warning counts as confirmed. Null when saved. */
  const submit = (): string | null => {
    const failed = actions.recordOfflinePayment(order.id, {
      ...input,
      allowDuplicate: isDuplicate,
    });

    return failed ? blockText(failed).text : null;
  };

  return {
    owed: money(owed),
    total: money(orderTotal(order)),
    paid: money(amountPaid(order)),
    amount,
    setAmount,
    amountError,
    duplicateWarning: isDuplicate ? blockText(block).text : undefined,
    method,
    setMethod,
    time,
    setTime,
    maxTime: openedAt,
    today: formatOrderDate(toCalendarDate(openedAt).toString(), intlLocale),
    note,
    setNote,
    canSubmit: (!block || isDuplicate) && !isFuture,
    confirmLabel,
    recordedText: t("recordPayment.recorded", {
      amount: money(rappen),
      balance: after,
    }),
    submit,
  };
}
