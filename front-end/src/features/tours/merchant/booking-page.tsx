import type { TourBooking } from "../types";
import type { IconComponent } from "@/components/icons";
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
  OverduePill,
  activityKey,
  actorKey,
  useBlockText,
  useTourFormatting,
} from "./shared";
import { useOverdueCheck } from "./use-overdue-check";

import { EmptyState } from "@/components/empty-state";
import { MerchantBackBar } from "@/components/layout/merchant-back-bar";
import {
  AccountIcon,
  BackIcon,
  BookingsIcon,
  CallIcon,
  ClockIcon,
  CloseIcon,
  InfoIcon,
  PartnersIcon,
  PayLaterIcon,
  StatusDangerIcon,
  StatusSuccessIcon,
  TourIcon,
} from "@/components/icons";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { ProposalMark } from "@/features/demo/components/proposal-mark";
import {
  ActionPanel,
  DetailCard,
} from "@/features/merchant/order-detail/components/detail-card";
import { useIsWide } from "@/hooks/use-is-wide";
import { pickText } from "@/lib/localized";

/**
 * Label/value facts. Short values (contact, departure) are the strong part; `isPolicy` follows
 * M04's PolicyCard instead: the label in medium weight, the policy sentence as plain text.
 */
function Facts({
  items,
  isPolicy = false,
}: {
  items: { label: string; value: string }[];
  isPolicy?: boolean;
}) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {items.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1">
          <dt className={isPolicy ? "font-medium" : "text-muted"}>
            {fact.label}
          </dt>
          <dd
            className={`tabular-nums wrap-anywhere ${isPolicy ? "" : "font-medium"}`}
          >
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
      {/* The M04 payments ledger: one inset panel, the total as its strong row. */}
      <dl className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3 text-sm">
        {lines
          .filter(([, count]) => count > 0)
          .map(([key, count, price]) => (
            <div
              key={key}
              className="flex flex-wrap justify-between gap-x-3 tabular-nums"
            >
              <dt className="text-muted">
                {t(key, { count, price: money(price) })}
              </dt>
              <dd>{money(count * price)}</dd>
            </div>
          ))}
        <div className="flex flex-wrap justify-between gap-x-3 border-t border-separator pt-2 text-base font-semibold tabular-nums">
          <dt>{t("tourMerchant.total")}</dt>
          <dd>{money(booking.total)}</dd>
        </div>
      </dl>
      <Facts
        isPolicy
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
  const partners = useDemo().state.data.partners;
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
        ]}
      />
      <div>
        <StatusChip tone={tone}>{t(stateKey[commission.state])}</StatusChip>
      </div>
      {partner && (
        // The M04 partner card's total row.
        <div className="flex flex-wrap justify-between gap-x-3 border-t border-separator pt-3 font-semibold tabular-nums">
          <span>{t("tourMerchant.commissionAmount")}</span>
          <span>
            {t("tourMerchant.commissionValue", {
              amount: money(commission.amount),
              rate,
              basis: money(commission.basis),
            })}
          </span>
        </div>
      )}
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

const eventIcon: Record<string, IconComponent> = {
  created: BookingsIcon,
  expired: ClockIcon,
  "session-closed": ClockIcon,
  delivered: StatusSuccessIcon,
  completed: StatusSuccessIcon,
  no_show: CloseIcon,
  cancelled: CloseIcon,
  "cancelled-overdue": CloseIcon,
  "departure-cancelled": CloseIcon,
};

const eventTone: Record<string, "success" | "danger"> = {
  delivered: "success",
  completed: "success",
  "payment-succeeded": "success",
  "payment-late-succeeded": "success",
  no_show: "danger",
  cancelled: "danger",
  "cancelled-overdue": "danger",
  "departure-cancelled": "danger",
  "payment-failed": "danger",
  "payment-late-failed": "danger",
};

