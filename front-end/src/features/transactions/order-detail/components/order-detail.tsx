import type { IconComponent } from "@/components/icons";
import type { OrderDetailView, OrderNotice } from "../hooks/use-order-detail";

import { Alert, Button, buttonVariants } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";

import { CopyText } from "@/components/copy-text";
import { useConfirm } from "@/components/confirm-dialog";
import { DateTile } from "@/components/date-tile";
import { DetailTabs } from "@/components/detail-tabs";
import {
  CallIcon,
  ClockIcon,
  EmailIcon,
  PickupDateIcon,
  PickupIcon,
} from "@/components/icons";
import { BackButton } from "@/components/layout/cart-button";
import { Media } from "@/components/media";
import { StateHeadline } from "@/components/state-headline";
import { StatusChip } from "@/components/status-chip";
import { TimelineSteps } from "@/components/timeline-steps";
import { useLocale } from "@/contexts/locale-context";
import { TripCard } from "@/features/checkout/components/trip-card";
import { ProposalMark } from "@/features/demo/components/proposal-mark";
import { OrderReviews } from "@/features/reviews/components/order-reviews";

export const orderTabs = [
  "overview",
  "payments",
  "timeline",
  "policy",
] as const;
export type OrderTab = (typeof orderTabs)[number];

const tabLabel = {
  overview: "guestOrder.tab.overview",
  payments: "guestOrder.tab.payments",
  timeline: "guestOrder.tab.timeline",
  policy: "guestOrder.tab.policy",
} as const;

/**
 * C15 Guest order detail (spec §5.1, outline §2 row 1.13; redesign 1.13r).
 * A pickup ticket answers "what matters now": the date and place, both labels, one headline
 * for the state and the one next action. Reference material sits in four tabs below it.
 */
