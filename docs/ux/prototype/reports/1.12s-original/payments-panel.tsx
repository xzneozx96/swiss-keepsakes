import type { Order } from "@/features/orders/types";

import { Link } from "@tanstack/react-router";

import { useAccountPayments } from "../hooks/use-account-payments";

import { ChevronRightIcon, InfoIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { useTransactionRow } from "@/features/transactions/hooks/use-transaction-row";

const rowLink =
  "-mx-2 flex items-center gap-3 rounded-2xl px-2 py-4 outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]";

/**
 * Payment info: what is due now, every payment made, and saved methods. Saved methods are a
 * placeholder: the PRD asks for no stored card or card guarantee and no provider is chosen yet.
 */
export function PaymentsPanel() {
  const { t } = useLocale();
  const { due, history } = useAccountPayments();

  return (
    <div className="flex flex-col gap-8">
      {due.length > 0 && (
        <section aria-labelledby="pay-due" className="flex flex-col gap-1">
          <h2 className="text-heading" id="pay-due">
            {t("account.payments.due.title")}
          </h2>
          <ul className="flex flex-col divide-y divide-separator">
            {due.map((order) => (
              <DueRow key={order.id} order={order} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="pay-history" className="flex flex-col gap-1">
        <h2 className="text-heading" id="pay-history">
          {t("account.payments.history.title")}
        </h2>
        {history.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            {t("account.payments.history.none")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-separator">
            {history.map((p) => (
              <li key={p.id}>
                <Link
                  className={rowLink}
                  params={{ orderId: p.orderId }}
                  search={{ tab: "payments" }}
                  to="/account/orders/$orderId"
                >
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                    <div className="flex w-full items-baseline justify-between gap-3">
                      <span className="truncate font-medium">{p.order}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {p.amount}
                      </span>
                    </div>
                    <span className="text-sm text-muted tabular-nums">
                      {p.meta}
                    </span>
                    <StatusChip tone={p.status.tone}>
                      {p.status.text}
                    </StatusChip>
                  </div>
                  <ChevronRightIcon
                    aria-hidden
                    className="shrink-0 text-muted"
                    size={20}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pay-saved" className="flex flex-col gap-3">
        <h2 className="text-heading" id="pay-saved">
          {t("account.payments.saved.title")}
        </h2>
        <div className="flex gap-3 rounded-2xl border border-dashed border-separator p-4">
          <InfoIcon
            aria-hidden
            className="mt-0.5 shrink-0 text-muted"
            size={20}
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {t("account.payments.saved.notInPrototype")}
            </p>
            <p className="text-sm text-muted">
              {t("account.payments.saved.body")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/** An open order with money due now: the gift, its payment label from T0, and a way to C15. */
function DueRow({ order }: { order: Order }) {
  const row = useTransactionRow(order);

  return (
    <li>
      <Link
        className={rowLink}
        params={{ orderId: row.id }}
        to="/account/orders/$orderId"
      >
        <Media
          alt=""
          className="size-12 shrink-0 rounded-xl"
          photo={row.photo}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <span className="line-clamp-1 font-medium">{row.title}</span>
          <span className="text-sm text-muted tabular-nums">{row.ref}</span>
          <StatusChip tone={row.payment.tone}>{row.payment.text}</StatusChip>
        </div>
        <ChevronRightIcon
          aria-hidden
          className="shrink-0 text-muted"
          size={20}
        />
      </Link>
    </li>
  );
}
