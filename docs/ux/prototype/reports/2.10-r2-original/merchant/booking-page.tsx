import type { TourBooking } from "../types";
import type { MessageKey } from "@/i18n/en";

import { Button } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BookingStatusLabels } from "../components/booking-status";
import { useTours } from "../hooks/use-tours";
import {
  balanceOverdue,
  bookingBalance,
  bookingCommission,
  bookingPaid,
} from "../lib/selectors";

import { AttendanceActions } from "./attendance-actions";
import { externalPaymentBlock } from "./lib/transitions";
import { needsReconciliation } from "./lib/work";
import { TourPaymentSheet } from "./payment-sheet";
import {
  GroupText,
  activityKey,
  actorKey,
  useBlockText,
  useTourFormatting,
} from "./shared";
import { useOverdueCheck } from "./use-overdue-check";

import { EmptyState } from "@/components/empty-state";
import {
  AccountIcon,
  BookingsIcon,
  ClockIcon,
  PartnersIcon,
  PayLaterIcon,
  TourIcon,
} from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { ProposalMark } from "@/features/demo/components/proposal-mark";
import {
  ActionPanel,
  DetailCard,
} from "@/features/merchant/order-detail/components/detail-card";
import { partners } from "@/features/partners/seed";
import { pickText } from "@/lib/localized";

