import type { TourBooking } from "../types";
import type { MessageKey } from "@/i18n/en";

import { Button, buttonVariants } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { BookingSummary, useBookingFormat } from "./booking-summary";
import { ExpiredNotice, ReconciliationNotice } from "./expired-notice";
import {
  HoldNotice,
  MissingBooking,
  useOwnedBooking,
} from "./tour-payment-page";

import { CallIcon, EmailIcon } from "@/components/icons";
import { BackButton } from "@/components/layout/cart-button";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { shop } from "@/features/catalog/seed";
import { BookingStatusLabels } from "@/features/tours/components/booking-status";
import { bookingBalance, bookingPaid } from "@/features/tours/lib/selectors";
import { TourBookingReview } from "@/features/tours/reviews";
import { pickText } from "@/lib/localized";

const activityKeys: Record<string, MessageKey> = {
  created: "tourBooking.event.created",
  expired: "tourBooking.event.expired",
  "session-closed": "tourBooking.event.session-closed",
  "payment-late-succeeded": "tourBooking.event.payment-late-succeeded",
  "payment-late-failed": "tourBooking.event.payment-late-failed",
  "payment-succeeded": "tourBooking.event.payment-succeeded",
  "payment-failed": "tourBooking.event.payment-failed",
  "payment-processing": "tourBooking.event.payment-processing",
  delivered: "tourBooking.event.delivered",
  no_show: "tourBooking.event.no_show",
  completed: "tourBooking.event.completed",
};

export function GuestTourBookingPage({ bookingId }: { bookingId: string }) {
  const { booking, now } = useOwnedBooking(bookingId);
  const { t, language } = useLocale();
  const { date } = useBookingFormat();
  const navigate = useNavigate();

  if (!booking) return <MissingBooking />;
  const cancellation = pickText(booking.cancellationPolicy, language);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 ps-4 pe-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton
          label={t("account.section.bookings")}
          onPress={() =>
            void navigate({ to: "/account", search: { tab: "bookings" } })
          }
        />
        <h1 className="font-serif text-title">{t("tourBooking.detail")}</h1>
      </header>
      <div className="flex flex-col gap-6 px-5 pt-4 pb-8">
        <BookingStatusLabels booking={booking} />
        <BookingSummary booking={booking} />
        <HoldNotice booking={booking} now={now} />
        <ExpiredNotice booking={booking} />
        <ReconciliationNotice booking={booking} />
        {booking.status === "no_show" && (
          <p className="rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground">
            {t("tourBooking.noShow")}
          </p>
        )}
        <BookingMoney booking={booking} now={now} />
        <BookingActions booking={booking} />
        <section className="flex flex-col gap-4 border-t border-separator pt-6">
          <div>
            <h2 className="font-serif text-heading">
              {t("tourBooking.paymentPolicy")}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {t(`tourBooking.policyAt.${booking.policy}`, {
                date: date(booking.balanceDueAt),
              })}
            </p>
          </div>
          <div>
            <h2 className="font-serif text-heading">
              {t("tourBooking.policy")}
            </h2>
            <p className="mt-2 text-sm text-muted" lang={cancellation.language}>
              {cancellation.text}
            </p>
          </div>
        </section>
        <section className="border-t border-separator pt-6">
          <h2 className="font-serif text-heading">
            {t("tourBooking.paymentHistory")}
          </h2>
          {booking.payments.length ? (
            <ul className="mt-3 flex flex-col divide-y divide-separator">
              {booking.payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  late={booking.lateResults?.find(
                    (result) => result.paymentId === payment.id,
                  )}
                  payment={payment}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {t("tourBooking.noPayments")}
            </p>
          )}
        </section>
        <section className="border-t border-separator pt-6">
          <h2 className="font-serif text-heading">
            {t("tourBooking.timeline")}
          </h2>
          <ul className="mt-3 flex flex-col gap-4">
            {booking.activity.map((event, index) => (
              <ActivityRow key={`${event.at}-${index}`} event={event} />
            ))}
          </ul>
        </section>
        <section className="border-t border-separator pt-6">
          <h2 className="font-serif text-heading">
            {t("tourBooking.contactOrganiser")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t("tourBooking.contactBody", { ref: booking.ref })}
          </p>
          <div className="mt-4 flex gap-2">
            <a
              className={`${buttonVariants({ variant: "tertiary" })} flex-1`}
              href={`mailto:${shop.email}?subject=${encodeURIComponent(booking.ref)}`}
            >
              <EmailIcon aria-hidden size={20} />
              {t("guestOrder.contact.email")}
            </a>
            <a
              className={`${buttonVariants({ variant: "tertiary" })} flex-1`}
              href={`tel:${shop.phone.replace(/\s/g, "")}`}
            >
              <CallIcon aria-hidden size={20} />
              {t("guestOrder.contact.call")}
            </a>
          </div>
        </section>
        <TourBookingReview booking={booking} />
      </div>
    </div>
  );
}

