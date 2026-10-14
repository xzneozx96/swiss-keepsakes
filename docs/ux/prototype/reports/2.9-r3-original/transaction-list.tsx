import type { Order } from "@/features/orders/types";

import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { isClosedOrder, useTransactionRow } from "../hooks/use-transaction-row";

import { DateTile } from "@/components/date-tile";
import { EmptyState } from "@/components/empty-state";
import { ChevronRightIcon, OrdersIcon, PickupIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { ProposalMark } from "@/features/demo/components/proposal-mark";
import { useGuestOrders } from "@/features/orders/hooks/use-orders";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

/**
 * C14 My orders, the Orders tab of the account hub (1.12r). Open orders come first as pickup
 * tickets, soonest pickup on top; closed orders follow as quieter rows, newest first. Every
 * order opens C15.
 */
export function TransactionList() {
  const { t } = useLocale();
  const isLoading = useSimulatedLoading();
  const orders = useGuestOrders();
  const open = orders
    .filter((o) => !isClosedOrder(o))
    .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
  const past = orders.filter(isClosedOrder);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        action={{ label: t("transactions.empty.action"), to: "/" }}
        icon={OrdersIcon}
        message={t("transactions.empty.message")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {open.length > 0 && (
        <section aria-labelledby="orders-open" className="flex flex-col gap-3">
          <h2 className="text-heading" id="orders-open">
            {t("transactions.open.title")}
          </h2>
          <ul className="flex flex-col gap-3">
            {open.map((order) => (
              <OrderTicket key={order.id} order={order} />
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section aria-labelledby="orders-past" className="flex flex-col gap-1">
          <h2 className="text-heading" id="orders-past">
            {t("transactions.past.title")}
          </h2>
          <ul className="flex flex-col divide-y divide-separator">
            {past.map((order) => (
              <PastRow key={order.id} order={order} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Open order: the C15 pickup ticket in small (date tile, gift, place, then both labels). */
function OrderTicket({ order }: { order: Order }) {
  const { t } = useLocale();
  const row = useTransactionRow(order);

  return (
    <li>
      <Link
        className="flex flex-col overflow-hidden rounded-2xl border border-separator bg-surface outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]"
        params={{ orderId: row.id }}
        to="/account/orders/$orderId"
      >
        <div className="flex items-center gap-4 p-4">
          <DateTile date={row.pickupDay} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="line-clamp-2 font-serif text-card-title">
              {row.title}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
              <PickupIcon aria-hidden className="shrink-0" size={16} />
              <span className="truncate">{row.place}</span>
            </span>
          </div>
          <Media
            alt=""
            className="size-14 shrink-0 rounded-xl"
            photo={row.photo}
          />
        </div>
        <div className="flex flex-col items-start gap-3 border-t border-dashed border-separator p-4">
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={row.progress.tone}>
              {row.progress.text}
            </StatusChip>
            <StatusChip tone={row.payment.tone}>{row.payment.text}</StatusChip>
          </div>
          {row.changedNote && (
            <ProposalMark name={t("transactions.proposal.freeCancel")}>
              <p className="text-sm text-muted">{row.changedNote}</p>
            </ProposalMark>
          )}
          <div className="flex w-full items-center gap-3 text-sm">
            <span className="flex-1 text-muted tabular-nums">{row.ref}</span>
            <span className="font-semibold tabular-nums">{row.amount}</span>
            <ChevronRightIcon
              aria-hidden
              className="-me-1 shrink-0 text-muted"
              size={20}
            />
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Closed order: one quiet row with both labels, so the history stays scannable. */
function PastRow({ order }: { order: Order }) {
  const row = useTransactionRow(order);

  return (
    <li>
      <Link
        className="-mx-2 flex gap-3 rounded-2xl px-2 py-4 outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]"
        params={{ orderId: row.id }}
        to="/account/orders/$orderId"
      >
        <Media
          alt=""
          className="size-14 shrink-0 rounded-xl"
          photo={row.photo}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <div className="flex w-full flex-col">
            <div className="flex w-full items-start justify-between gap-3">
              <span className="line-clamp-2 font-medium">{row.title}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {row.amount}
              </span>
            </div>
            <span className="text-sm text-muted tabular-nums">{row.meta}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={row.progress.tone}>
              {row.progress.text}
            </StatusChip>
            <StatusChip tone={row.payment.tone}>{row.payment.text}</StatusChip>
          </div>
        </div>
        <ChevronRightIcon
          aria-hidden
          className="shrink-0 self-center text-muted"
          size={20}
        />
      </Link>
    </li>
  );
}