const ringClass = {
  neutral: "bg-surface-secondary text-muted",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

/** Booking history as the M04 order log timeline, newest first: what happened, when, who. */
function HistoryCard({ booking }: { booking: TourBooking }) {
  const { t } = useLocale();
  const { date } = useTourFormatting();
  const rows = [...booking.activity].reverse();

  return (
    <DetailCard icon={ClockIcon} title={t("tourMerchant.activity")}>
      {rows.length === 0 && (
        <p className="text-sm text-muted">{t("tourMerchant.noActivity")}</p>
      )}
      <ol className="text-sm">
        {rows.map((item, index) => {
          const Icon =
            eventIcon[item.event] ??
            (item.event.startsWith("payment") ? PayLaterIcon : ClockIcon);

          return (
            <li
              key={`${item.at}-${index}`}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {index < rows.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-10 bottom-1 left-[15px] w-0.5 rounded-full bg-separator"
                />
              )}
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full ${ringClass[eventTone[item.event] ?? "neutral"]}`}
              >
                <Icon aria-hidden size={16} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
                <p className="font-medium">{t(activityKey(item.event))}</p>
                <p className="text-xs text-muted tabular-nums">
                  {date(item.at)} · {t(actorKey(item.actor))}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
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
  const isWide = useIsWide();

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

  const paid = bookingPaid(booking);
  const facts = [
    {
      label: t("tourMerchant.total"),
      value: money(booking.total),
      icon: TourIcon,
    },
    {
      label: t("tourMerchant.paid"),
      value: money(paid),
      icon: StatusSuccessIcon,
    },
    ...(closed
      ? []
      : [
          {
            label: t("tourMerchant.balance"),
            value: money(balance),
            icon: PayLaterIcon,
          },
          {
            label: t("tourMerchant.due"),
            value: date(booking.balanceDueAt),
            icon: ClockIcon,
          },
        ]),
  ];
  const moneyPanel = (
    <div className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-3">
      <PayLaterIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted">
          {/* Settled or closed: what was received (the band title already says paid in full). */}
          {t(balance > 0 ? "fulfilment.money.owed" : "tourMerchant.paid")}
        </span>
        <span className="text-lg leading-tight font-semibold tabular-nums">
          {money(balance > 0 ? balance : paid)}
        </span>
        {!closed && balance > 0 && (
          <span className="text-xs text-muted tabular-nums">
            {t("fulfilment.money.paid", {
              paid: money(paid),
              total: money(booking.total),
            })}
          </span>
        )}
      </div>
    </div>
  );
  const moneyCard = (
    <ActionPanel
      eyebrow={t("tourMerchant.money")}
      icon={PayLaterIcon}
      title={
        closed
          ? t("tourMerchant.receivedTitle", { amount: money(paid) })
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
      {moneyPanel}
      {overdueText && (
        // The overdue state in the M04 decision-block look: a muted header row with its icon
        // and the danger pill, then the explanation in muted text.
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3">
          <span className="flex items-center gap-3 text-xs text-muted">
            <StatusDangerIcon aria-hidden className="shrink-0" size={18} />
            <OverduePill hasIcon={false}>
              {t("tours.payment.overdue")}
            </OverduePill>
          </span>
          <p className="ps-[30px] text-sm text-muted">{overdueText}</p>
        </div>
      )}
      {booking.status === "cancelled" && (
        <p className="flex items-start gap-2 text-sm text-muted">
          <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t("tourMerchant.cancelledMoney")}
        </p>
      )}
      {needsReconciliation(booking) && (
        <p className="flex items-start gap-2 text-sm font-medium text-danger">
          <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t("tourMerchant.reconcileHelp")}
        </p>
      )}
      {balance > 0 && (
        <Button
          fullWidth
          className="h-12 text-base"
          isDisabled={!!payBlock}
          size="lg"
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
  );
  const nextStep = (
    <DetailCard icon={TourIcon} title={t("tourMerchant.nextStep")}>
      <AttendanceActions detailed booking={booking} />
    </DetailCard>
  );
  const contact = (
    <DetailCard icon={AccountIcon} title={t("tourMerchant.contact")}>
      <p className="font-semibold">{booking.contactName}</p>
      {/* The M04 contact inset (guest email). */}
      <div className="flex items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3">
        <CallIcon aria-hidden className="shrink-0 text-muted" size={18} />
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">{t("tourBooking.phone")}</span>
          <a
            className="inline-flex min-h-8 w-fit items-center font-medium tabular-nums underline underline-offset-4"
            href={`tel:${booking.phone.replace(/\s/g, "")}`}
          >
            {booking.phone}
          </a>
        </div>
      </div>
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
      <p className="text-xs text-muted">{t("tourMerchant.infantsNote")}</p>
    </DetailCard>
  );
  const departure = (
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
  );
  const payments = (
    <DetailCard icon={PayLaterIcon} title={t("tourMerchant.paymentHistory")}>
      {booking.payments.length === 0 ? (
        <p className="text-sm text-muted">{t("tourMerchant.noPayments")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-separator">
          {booking.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
            >
              {/* M04 payment rows: amount and status chip, then method · time · who. */}
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <span className="font-semibold tabular-nums">
                  {money(payment.amount)}
                </span>
                <StatusChip
                  tone={
                    payment.status === "succeeded"
                      ? "success"
                      : payment.status === "processing"
                        ? "info"
                        : "danger"
                  }
                >
                  {t(
                    payment.status === "succeeded"
                      ? "tourMerchant.recorded"
                      : payment.status === "processing"
                        ? "payment.processing.title"
                        : "payment.failed.title",
                  )}
                </StatusChip>
              </div>
              <p className="text-sm text-muted tabular-nums">
                {t(`tourMerchant.${payment.method}`)} · {date(payment.at)}
                {payment.recordedBy && ` · ${t(actorKey(payment.recordedBy))}`}
              </p>
              {payment.note && (
                <p className="text-sm wrap-anywhere">{payment.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
  const snapshotCard = <SnapshotCard booking={booking} />;
  const history = <HistoryCard booking={booking} />;

  return (
    <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-3">
        <MerchantBackBar
          label={t("tourMerchant.manifest")}
          params={{ departureId: booking.departureId }}
          title={booking.ref}
          to="/store/bookings/departures/$departureId"
        />
        <Link
          className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex"
          params={{ departureId: booking.departureId }}
          to="/store/bookings/departures/$departureId"
        >
          <BackIcon aria-hidden size={16} />
          {t("tourMerchant.manifest")}
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-title max-lg:sr-only">{booking.ref}</h1>
            <p className="font-medium">
              {pickText(booking.tourName, language).text}
            </p>
            <p className="text-sm text-muted tabular-nums">
              {date(booking.startsAt)}
            </p>
          </div>
          <div className="lg:[&>div]:justify-end">
            <BookingStatusLabels booking={booking} />
          </div>
        </div>
      </header>
      {/* Key facts as standalone cards, as on M04 (owner review 1.11s). */}
      <dl
        aria-label={t("merchantOrder.facts.label")}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        {facts.map(({ label, value, icon }) => (
          <StatCard
            key={label}
            isSubgrid
            icon={icon}
            label={label}
            value={<span className="text-pretty tabular-nums">{value}</span>}
          />
        ))}
      </dl>
      {/* From 1024px the M04 columns: the work on the left, reference cards in a 300px column.
          The money panel and next step keep their place in the tree at every width, so an
          open dialog survives a resize across 1024px. Phones keep the original order. */}
      <div
        className={
          isWide
            ? "grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6"
            : "flex flex-col"
        }
      >
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {moneyCard}
          {nextStep}
          {isWide ? (
            <>
              {snapshotCard}
              {history}
            </>
          ) : (
            <>
              <CommissionCard booking={booking} />
              {contact}
              {departure}
              {snapshotCard}
              {payments}
              {history}
            </>
          )}
        </div>
        {isWide && (
          <div className="flex min-w-0 flex-col gap-6">
            {contact}
            {departure}
            {payments}
            <CommissionCard booking={booking} />
          </div>
        )}
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