export function BookingMoney({
  booking,
  now,
}: {
  booking: TourBooking;
  now: Date;
}) {
  const { t } = useLocale();
  const { money, date } = useBookingFormat();
  const balance = bookingBalance(booking);
  const overdue =
    balance > 0 &&
    Date.parse(booking.balanceDueAt) < now.getTime() &&
    !["expired", "cancelled"].includes(booking.status);

  return (
    <section className="flex flex-col gap-3 border-t border-separator pt-6">
      <h2 className="font-serif text-heading">{t("tourBooking.total")}</h2>
      <dl className="flex flex-col gap-3">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-muted">
            {t("tourBooking.adults", {
              count: booking.adults,
              price: money(booking.adultPrice),
            })}
          </dt>
          <dd className="font-semibold tabular-nums">
            {money(booking.adults * booking.adultPrice)}
          </dd>
        </div>
        {booking.children > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-muted">
              {t("tourBooking.children", {
                count: booking.children,
                price: money(booking.childPrice),
              })}
            </dt>
            <dd className="font-semibold tabular-nums">
              {money(booking.children * booking.childPrice)}
            </dd>
          </div>
        )}
        {booking.infants > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-muted">
              {t("tourBooking.infants", {
                count: booking.infants,
                price: money(booking.infantPrice),
              })}
            </dt>
            <dd className="font-semibold tabular-nums">
              {money(booking.infants * booking.infantPrice)}
            </dd>
          </div>
        )}
        {/* An expired hold owes nothing; money after expiry shows in its own notice. */}
        {[
          { label: t("tourBooking.total"), value: booking.total },
          ...(booking.status === "expired"
            ? []
            : [
                { label: t("tourBooking.paid"), value: bookingPaid(booking) },
                { label: t("tourBooking.balance"), value: balance },
              ]),
        ].map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-sm text-muted">{row.label}</dt>
            <dd className="font-semibold tabular-nums">{money(row.value)}</dd>
          </div>
        ))}
      </dl>
      {balance > 0 && !["expired", "cancelled"].includes(booking.status) && (
        <p className="text-sm">
          {t("tourBooking.deadline", { date: date(booking.balanceDueAt) })}
        </p>
      )}
      {overdue && (
        <p className="text-sm text-warning-soft-foreground">
          {t("tourBooking.overdue")}
        </p>
      )}
    </section>
  );
}

export function BookingActions({ booking }: { booking: TourBooking }) {
  const { t } = useLocale();
  const { money } = useBookingFormat();
  const navigate = useNavigate();
  const processing = booking.payments.some(
    (payment) => payment.status === "processing",
  );
  const balance = bookingBalance(booking);

  if (
    ["expired", "cancelled", "completed", "no_show"].includes(booking.status) ||
    balance <= 0
  )
    return null;
  const amount =
    booking.status === "pending_payment"
      ? Math.max(0, booking.firstAmount - bookingPaid(booking))
      : balance;

  return (
    <Button
      fullWidth
      isDisabled={processing}
      size="lg"
      onPress={() =>
        void navigate({
          to: "/account/bookings/$bookingId/pay",
          params: { bookingId: booking.id },
        })
      }
    >
      {t(
        booking.status === "pending_payment"
          ? "tourBooking.finishPayment"
          : "tourBooking.payBalance",
        { amount: money(amount) },
      )}
    </Button>
  );
}

function PaymentRow({
  payment,
  late,
}: {
  payment: TourBooking["payments"][number];
  late?: NonNullable<TourBooking["lateResults"]>[number];
}) {
  const { t } = useLocale();
  const { money, date } = useBookingFormat();
  const exception = late && payment.status === "succeeded";
  const label = exception
    ? "tourBooking.payment.afterExpiry"
    : payment.status === "succeeded"
      ? "tourBooking.event.payment-succeeded"
      : payment.status === "failed"
        ? "tourBooking.event.payment-failed"
        : "tourBooking.event.payment-processing";

  return (
    <li className="flex items-start justify-between gap-3 py-4">
      <div>
        <p className="font-medium tabular-nums">{money(payment.amount)}</p>
        <p className="mt-1 text-xs text-muted">
          {payment.status === "succeeded"
            ? t("tourBooking.payment.paidAt", { date: date(payment.at) })
            : date(payment.at)}
        </p>
        {late && (
          <p className="mt-1 text-xs text-muted">
            {t("tourBooking.payment.receivedAt", {
              date: date(late.receivedAt),
            })}
          </p>
        )}
      </div>
      <StatusChip
        tone={
          exception
            ? "danger"
            : payment.status === "succeeded"
              ? "success"
              : payment.status === "failed"
                ? "danger"
                : "warning"
        }
      >
        {t(label)}
      </StatusChip>
    </li>
  );
}

function ActivityRow({ event }: { event: TourBooking["activity"][number] }) {
  const { t } = useLocale();
  const { date } = useBookingFormat();

  return (
    <li>
      <p className="text-sm font-medium">
        {t(activityKeys[event.event] ?? "tourBooking.event.other")}
      </p>
      <p className="mt-1 text-xs text-muted">{date(event.at)}</p>
    </li>
  );
}