export function OrderDetail({
  view,
  tab,
  onTabChange,
  onBack,
}: {
  view: OrderDetailView;
  tab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const panels: Record<OrderTab, React.ReactNode> = {
    overview: <OverviewPanel view={view} />,
    payments: <PaymentsPanel view={view} />,
    timeline: <TimelinePanel view={view} />,
    policy: <PolicyPanel view={view} />,
  };

  return (
    <div className="flex flex-col pb-12">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton label={t("guestOrder.back")} onPress={onBack} />
        <h1 className="text-[17px] font-semibold">
          {t("guestOrder.title", { ref: view.ref })}
        </h1>
      </header>

      <OrderTicket view={view} />

      <DetailTabs
        label={t("guestOrder.tabs.label")}
        selected={tab}
        tabs={orderTabs.map((id) => ({
          id,
          label: t(tabLabel[id]),
          panel: panels[id],
        }))}
        onChange={onTabChange}
      />
    </div>
  );
}

/** The shared card surface (owner review 1.13r): shadow, no outer border. Dividers stay inside. */
const surface = "rounded-3xl bg-surface shadow-surface";

/** The header: pickup tile, gift, both labels, then the state's headline and its one action. */
function OrderTicket({ view }: { view: OrderDetailView }) {
  const { t } = useLocale();
  const { confirm, dialog } = useConfirm();
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [headline, ...notes] = view.notices;
  const { actions, pickupDay } = view;

  const cancel = async () => {
    if (!actions.cancel) return;

    const ok = await confirm({
      title: t("guestOrder.cancel.title", { ref: view.ref }),
      body: t("guestOrder.cancel.body"),
      confirmLabel: t("guestOrder.cancel.confirm"),
      cancelLabel: t("guestOrder.cancel.keep"),
    });

    if (!ok) return;
    actions.cancel.onConfirm();
    // Pay and Cancel disappear; the new headline says what happened.
    requestAnimationFrame(() => headlineRef.current?.focus());
  };

  return (
    <div className="flex flex-col gap-3 px-4 pt-2">
      <section
        aria-labelledby="order-headline"
        className={`${surface} overflow-hidden`}
      >
        <div className="flex items-center gap-4 p-4">
          <DateTile date={pickupDay} muted={view.closed} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="line-clamp-2 font-serif text-card-title">
              {view.title}
            </p>
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
              <PickupIcon aria-hidden className="shrink-0" size={16} />
              <span className="truncate">{view.pickup.place}</span>
            </p>
            <p className="text-xs text-muted">{view.pickup.title}</p>
          </div>
          <Media
            alt=""
            className="size-14 shrink-0 rounded-xl"
            photo={view.photo}
          />
        </div>

        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <StatusChip tone={view.progress.tone}>
            {view.progress.text}
          </StatusChip>
          <StatusChip tone={view.payment.tone}>{view.payment.text}</StatusChip>
        </div>

        <div className="flex flex-col gap-4 border-t border-dashed border-separator p-4">
          {headline && (
            <StateHeadline
              ref={headlineRef}
              body={headline.body}
              id="order-headline"
              status={headline.status}
              title={headline.title}
            />
          )}
          <Actions view={view} onCancel={() => void cancel()} />
        </div>
      </section>

      {notes.map((notice) => (
        <Note key={notice.title} notice={notice} />
      ))}
      {dialog}
    </div>
  );
}

function Note({ notice }: { notice: OrderNotice }) {
  const alert = (
    <Alert className="w-full" status={notice.status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{notice.title}</Alert.Title>
        {notice.body && <Alert.Description>{notice.body}</Alert.Description>}
      </Alert.Content>
    </Alert>
  );

  return notice.proposal ? (
    <ProposalMark className="w-full" name={notice.proposal}>
      {alert}
    </ProposalMark>
  ) : (
    alert
  );
}

/** Pay, request again, cancel, review: only what this state allows (T0 guards in the hook). */
function Actions({
  view,
  onCancel,
}: {
  view: OrderDetailView;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const { actions } = view;

  if (
    !actions.pay &&
    !actions.cancel &&
    !actions.requestAgain &&
    !actions.review
  )
    return null;

  return (
    <div className="flex w-full flex-col gap-2">
      {actions.pay && (
        <Link
          className={`${buttonVariants({ variant: "primary", size: "lg", fullWidth: true })} transition-transform active:scale-[0.98]`}
          params={{ orderId: actions.pay.orderId }}
          to="/account/orders/$orderId/pay"
        >
          {actions.pay.label}
        </Link>
      )}
      {actions.requestAgain && (
        <>
          <Button fullWidth size="lg" onPress={actions.requestAgain.onPress}>
            {t("guestOrder.action.requestAgain")}
          </Button>
          <p className="text-sm text-muted">
            {t("guestOrder.action.requestAgainNote")}
          </p>
        </>
      )}
      {actions.cancel && (
        <Button fullWidth size="lg" variant="ghost" onPress={onCancel}>
          {t("guestOrder.action.cancel")}
        </Button>
      )}
      {actions.review && <OrderReviews order={actions.review} />}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-heading">{title}</h3>
      {children}
    </section>
  );
}

/** Pickup, the gifts as ordered and the amounts, then this order's trip answers (2.17). */
function OverviewPanel({ view }: { view: OrderDetailView }) {
  const { t } = useLocale();
  const { pickup } = view;

  return (
    <div className="flex flex-col gap-8">
      <Panel title={pickup.title}>
        <dl className={`${surface} flex flex-col divide-y divide-separator`}>
          <Fact icon={PickupDateIcon} label={t("guestOrder.overview.date")}>
            <span className="font-medium tabular-nums">{pickup.date}</span>
          </Fact>
          <Fact icon={PickupIcon} label={t("guestOrder.overview.place")}>
            <span className="font-serif text-card-title">{pickup.place}</span>
            <span className="text-sm text-muted">{pickup.address}</span>
          </Fact>
          <Fact icon={ClockIcon} label={t("guestOrder.overview.hours")}>
            <span>{pickup.hours}</span>
            <span className="text-sm text-muted">{pickup.instructions}</span>
          </Fact>
        </dl>
      </Panel>

      <Panel title={t("guestOrder.items.title")}>
        <div className={surface}>
          <ul className="flex flex-col divide-y divide-separator px-4">
            {view.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-4">
                <Media
                  alt=""
                  className="size-14 shrink-0 rounded-xl"
                  photo={item.photo}
                />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-muted">{item.detail}</span>
                  </div>
                  <span className="shrink-0 tabular-nums">{item.total}</span>
                </div>
              </li>
            ))}
          </ul>
          <Amounts view={view} />
        </div>
      </Panel>

      <Panel title={t("tripCard.title")}>
        <TripCard kind="gift" target={{ kind: "gift", orderIds: [view.id] }} />
      </Panel>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: IconComponent;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <Icon aria-hidden className="mt-0.5 shrink-0 text-muted" size={20} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="flex flex-col gap-0.5">{children}</dd>
      </div>
    </div>
  );
}

function Amounts({ view }: { view: OrderDetailView }) {
  return (
    <dl className="flex flex-col gap-1.5 border-t border-dashed border-separator px-4 py-3.5">
      {view.amounts.map((row) => (
        <div
          key={row.label}
          className={`flex justify-between gap-3 tabular-nums ${row.strong ? "font-semibold" : "text-sm"}`}
        >
          <dt className={row.strong ? "" : "text-muted"}>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What is paid and owed, then every payment with its method, time and result. */
function PaymentsPanel({ view }: { view: OrderDetailView }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-8">
      <div className={surface}>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
          <StatusChip tone={view.payment.tone}>{view.payment.text}</StatusChip>
        </div>
        <Amounts view={view} />
      </div>

      <Panel title={t("guestOrder.payments.title")}>
        {view.payments.length === 0 ? (
          <p className="text-sm text-muted">{t("guestOrder.payments.none")}</p>
        ) : (
          <ul className={`${surface} flex flex-col divide-y divide-separator`}>
            {view.payments.map((p) => (
              <li key={p.id} className="flex flex-col items-start gap-2 p-4">
                <div className="flex w-full items-baseline justify-between gap-3">
                  <span className="font-semibold tabular-nums">{p.amount}</span>
                  <span className="text-sm text-muted tabular-nums">
                    {p.meta}
                  </span>
                </div>
                <StatusChip tone={p.status.tone}>{p.status.text}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Logged steps with their times, then the milestones still ahead. */
function TimelinePanel({ view }: { view: OrderDetailView }) {
  const { t } = useLocale();

  // The tab names this panel, so it has no heading of its own.
  return (
    <TimelineSteps
      label={t("guestOrder.timeline.title")}
      steps={view.timeline}
      upcomingLabel={t("guestOrder.timeline.upcoming")}
    />
  );
}

/** The policy as it was when the guest ordered, and how to reach the shop. */
function PolicyPanel({ view }: { view: OrderDetailView }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-8">
      <Panel title={t("guestOrder.policy.title")}>
        <p className="text-sm text-muted">{t("guestOrder.policy.intro")}</p>
        <dl className={`${surface} flex flex-col divide-y divide-separator`}>
          <div className="flex flex-col gap-1 p-4">
            <dt className="font-medium">{t("detail.payment.title")}</dt>
            <dd className="text-sm">{view.policy.payment}</dd>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <dt className="font-medium">{t("detail.cancellation.title")}</dt>
            {view.policy.cancellationNotice && (
              <dd className="text-sm text-muted">
                {view.policy.cancellationNotice}
              </dd>
            )}
            <dd className="text-sm">{view.policy.cancellation}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title={t("guestOrder.contact.title")}>
        <p className="text-sm text-muted">{t("guestOrder.contact.body")}</p>
        <CopyText
          isMono
          className={surface}
          label={t("guestOrder.contact.ref")}
          value={view.ref}
        />
        <div className="flex gap-2">
          <a
            className={`${buttonVariants({ variant: "tertiary" })} flex-1`}
            href={view.contact.emailHref}
          >
            <EmailIcon aria-hidden size={20} />
            {t("guestOrder.contact.email")}
          </a>
          <a
            className={`${buttonVariants({ variant: "tertiary" })} flex-1`}
            href={view.contact.callHref}
          >
            <CallIcon aria-hidden size={20} />
            {t("guestOrder.contact.call")}
          </a>
        </div>
      </Panel>
    </div>
  );
}