function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {items.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1">
          <dt className="text-muted">{fact.label}</dt>
          <dd className="font-medium tabular-nums wrap-anywhere">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const policyKeys: Record<TourBooking["policy"], MessageKey> = {
  full: "tourMerchant.policy.full",
  deposit: "tourMerchant.policy.deposit",
  later: "tourMerchant.policy.later",
};

/** Prices, payment rule and policies as they were when the guest booked. */
function SnapshotCard({ booking }: { booking: TourBooking }) {
  const { t, language } = useLocale();
  const { money, date } = useTourFormatting();
  const lines = [
    ["tourMerchant.price.adults", booking.adults, booking.adultPrice],
    ["tourMerchant.price.children", booking.children, booking.childPrice],
    ["tourMerchant.price.infants", booking.infants, booking.infantPrice],
  ] as const;
  const overdue = booking.overduePolicy;

  return (
    <DetailCard icon={PayLaterIcon} title={t("tourMerchant.snapshot")}>
      <p className="text-xs text-muted">{t("tourMerchant.snapshotHelp")}</p>
      <dl className="flex flex-col gap-2 text-sm">
        {lines
          .filter(([, count]) => count > 0)
          .map(([key, count, price]) => (
            <div key={key} className="flex flex-wrap justify-between gap-2">
              <dt>{t(key, { count, price: money(price) })}</dt>
              <dd className="font-medium tabular-nums">
                {money(count * price)}
              </dd>
            </div>
          ))}
        <div className="flex flex-wrap justify-between gap-2 border-t border-separator pt-2 font-semibold">
          <dt>{t("tourMerchant.total")}</dt>
          <dd className="tabular-nums">{money(booking.total)}</dd>
        </div>
      </dl>
      <Facts
        items={[
          {
            label: t("tourMerchant.paymentPolicy"),
            value: t(policyKeys[booking.policy], {
              amount: money(booking.firstAmount),
              due: date(booking.balanceDueAt),
            }),
          },
          {
            label: t("tourMerchant.overduePolicy"),
            value: !overdue
              ? t("tourMerchant.overdue.merchant")
              : overdue.action === "cancel"
                ? t("tourMerchant.overdue.cancel")
                : t("tourMerchant.overdue.grace", {
                    hours: overdue.graceHours,
                  }),
          },
          {
            label: t("tourMerchant.cancellationPolicy"),
            value: pickText(booking.cancellationPolicy, language).text,
          },
        ]}
      />
    </DetailCard>
  );
}

/** Source and commission in one card, as on M04 (decision 276). */
function CommissionCard({ booking }: { booking: TourBooking }) {
  const { t } = useLocale();
  const { money, date } = useTourFormatting();
  const commission = bookingCommission(booking);
  const partner = partners.find((p) => p.id === booking.partnerId);
  const tone =
    commission.state === "recorded"
      ? "success"
      : commission.state === "estimated"
        ? "info"
        : "neutral";
  const stateKey: Record<typeof commission.state, MessageKey> = {
    none: "tourMerchant.commission.none",
    estimated: "tourMerchant.commission.estimated",
    recorded: "tourMerchant.commission.recorded",
    "not-applicable": "tourMerchant.commission.notApplicable",
  };
  const rate = `${Math.round(commission.rate * 100)}%`;

  return (
    <DetailCard icon={PartnersIcon} title={t("tourMerchant.commissionTitle")}>
      <Facts
        items={[
          {
            label: t("tourMerchant.source"),
            value: partner?.name ?? t("tourMerchant.sourceDirect"),
          },
          ...(partner
            ? [
                {
                  label: t("tourMerchant.commissionAmount"),
                  value: t("tourMerchant.commissionValue", {
                    amount: money(commission.amount),
                    rate,
                    basis: money(commission.basis),
                  }),
                },
              ]
            : []),
        ]}
      />
      <div>
        <StatusChip tone={tone}>{t(stateKey[commission.state])}</StatusChip>
      </div>
      <p className="text-sm text-muted">
        {commission.state === "recorded" && booking.commissionRecordedAt
          ? t("tourMerchant.commissionRecordedAt", {
              date: date(booking.commissionRecordedAt),
            })
          : t(
              commission.state === "none"
                ? "tourMerchant.commissionNoPartner"
                : commission.state === "not-applicable"
                  ? "tourMerchant.commissionNever"
                  : "tourMerchant.commission",
            )}
      </p>
    </DetailCard>
  );
}

/**
 * M07 Merchant booking detail (spec "as M04 for tours"): guest, departure, participants,
 * source, price and policy snapshots, payments, commission and history. Owner and Manager
 * record external payments (M08) and outcomes. Adjustments and refunds are Phase 3.
 */
export function MerchantTourBookingPage({ bookingId }: { bookingId: string }) {
  const { bookings, role, now } = useTours();
  const { t, language } = useLocale();
  const { money, date } = useTourFormatting();
  const blockText = useBlockText();
  const [paymentOpen, setPaymentOpen] = useState(false);

  useOverdueCheck();
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking)
    return (
      <EmptyState
        action={{ label: t("tourMerchant.back"), to: "/store/bookings" }}
        icon={BookingsIcon}
        message={t("tourMerchant.notFound")}
      />
    );
  // A cancelled or expired booking owes nothing more; only what was received matters.
  const closed = booking.status === "cancelled" || booking.status === "expired";
  const balance = closed ? 0 : bookingBalance(booking);
  const payBlock = externalPaymentBlock(
    booking,
    {
      amount: balance,
      method: "cash",
      note: "",
      at: now.toISOString(),
      allowDuplicate: true,
    },
    role,
    now,
  );
  // Nothing owed is not a reason to explain; every other block is.
  const payReason =
    payBlock && balance > 0 && payBlock.code !== "above-balance"
      ? blockText(payBlock)
      : null;
  const overdue = balanceOverdue(booking, now);
  const overdueText =
    overdue &&
    (overdue.stage === "grace"
      ? t("tourMerchant.overdueGrace", {
          date: date(overdue.since),
          until: date(overdue.until),
        })
      : overdue.stage === "cancel"
        ? t("tourMerchant.overdueCancel", { date: date(overdue.since) })
        : t("tourMerchant.overdueMerchant", { date: date(overdue.since) }));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        className="inline-flex min-h-11 w-fit items-center text-sm text-muted underline underline-offset-4"
        params={{ departureId: booking.departureId }}
        to="/store/bookings/departures/$departureId"
      >
        {t("tourMerchant.manifest")}
      </Link>
      <div>
        <h1 className="text-title">{booking.ref}</h1>
        <p className="mt-2 text-lg font-medium">
          {pickText(booking.tourName, language).text}
        </p>
        <p className="mt-1 text-sm text-muted tabular-nums">
          {date(booking.startsAt)}
        </p>
        <div className="mt-3">
          <BookingStatusLabels booking={booking} />
        </div>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] xl:items-start">
        {/* Next step first: on phones it sits under the header, as on M04 (decision 274). */}
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-1">
          <ActionPanel
            eyebrow={t("tourMerchant.money")}
            icon={PayLaterIcon}
            title={
              closed
                ? t("tourMerchant.receivedTitle", {
                    amount: money(bookingPaid(booking)),
                  })
                : balance > 0
                  ? t("tourMerchant.stillOwed", { amount: money(balance) })
                  : t("tours.payment.paid")
            }
            tone={
              closed
                ? "neutral"
                : overdue
                  ? "danger"
                  : balance > 0
                    ? "warning"
                    : "success"
            }
          >
            <dl className="flex flex-col gap-3 text-sm">
              {[
                { label: t("tourMerchant.total"), value: money(booking.total) },
                {
                  label: t("tourMerchant.paid"),
                  value: money(bookingPaid(booking)),
                },
                ...(closed
                  ? []
                  : [
                      {
                        label: t("tourMerchant.balance"),
                        value: money(balance),
                      },
                      {
                        label: t("tourMerchant.due"),
                        value: date(booking.balanceDueAt),
                      },
                    ]),
              ].map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-wrap justify-between gap-2"
                >
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="font-medium tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
            {overdueText && (
              <p className="text-sm font-medium text-danger">{overdueText}</p>
            )}
            {booking.status === "cancelled" && (
              <p className="text-sm text-muted">
                {t("tourMerchant.cancelledMoney")}
              </p>
            )}
            {needsReconciliation(booking) && (
              <p className="text-sm font-medium text-danger">
                {t("tourMerchant.reconcileHelp")}
              </p>
            )}
            {balance > 0 && (
              <Button
                fullWidth
                isDisabled={!!payBlock}
                onPress={() => setPaymentOpen(true)}
              >
                {t("tourMerchant.recordPayment")}
              </Button>
            )}
            {payReason && <p className="text-sm text-muted">{payReason}</p>}
            {booking.status === "confirmed" &&
              balance > 0 &&
              !overdue &&
              Date.parse(booking.balanceDueAt) > now.getTime() && (
                <ProposalMark name="R07 reminders">
                  <p className="text-xs text-muted">
                    {t("tourMerchant.reminderProposal")}
                  </p>
                </ProposalMark>
              )}
          </ActionPanel>
          <DetailCard icon={TourIcon} title={t("tourMerchant.nextStep")}>
            <AttendanceActions detailed booking={booking} />
          </DetailCard>
          <CommissionCard booking={booking} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-1 xl:row-start-1">
          <DetailCard icon={AccountIcon} title={t("tourMerchant.contact")}>
            <p className="font-semibold">{booking.contactName}</p>
            <a
              className="inline-flex min-h-8 w-fit items-center text-sm tabular-nums underline underline-offset-4"
              href={`tel:${booking.phone.replace(/\s/g, "")}`}
            >
              {booking.phone}
            </a>
            <GroupText group={booking} />
            {booking.participantInfo?.length ? (
              <Facts
                items={booking.participantInfo.map((answer) => ({
                  label: pickText(answer.label, language).text,
                  value: answer.value || "—",
                }))}
              />
            ) : (
              booking.childName && (
                <Facts
                  items={[
                    {
                      label: t("tourMerchant.childName"),
                      value: booking.childName,
                    },
                  ]}
                />
              )
            )}
            <p className="text-xs text-muted">
              {t("tourMerchant.infantsNote")}
            </p>
          </DetailCard>
          <DetailCard icon={ClockIcon} title={t("tourMerchant.departure")}>
            <Facts
              items={[
                {
                  label: t("tourMerchant.departure"),
                  value: date(booking.startsAt),
                },
                { label: t("tourMerchant.ends"), value: date(booking.endsAt) },
                {
                  label: t("tourMerchant.meeting"),
                  value: pickText(booking.meetingPoint, language).text,
                },
                {
                  label: t("tourMerchant.bookedAt"),
                  value: date(booking.createdAt),
                },
              ]}
            />
          </DetailCard>
          <SnapshotCard booking={booking} />
          <DetailCard
            icon={PayLaterIcon}
            title={t("tourMerchant.paymentHistory")}
          >
            {booking.payments.length === 0 ? (
              <p className="text-sm text-muted">
                {t("tourMerchant.noPayments")}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {booking.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="border-b border-separator pb-3 last:border-0"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium tabular-nums">
                        {money(payment.amount)}
                      </span>
                      <span className="text-sm">
                        {t(`tourMerchant.${payment.method}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {date(payment.at)} ·{" "}
                      {t(
                        payment.status === "succeeded"
                          ? "tourMerchant.recorded"
                          : payment.status === "processing"
                            ? "payment.processing.title"
                            : "payment.failed.title",
                      )}
                      {payment.recordedBy &&
                        ` · ${t(actorKey(payment.recordedBy))}`}
                    </p>
                    {payment.note && (
                      <p className="mt-2 text-sm wrap-anywhere">
                        {payment.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>
          <DetailCard icon={ClockIcon} title={t("tourMerchant.activity")}>
            {booking.activity.length === 0 && (
              <p className="text-sm text-muted">
                {t("tourMerchant.noActivity")}
              </p>
            )}
            <ol className="flex flex-col gap-4">
              {[...booking.activity].reverse().map((item, index) => (
                <li
                  key={`${item.at}-${index}`}
                  className="border-s-2 border-separator ps-3"
                >
                  <p className="text-sm font-medium">
                    {t(activityKey(item.event))}
                  </p>
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {date(item.at)} · {t(actorKey(item.actor))}
                  </p>
                </li>
              ))}
            </ol>
          </DetailCard>
        </div>
      </div>
      {paymentOpen && (
        <TourPaymentSheet
          booking={booking}
          onClose={() => setPaymentOpen(false)}
        />
      )}
    </div>
  );
}
