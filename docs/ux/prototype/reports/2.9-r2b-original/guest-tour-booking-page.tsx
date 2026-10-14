import type { TourBooking } from "../types";
import type { MessageKey } from "@/i18n/en";

import { Alert, Button, buttonVariants } from "@heroui/react";
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
import { StateHeadline } from "@/components/state-headline";
import { StatusChip } from "@/components/status-chip";
import { SurfaceCard, SurfaceCardBlock } from "@/components/surface-card";
import { TimelineSteps } from "@/components/timeline-steps";
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
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton
          label={t("account.section.bookings")}
          onPress={() =>
            void navigate({ to: "/account", search: { tab: "bookings" } })
          }
        />
        <h1 className="text-[17px] font-semibold">{t("tourBooking.detail")}</h1>
      </header>
      <div className="flex flex-col gap-8 px-4 pt-2 pb-12">
        <div className="flex flex-col gap-3">
          <SurfaceCard>
            <SurfaceCardBlock>
              <BookingStatusLabels booking={booking} />
            </SurfaceCardBlock>
            <BookingSummary booking={booking} />
          </SurfaceCard>
          <HoldNotice booking={booking} now={now} />
          <ExpiredNotice booking={booking} />
          <ReconciliationNotice booking={booking} />
          {booking.status === "no_show" && (
            <Alert className="w-full" status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{t("tourBooking.noShow")}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <BookingMoney booking={booking} now={now} />
          <BookingActions booking={booking} />
        </div>
        <SurfaceCard>
          <SurfaceCardBlock>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{t("tourBooking.paymentPolicy")}</h2>
              <p className="text-sm">
                {t(`tourBooking.policyAt.${booking.policy}`, {
                  date: date(booking.balanceDueAt),
                })}
              </p>
            </div>
          </SurfaceCardBlock>
          <SurfaceCardBlock>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{t("tourBooking.policy")}</h2>
              <p className="text-sm" lang={cancellation.language}>
                {cancellation.text}
              </p>
            </div>
          </SurfaceCardBlock>
        </SurfaceCard>
        <section className="flex flex-col gap-3">
          <h2 className="text-heading">{t("tourBooking.paymentHistory")}</h2>
          {booking.payments.length ? (
            <SurfaceCard>
              <ul className="flex flex-col divide-y divide-separator">
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
            </SurfaceCard>
          ) : (
            <p className="text-sm text-muted">{t("tourBooking.noPayments")}</p>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-heading">{t("tourBooking.timeline")}</h2>
          {/* Seeded bookings have no logged events; no empty card. */}
          {booking.activity.length > 0 && (
            <TimelineSteps
              label={t("tourBooking.timeline")}
              steps={booking.activity.map((event) => ({
                text: t(activityKeys[event.event] ?? "tourBooking.event.other"),
                time: date(event.at),
              }))}
            />
          )}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-heading">{t("tourBooking.contactOrganiser")}</h2>
          <p className="text-sm text-muted">
            {t("tourBooking.contactBody", { ref: booking.ref })}
          </p>
          <div className="flex gap-2">
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

/** C16 and C13: the price lines, then the amounts and, while money is owed, the balance deadline. */
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
  const owing =
    balance > 0 && !["expired", "cancelled"].includes(booking.status);
  const overdue = owing && Date.parse(booking.balanceDueAt) < now.getTime();
  const deadline = t("tourBooking.deadline", {
    date: date(booking.balanceDueAt),
  });
  const lines = [
    { kind: "adults", count: booking.adults, price: booking.adultPrice },
    { kind: "children", count: booking.children, price: booking.childPrice },
    { kind: "infants", count: booking.infants, price: booking.infantPrice },
  ] as const;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading">{t("tourBooking.total")}</h2>
      <SurfaceCard>
        <SurfaceCardBlock>
          <dl className="flex flex-col gap-1.5">
            {lines
              .filter((line) => line.kind === "adults" || line.count > 0)
              .map((line) => (
                <div
                  key={line.kind}
                  className="flex justify-between gap-3 text-sm tabular-nums"
                >
                  <dt className="text-muted">
                    {t(`tourBooking.${line.kind}`, {
                      count: line.count,
                      price: money(line.price),
                    })}
                  </dt>
                  <dd>{money(line.count * line.price)}</dd>
                </div>
              ))}
          </dl>
        </SurfaceCardBlock>
        {/* An expired hold owes nothing; money after expiry shows in its own notice. */}
        <SurfaceCardBlock>
          <dl className="flex flex-col gap-1.5">
            {[
              { label: t("tourBooking.total"), value: booking.total },
              ...(booking.status === "expired"
                ? []
                : [
                    {
                      label: t("tourBooking.paid"),
                      value: bookingPaid(booking),
                    },
                    {
                      label: t("tourBooking.balance"),
                      value: balance,
                      strong: true,
                    },
                  ]),
            ].map((row) => (
              <div
                key={row.label}
                className={`flex justify-between gap-3 tabular-nums ${"strong" in row ? "font-semibold" : "text-sm"}`}
              >
                <dt className={"strong" in row ? "" : "text-muted"}>
                  {row.label}
                </dt>
                <dd>{money(row.value)}</dd>
              </div>
            ))}
          </dl>
        </SurfaceCardBlock>
        {owing &&
          (booking.status === "pending_payment" ? (
            // During the 15-minute hold the timer is the deadline that matters; this stays quiet.
            <SurfaceCardBlock>
              <p className="text-sm">{deadline}</p>
              {overdue && (
                <p className="text-sm text-warning-soft-foreground">
                  {t("tourBooking.overdue")}
                </p>
              )}
            </SurfaceCardBlock>
          ) : (
            <SurfaceCardBlock>
              <StateHeadline
                body={overdue ? t("tourBooking.overdue") : undefined}
                status={overdue ? "danger" : "warning"}
                title={deadline}
              />
            </SurfaceCardBlock>
          ))}
      </SurfaceCard>
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

/** One payment as on gift C15: amount and time, the late result's arrival, then its status. */
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
    <li className="flex flex-col items-start gap-2 p-5">
      <div className="flex w-full flex-col">
        <div className="flex w-full items-baseline justify-between gap-3">
          <span className="font-semibold tabular-nums">
            {money(payment.amount)}
          </span>
          <span className="text-sm text-muted tabular-nums">
            {payment.status === "succeeded"
              ? t("tourBooking.payment.paidAt", { date: date(payment.at) })
              : date(payment.at)}
          </span>
        </div>
        {late && (
          <span className="text-end text-sm text-muted tabular-nums">
            {t("tourBooking.payment.receivedAt", {
              date: date(late.receivedAt),
            })}
          </span>
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
