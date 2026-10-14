import type { TourBooking } from "../../types";
import type { StatusTone } from "@/components/status-chip";
import type { Guest } from "@/features/orders/types";
import type { ReportRow } from "@/features/partners/report/lib/report";
import type { MessageKey } from "@/i18n/en";

import { bookingCommission } from "../../lib/selectors";

import { commissionLabel } from "@/features/orders/lib/labels";

const statusLabel: Record<
  TourBooking["status"],
  { key: MessageKey; tone: StatusTone }
> = {
  pending_payment: { key: "tours.status.pending_payment", tone: "warning" },
  confirmed: { key: "tours.status.confirmed", tone: "success" },
  expired: { key: "tours.status.expired", tone: "danger" },
  delivered: { key: "tours.status.delivered", tone: "info" },
  completed: { key: "tours.status.completed", tone: "success" },
  no_show: { key: "tours.status.no_show", tone: "danger" },
  cancelled: { key: "tours.status.cancelled", tone: "neutral" },
};

/**
 * A partner's tour bookings for P02 (R15): only bookings that were confirmed. Payment holds
 * and expired holds never became a booking, so the partner does not see them.
 */
export function partnerTourBookings(
  bookings: TourBooking[],
  partnerId: string,
): TourBooking[] {
  return bookings.filter(
    (b) =>
      b.partnerId === partnerId &&
      b.status !== "pending_payment" &&
      b.status !== "expired",
  );
}

/** One P02 row for a tour booking: reference, date, guest name, tour, value, status, commission. */
export function tourReportRow(
  booking: TourBooking,
  guests: Guest[],
): ReportRow {
  const commission = bookingCommission(booking);
  const earns =
    commission.state === "recorded" || commission.state === "estimated";

  return {
    id: booking.id,
    ref: booking.ref,
    createdAt: booking.createdAt,
    guestName:
      guests.find((g) => g.id === booking.guestId)?.name ?? booking.contactName,
    lines: [
      {
        productName: booking.tourName,
        quantity: booking.adults + booking.children + booking.infants,
      },
    ],
    value: booking.total,
    status: statusLabel[booking.status],
    commission: {
      state: commission.state,
      amount: earns ? commission.amount : 0,
      label: commissionLabel(commission.state),
    },
  };
}
