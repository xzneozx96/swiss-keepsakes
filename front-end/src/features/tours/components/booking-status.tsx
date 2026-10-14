import type { TourBooking } from "../types";
import type { StatusTone } from "@/components/status-chip";

import { balanceOverdue, bookingBalance, bookingPaid } from "../lib/selectors";

import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { useDemoNow } from "@/features/demo";

const tones: Record<TourBooking["status"], StatusTone> = {
  pending_payment: "warning",
  confirmed: "success",
  expired: "danger",
  delivered: "info",
  completed: "success",
  no_show: "danger",
  cancelled: "neutral",
};

export interface BookingLabel {
  text: string;
  tone: StatusTone;
}

/**
 * The booking label and the payment label of a tour booking, as text and tone. Chips use them
 * (BookingStatusLabels); the M06 ticket shows them as a dot line and a footer row, as M03 does.
 */
export function useBookingLabels(booking: TourBooking): {
  status: BookingLabel;
  payment: BookingLabel;
} {
  const { t } = useLocale();
  // Balance deadline passed with money owed (R07, step 2.14); the policy decides what follows.
  const overdue = balanceOverdue(booking, useDemoNow()) !== null;
  const received = bookingPaid(booking);
  const processing = booking.payments.some((p) => p.status === "processing");
  const exception = booking.status === "expired" && received > 0;
  const paid = bookingBalance(booking) === 0;
  // An expired hold owes nothing; its open payment's session was closed at the deadline (2.7).
  const lapsed = booking.status === "expired" && !exception;
  // A cancelled booking owes nothing more; only say whether money was kept.
  const cancelled = booking.status === "cancelled";
  const key = exception
    ? "tours.payment.exception"
    : cancelled
      ? received
        ? "tours.payment.closed"
        : "tours.payment.none"
      : lapsed
        ? processing
          ? "tours.payment.sessionClosed"
          : "tours.payment.none"
        : processing
          ? "tours.payment.processing"
          : overdue
            ? "tours.payment.overdue"
            : paid
              ? "tours.payment.paid"
              : received
                ? "tours.payment.deposit"
                : "tours.payment.unpaid";

  return {
    status: {
      text: t(`tours.status.${booking.status}`),
      tone: tones[booking.status],
    },
    payment: {
      text: t(key),
      // Money after expiry is warning, as gift C15's reconciliation note (coordinator D3).
      tone: exception
        ? "warning"
        : lapsed || cancelled
          ? "neutral"
          : processing
            ? "info"
            : overdue
              ? "danger"
              : paid
                ? "success"
                : "warning",
    },
  };
}

export function BookingStatusLabels({ booking }: { booking: TourBooking }) {
  const { status, payment } = useBookingLabels(booking);

  return (
    <div className="flex flex-wrap gap-2">
      <StatusChip tone={status.tone}>{status.text}</StatusChip>
      <StatusChip tone={payment.tone}>{payment.text}</StatusChip>
    </div>
  );
}
