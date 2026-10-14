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

export function BookingStatusLabels({ booking }: { booking: TourBooking }) {
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

  return (
    <div className="flex flex-wrap gap-2">
      <StatusChip tone={tones[booking.status]}>
        {t(`tours.status.${booking.status}`)}
      </StatusChip>
      <StatusChip
        tone={
          exception
            ? "danger"
            : lapsed || cancelled
              ? "neutral"
              : processing
                ? "info"
                : overdue
                  ? "danger"
                  : paid
                    ? "success"
                    : "warning"
        }
      >
        {t(key)}
      </StatusChip>
    </div>
  );
}
