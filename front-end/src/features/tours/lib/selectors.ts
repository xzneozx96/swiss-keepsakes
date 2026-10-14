import type {
  Departure,
  Tour,
  TourBooking,
  TourData,
  TourParticipants,
  TourPaymentPolicy,
} from "../types";
import type { CommissionState } from "@/features/orders/lib/selectors";

export function participantSeats(group: TourParticipants): number {
  return group.adults + group.children;
}
export function tourTotal(tour: Tour, group: TourParticipants): number {
  return (
    tour.adultPrice * group.adults +
    tour.childPrice * group.children +
    tour.infantPrice * group.infants
  );
}
export function bookingPaid(booking: TourBooking): number {
  return booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount, 0);
}
export function bookingBalance(booking: TourBooking): number {
  return Math.max(0, booking.total - bookingPaid(booking));
}
export function bookingAmountDue(booking: TourBooking): number {
  return booking.status === "pending_payment"
    ? Math.max(0, booking.firstAmount - bookingPaid(booking))
    : bookingBalance(booking);
}
export function availableSeats(
  data: TourData,
  departureId: string,
  now: Date,
): number {
  const departure = data.departures.find((d) => d.id === departureId);

  if (!departure) return 0;
  const held = data.bookings
    .filter(
      (b) =>
        b.departureId === departureId &&
        (b.status === "pending_payment"
          ? Date.parse(b.holdUntil) > now.getTime()
          : !["expired", "cancelled"].includes(b.status)),
    )
    .reduce((sum, b) => sum + participantSeats(b), 0);

  return Math.max(0, departure.capacity - held);
}
/** Amount due when the booking is made: 30% sample deposit, the full total, or nothing. */
export function firstPaymentAmount(
  policy: TourPaymentPolicy,
  total: number,
): number {
  if (policy === "deposit") return Math.round(total * 0.3);

  return policy === "full" ? total : 0;
}
/** Open, not cancelled departures of a tour that have not started yet, soonest first. */
export function upcomingDepartures(
  data: TourData,
  tourId: string,
  now: Date,
): Departure[] {
  return data.departures
    .filter(
      (d) =>
        d.tourId === tourId &&
        !d.closed &&
        !d.cancelledAt &&
        Date.parse(d.startsAt) > now.getTime(),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
/** The soonest upcoming departure that still has a free seat. */
export function nextAvailableDeparture(
  data: TourData,
  tourId: string,
  now: Date,
): Departure | undefined {
  return upcomingDepartures(data, tourId, now).find(
    (d) => availableSeats(data, d.id, now) > 0,
  );
}
/**
 * One departure's seats as guest and merchant both count them (AC05): confirmed bookings
 * (delivered, completed and no-show included), active payment holds, and what is still free.
 */
export function departureSeats(
  data: TourData,
  departureId: string,
  now: Date,
): { confirmed: number; held: number; available: number; capacity: number } {
  const bookings = data.bookings.filter((b) => b.departureId === departureId);
  const seats = (list: TourBooking[]) =>
    list.reduce((sum, b) => sum + participantSeats(b), 0);

  return {
    confirmed: seats(
      bookings.filter(
        (b) => !["pending_payment", "expired", "cancelled"].includes(b.status),
      ),
    ),
    held: seats(
      bookings.filter(
        (b) =>
          b.status === "pending_payment" &&
          Date.parse(b.holdUntil) > now.getTime(),
      ),
    ),
    available: availableSeats(data, departureId, now),
    capacity: data.departures.find((d) => d.id === departureId)?.capacity ?? 0,
  };
}
/**
 * Partner commission of a booking, in the gift states (AC09, AC10, O10): recorded once at
 * completion, never for a no-show, cancellation or expired hold, none without a partner.
 */
export function bookingCommission(booking: TourBooking): {
  state: CommissionState;
  amount: number;
  basis: number;
  rate: number;
} {
  const state: CommissionState = !booking.partnerId
    ? "none"
    : booking.status === "completed" && booking.commissionRecordedAt
      ? "recorded"
      : ["no_show", "cancelled", "expired"].includes(booking.status)
        ? "not-applicable"
        : "estimated";

  return {
    state,
    amount: Math.round(booking.total * booking.commissionRate),
    basis: booking.total,
    rate: booking.commissionRate,
  };
}
export type BalanceOverdue =
  /** The snapshotted policy cancels the booking and releases its seats. */
  | { stage: "cancel"; since: string }
  /** The policy's grace period is still running. */
  | { stage: "grace"; since: string; until: string }
  /** No automatic step: the merchant decides (also after the grace period or the tour start). */
  | { stage: "merchant"; since: string };
/** A confirmed booking past its balance deadline with money still owed (R07, AC27); null otherwise. */
export function balanceOverdue(
  booking: TourBooking,
  now: Date,
): BalanceOverdue | null {
  const since = booking.balanceDueAt;

  if (
    booking.status !== "confirmed" ||
    bookingBalance(booking) === 0 ||
    Date.parse(since) > now.getTime()
  )
    return null;
  const policy = booking.overduePolicy;

  if (
    policy?.action === "cancel" &&
    Date.parse(booking.startsAt) > now.getTime()
  )
    return { stage: "cancel", since };
  if (policy?.action === "grace") {
    const until = new Date(
      Date.parse(since) + policy.graceHours * 3_600_000,
    ).toISOString();

    if (Date.parse(until) > now.getTime())
      return { stage: "grace", since, until };
  }

  return { stage: "merchant", since };
}
/**
 * Money the provider confirmed for a booking whose hold had already expired (2.7, spec §2.2):
 * it never confirms the booking and is shown as a reconciliation exception, guest and merchant.
 */
export function reconciliationPayments(booking: TourBooking) {
  return booking.status === "expired"
    ? booking.payments.filter((p) => p.status === "succeeded")
    : [];
}
export function reconciliationAmount(booking: TourBooking): number {
  return reconciliationPayments(booking).reduce((sum, p) => sum + p.amount, 0);
}
