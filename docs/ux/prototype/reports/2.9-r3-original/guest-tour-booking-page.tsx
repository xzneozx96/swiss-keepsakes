import type { TourBooking } from "../types";
import type { IconComponent } from "@/components/icons";
import type { MessageKey } from "@/i18n/en";

import { Alert, Button, buttonVariants } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { TourTicketHead, useBookingFormat } from "./booking-summary";
import { ExpiredHeadline, ReconciliationNotice } from "./expired-notice";
import {
  HoldNotice,
  MissingBooking,
  useOwnedBooking,
} from "./tour-payment-page";

import {
  AccountIcon,
  CallIcon,
  EmailIcon,
  MessageIcon,
  PickupIcon,
  TourIcon,
} from "@/components/icons";
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

/** C16 in gift C15's grammar: a ticket, then notes, money and the reference sections. */
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
          <BookingTicket booking={booking} />
          <HoldNotice booking={booking} now={now} />
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
        <section
          aria-labelledby="booking-total"
          className="flex flex-col gap-3"
        >
          <h2 className="text-heading" id="booking-total">
            {t("tourBooking.total")}
          </h2>
          <BookingMoney ticket booking={booking} now={now} />
        </section>
        <SurfaceCard>
          <SurfaceCardBlock compact>
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{t("tourBooking.paymentPolicy")}</h2>
              <p className="text-sm">
                {t(`tourBooking.policyAt.${booking.policy}`, {
                  date: date(booking.balanceDueAt),
                })}
              </p>
            </div>
          </SurfaceCardBlock>
          <SurfaceCardBlock compact>
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
        {/* As gift C14's empty sections: no heading over nothing (seeded bookings log no events). */}
        {booking.activity.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-heading">{t("tourBooking.timeline")}</h2>
            <TimelineSteps
              label={t("tourBooking.timeline")}
              steps={booking.activity.map((event) => ({
                text: t(activityKeys[event.event] ?? "tourBooking.event.other"),
                time: date(event.at),
              }))}
            />
          </section>
        )}
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

/**
 * The C15 ticket: date tile, tour, time, group and photo with both labels, then the booking's
 * facts and, once the hold has expired, its headline and rebook action, under dashed rules.
 */
function BookingTicket({ booking }: { booking: TourBooking }) {
  const { t, language } = useLocale();
  const meeting = pickText(booking.meetingPoint, language);

  return (
    <SurfaceCard>
      <div className="border-dashed">
        <TourTicketHead booking={booking} size="lg" />
        <div className="px-4 pb-4">
          <BookingStatusLabels booking={booking} />
        </div>
      </div>
      <SurfaceCardBlock compact dashed>
        <dl className="flex flex-col gap-4">
          <Fact icon={TourIcon} label={t("tourBooking.reference")}>
            <span className="font-medium tabular-nums">{booking.ref}</span>
          </Fact>
          <Fact icon={PickupIcon} label={t("tourBooking.meeting")}>
            <span
              className="font-serif text-card-title"
              lang={meeting.language}
            >
              {meeting.text}
            </span>
          </Fact>
          <Fact icon={CallIcon} label={t("tourBooking.contact")}>
            <span>
              {booking.contactName} · {booking.phone}
            </span>
          </Fact>
          {booking.childName && (
            <Fact icon={AccountIcon} label={t("tourBooking.childNameShort")}>
              <span>{booking.childName}</span>
            </Fact>
          )}
          {booking.participantInfo?.map((answer) => {
            const label = pickText(answer.label, language);

            return (
              <Fact
                key={label.text}
                icon={MessageIcon}
                label={label.text}
                lang={label.language}
              >
                <span className="break-words">{answer.value}</span>
              </Fact>
            );
          })}
        </dl>
      </SurfaceCardBlock>
      {booking.status === "expired" && (
        <SurfaceCardBlock compact>
          <ExpiredHeadline booking={booking} />
        </SurfaceCardBlock>
      )}
    </SurfaceCard>
  );
}

/** One fact as on gift C15's pickup card: icon, small muted label, then the value. */
function Fact({
  icon: Icon,
  label,
  lang,
  children,
}: {
  icon: IconComponent;
  label: string;
  lang?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 shrink-0 text-muted" size={20} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted" lang={lang}>
          {label}
        </dt>
        <dd className="flex flex-col gap-0.5">{children}</dd>
      </div>
    </div>
  );
}

/**
 * C16 and C13: the price lines, the amounts and, while money is owed, the balance deadline with
 * the pay action. `ticket` gives C16 the C15 grammar (16px blocks, dashed rules); C13 keeps C07's.
 */
export function BookingMoney({
  booking,
  now,
  ticket = false,
}: {
  booking: TourBooking;
  now: Date;
  ticket?: boolean;
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
    <SurfaceCard>
      <SurfaceCardBlock compact={ticket} dashed={ticket}>
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
      <SurfaceCardBlock compact={ticket} dashed={ticket}>
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
      {owing && (
        // As the C15 ticket: the deadline's headline, then the pay action under it.
        <SurfaceCardBlock compact={ticket}>
          <div className="flex flex-col gap-4">
            {booking.status === "pending_payment" ? (
              // During the 15-minute hold the timer is the deadline that matters; this stays quiet.
              <div className="flex flex-col gap-1">
                <p className="text-sm">{deadline}</p>
                {overdue && (
                  <p className="text-sm text-warning-soft-foreground">
                    {t("tourBooking.overdue")}
                  </p>
                )}
              </div>
            ) : (
              <StateHeadline
                body={overdue ? t("tourBooking.overdue") : undefined}
                status={overdue ? "danger" : "warning"}
                title={deadline}
              />
            )}
            <PayAction booking={booking} />
          </div>
        </SurfaceCardBlock>
      )}
    </SurfaceCard>
  );
}

/** Finish the first payment or pay the balance through C12; none on closed bookings. */
function PayAction({ booking }: { booking: TourBooking }) {
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
    <div className="flex w-full flex-col gap-2">
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
    </div>
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
    <li className="flex flex-col items-start gap-2 p-4">
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
      {/* Tones as gift C15's payment rows: late money warning (D3), processing info. */}
      <StatusChip
        tone={
          exception
            ? "warning"
            : payment.status === "succeeded"
              ? "success"
              : payment.status === "failed"
                ? "danger"
                : "info"
        }
      >
        {t(label)}
      </StatusChip>
    </li>
  );
}
