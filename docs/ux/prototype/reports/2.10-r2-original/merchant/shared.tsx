import type { TourBlock } from "./lib/transitions";
import type { DeparturePhase } from "./lib/work";
import type { TourParticipants } from "../types";
import type { StatusTone } from "@/components/status-chip";
import type { MessageKey } from "@/i18n/en";

import { useLocale } from "@/contexts/locale-context";
import { formatMoney } from "@/lib/format";

export function useTourFormatting() {
  const { intlLocale } = useLocale();
  const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, {
      ...options,
      timeZone: "Europe/Zurich",
    }).format(new Date(iso));

  return {
    money: (amount: number) => formatMoney(amount / 100, intlLocale),
    date: (iso: string) =>
      format(iso, { dateStyle: "medium", timeStyle: "short" }),
    weekday: (iso: string) => format(iso, { weekday: "short" }),
    dayMonth: (iso: string) => format(iso, { day: "numeric", month: "short" }),
    time: (iso: string) => format(iso, { timeStyle: "short" }),
  };
}

const activityKeys: Record<string, MessageKey> = {
  created: "tourMerchant.eventCreated",
  expired: "tourMerchant.eventExpired",
  delivered: "tourMerchant.eventDelivered",
  completed: "tourMerchant.eventCompleted",
  no_show: "tourMerchant.eventNoShow",
  "payment-succeeded": "tourMerchant.eventPayment",
  "payment-processing": "tourMerchant.eventProcessing",
  "payment-failed": "tourMerchant.eventFailed",
  "payment-late-succeeded": "tourBooking.event.payment-late-succeeded",
  "payment-late-failed": "tourBooking.event.payment-late-failed",
  "session-closed": "tourBooking.event.session-closed",
  cancelled: "tourMerchant.eventCancelled",
  "cancelled-overdue": "tourMerchant.eventCancelledOverdue",
  "departure-cancelled": "tourMerchant.eventDepartureCancelled",
};

export function activityKey(event: string): MessageKey {
  return activityKeys[event] ?? "tourMerchant.eventUpdated";
}

export function actorKey(actor: string): MessageKey {
  switch (actor) {
    case "owner":
      return "tourMerchant.actorOwner";
    case "manager":
      return "tourMerchant.actorManager";
    case "guest":
      return "tourMerchant.actorGuest";
    case "provider":
      return "tourMerchant.actorProvider";
    default:
      return "tourMerchant.actorSystem";
  }
}

export const phaseChip: Record<
  DeparturePhase,
  { key: MessageKey; tone: StatusTone }
> = {
  cancelled: { key: "tourMerchant.phase.cancelled", tone: "neutral" },
  ended: { key: "tourMerchant.phase.ended", tone: "info" },
  closed: { key: "tourMerchant.phase.closed", tone: "neutral" },
  open: { key: "tourMerchant.phase.open", tone: "success" },
};

/** Why a merchant action is not available, as one sentence. */
export function useBlockText() {
  const { t } = useLocale();
  const { money, date } = useTourFormatting();

  return (block: TourBlock): string => {
    switch (block.code) {
      case "staff-only":
        return t("tourMerchant.staffOnly");
      case "invalid-amount":
        return t("tourMerchant.invalidAmount");
      case "above-balance":
        return t("tourMerchant.aboveBalance", {
          balance: money(block.balance),
        });
      case "future-time":
        return t("recordPayment.timeFuture");
      case "duplicate":
        return t("order.block.duplicate", {
          amount: money(block.amount),
          at: date(block.at),
        });
      case "not-ended":
        return t("tourMerchant.afterEnd");
      case "not-delivered":
        return t("tourMerchant.lock.notDelivered");
      case "balance-owed":
        return t("tourMerchant.lock.owed", { balance: money(block.balance) });
      default:
        return t("tourMerchant.failed");
    }
  };
}

/** "Adults 2 · Children 1 · Infants 0": label first, so no plural forms are needed. */
export function GroupText({
  group,
  className = "text-sm",
}: {
  group: TourParticipants;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <p className={className}>
      {t("tourMerchant.participants", {
        adults: group.adults,
        children: group.children,
        infants: group.infants,
      })}
    </p>
  );
}
