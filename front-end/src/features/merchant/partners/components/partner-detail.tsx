import type { LedgerRow, PartnerDetailView } from "../hooks/use-partner-detail";
import type { IconComponent } from "@/components/icons";

import { Button, Tabs, toast } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PartnerQrSheet, referralUrl } from "./partner-qr-sheet";
import { PayoutSheet } from "./payout-sheet";

import { STICKY_TABS_BELOW_BAR } from "@/components/layout/sticky-tabs";
import { useConfirm } from "@/components/confirm-dialog";
import {
  BackIcon,
  ClockIcon,
  EmailIcon,
  OrdersIcon,
  PartnersIcon,
  PayLaterIcon,
  QrIcon,
  ReportsIcon,
  StatusSuccessIcon,
} from "@/components/icons";
import { MerchantBackBar } from "@/components/layout/merchant-back-bar";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import {
  ActionPanel,
  DetailCard,
} from "@/features/merchant/order-detail/components/detail-card";
import { CopyText } from "@/components/copy-text";
import { useIsWide } from "@/hooks/use-is-wide";
import { usePartnerActions } from "@/features/partners/hooks/use-partner-actions";

type TabId = "ledger" | "transactions" | "links";

/** Same ring colours as the M04 activity log. */
const ringClass: Record<LedgerRow["tone"], string> = {
  info: "bg-info-soft text-info-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  neutral: "bg-surface-secondary text-muted",
};

const ledgerIcon: Record<LedgerRow["type"], IconComponent> = {
  recorded: StatusSuccessIcon,
  adjustment: ReportsIcon,
  payout: PayLaterIcon,
  offset: ClockIcon,
};

function Header({ view }: { view: PartnerDetailView }) {
  const { t } = useLocale();
  const { partner } = view;

  return (
    <header className="flex flex-col gap-3">
      <MerchantBackBar
        label={t("merchantPartners.back")}
        title={partner.name}
        to="/store/partners"
      />
      <Link
        className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex"
        to="/store/partners"
      >
        <BackIcon aria-hidden size={16} />
        {t("merchantPartners.back")}
      </Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-title max-lg:sr-only">{partner.name}</h1>
          <p className="text-sm text-muted">
            {t("partnerDetail.subtitle", {
              kind: view.kind,
              code: partner.code,
            })}
          </p>
        </div>
        {(partner.archivedAt || !partner.reportToken) && (
          <div className="flex flex-wrap items-start gap-2 lg:justify-end [&_svg]:shrink-0">
            {partner.archivedAt && (
              <StatusChip tone="neutral">
                {t("merchantPartners.archived")}
              </StatusChip>
            )}
            {!partner.reportToken && (
              <StatusChip tone="neutral">
                {t("merchantPartners.reportLink.revokedChip")}
              </StatusChip>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/** Four key facts as standalone StatCards, as M04 (1.11s). */
function KeyFacts({ view }: { view: PartnerDetailView }) {
  const { t } = useLocale();
  const { facts } = view;
  const items = [
    {
      label: t("merchantPartners.toPay"),
      value: facts.toPay,
      sub: facts.toOffset
        ? t("partnerDetail.facts.toOffset", { amount: facts.toOffset })
        : t("partnerDetail.facts.afterOffsets"),
      icon: PayLaterIcon,
    },
    {
      label: t("partnerDetail.facts.earned"),
      value: facts.earned,
      sub: t("partnerDetail.facts.estimated", { amount: facts.estimated }),
      icon: StatusSuccessIcon,
    },
    {
      label: t("partnerDetail.facts.paid"),
      value: facts.paid,
      sub: t(
        facts.payouts === 1
          ? "partnerDetail.facts.payouts.one"
          : "partnerDetail.facts.payouts.other",
        { count: facts.payouts },
      ),
      icon: OrdersIcon,
    },
    {
      label: t("partnerAnalytics.kpi.opens"),
      value: String(facts.opens30),
      sub: t("merchantPartners.opens.window"),
      icon: QrIcon,
    },
  ];

  return (
    <dl
      aria-label={t("partnerDetail.facts.label")}
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
    >
      {items.map(({ label, value, sub, icon }) => (
        <StatCard
          key={label}
          isSubgrid
          icon={icon}
          label={label}
          value={
            <span className="tabular-nums [overflow-wrap:anywhere]">
              {value}
            </span>
          }
        >
          <dd className="text-xs text-pretty text-muted tabular-nums">{sub}</dd>
        </StatCard>
      ))}
    </dl>
  );
}

/** The one thing to do next, in the M04 action panel: pay, wait for offsets, or nothing. */
function NextStep({
  view,
  onPay,
}: {
  view: PartnerDetailView;
  onPay: () => void;
}) {
  const { t } = useLocale();
  const { next } = view;

  return (
    <ActionPanel
      eyebrow={t("partnerDetail.next.eyebrow")}
      icon={next.kind === "settled" ? StatusSuccessIcon : PayLaterIcon}
      title={
        next.kind === "pay"
          ? t("partnerDetail.next.pay", { amount: next.amount })
          : next.kind === "offset"
            ? t("partnerDetail.next.offset", { amount: next.amount })
            : t("partnerDetail.next.settled")
      }
      tone={
        next.kind === "pay"
          ? "warning"
          : next.kind === "offset"
            ? "neutral"
            : "success"
      }
    >
      <p className="text-sm text-pretty text-muted">
        {t(
          next.kind === "pay"
            ? "partnerDetail.next.payBody"
            : next.kind === "offset"
              ? "partnerDetail.next.offsetBody"
              : "partnerDetail.next.settledBody",
        )}
      </p>
      {next.kind === "pay" && view.canPay && (
        <Button className="self-start" onPress={onPay}>
          {t("partnerDetail.next.payButton")}
        </Button>
      )}
    </ActionPanel>
  );
}

/** Commission ledger, newest first, in the M04 activity-log shape. */
function LedgerCard({ view }: { view: PartnerDetailView }) {
  const { t } = useLocale();
  const rows = view.ledger;

  return (
    <DetailCard
      icon={ClockIcon}
      id="m16-ledger"
      title={t("partnerDetail.ledger.title")}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t("partnerDetail.ledger.empty")}</p>
      ) : (
        <ol className="text-sm">
          {rows.map((row, i) => {
            const Icon = ledgerIcon[row.type];

            return (
              <li key={row.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < rows.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-10 bottom-1 left-[15px] w-0.5 rounded-full bg-separator"
                  />
                )}
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${ringClass[row.tone]}`}
                >
                  <Icon aria-hidden size={16} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5">
                  <p className="font-medium">
                    {row.href ? (
                      <a
                        className="rounded underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
                        href={row.href}
                      >
                        {row.text}
                      </a>
                    ) : (
                      row.text
                    )}
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    {row.balance}
                  </p>
                  {row.details.map((line) => (
                    <p key={line} className="text-xs text-muted tabular-nums">
                      {line}
                    </p>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DetailCard>
  );
}

/** The partner's orders and bookings with their commission state (D13), newest first. */
function TransactionsCard({ view }: { view: PartnerDetailView }) {
  const { t } = useLocale();

  return (
    <DetailCard
      icon={OrdersIcon}
      id="m16-transactions"
      title={t("partnerDetail.transactions.title", {
        count: view.transactions.length,
      })}
    >
      {view.transactions.length === 0 ? (
        <p className="text-sm text-muted">
          {t("partnerDetail.transactions.empty")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-separator">
          {view.transactions.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 [&_svg]:shrink-0">
                <a
                  className="rounded font-semibold underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
                  href={row.href}
                >
                  {row.ref}
                </a>
                <span className="font-semibold tabular-nums">{row.amount}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 [&_svg]:shrink-0">
                <span className="text-sm text-muted">{row.meta}</span>
                <StatusChip tone={row.state.tone}>{row.state.text}</StatusChip>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}

/**
 * QR, referral link, private report link and email. Revoke and reissue the report link are
 * Owner only (R10, Q5), behind the shared confirmation dialog (step 5.5).
 */
function LinksCard({
  view,
  onShowQr,
}: {
  view: PartnerDetailView;
  onShowQr: () => void;
}) {
  const { t } = useLocale();
  const actions = usePartnerActions();
  const { confirm, dialog } = useConfirm();
  const { partner } = view;

  const revoke = async () => {
    const ok = await confirm({
      title: t("partnerDetail.revoke.title", { name: partner.name }),
      body: t("partnerDetail.revoke.body"),
      confirmLabel: t("partnerDetail.revoke.confirm"),
    });

    if (!ok) return;
    actions.revokeReportLink(partner.id);
    toast.success(t("partnerDetail.revoke.done"));
  };

  const issue = () => {
    actions.issueReportLink(partner.id);
    toast.success(t("partnerDetail.issue.done"));
  };

  return (
    <DetailCard
      icon={PartnersIcon}
      id="m16-links"
      title={t("partnerDetail.links.title")}
    >
      {!partner.archivedAt && (
        <Button className="self-start" variant="tertiary" onPress={onShowQr}>
          <QrIcon aria-hidden size={16} />
          {t("partnerDetail.links.qr")}
        </Button>
      )}
      <CopyText
        label={t("partnerDetail.links.referral")}
        value={referralUrl(partner.code)}
      />
      {view.reportLink ? (
        <CopyText
          label={t("partnerDetail.links.report")}
          value={view.reportLink}
        />
      ) : (
        <p className="rounded-2xl bg-surface-secondary px-4 py-3 text-sm text-muted">
          {t("partnerDetail.links.reportRevoked")}
        </p>
      )}
      {view.isOwner ? (
        view.reportLink ? (
          <Button
            className="self-start"
            variant="tertiary"
            onPress={() => void revoke()}
          >
            {t("partnerDetail.revoke.button")}
          </Button>
        ) : (
          !partner.archivedAt && (
            <Button className="self-start" variant="tertiary" onPress={issue}>
              {t("partnerDetail.issue.button")}
            </Button>
          )
        )
      ) : (
        <p className="text-xs text-muted">
          {t("partnerDetail.links.ownerOnly")}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted">
        <EmailIcon aria-hidden size={14} />
        {t("partnerDetail.links.emailHelp")}
      </div>
      <CopyText label={t("merchantPartners.add.email")} value={partner.email} />
      {dialog}
    </DetailCard>
  );
}

/**
 * M16 Partner detail (spec §5.2; steps 5.3–5.5), in the M04 shape (1.11r/s): header, key
 * facts, the next step, then the ledger and transactions with the links card. Phones: three
 * tabs. From 1024px: two columns, the links card in the 300px column.
 */
export function PartnerDetail({ view }: { view: PartnerDetailView }) {
  const { t } = useLocale();
  const isWide = useIsWide();
  const [tab, setTab] = useState<TabId>("ledger");
  const [sheet, setSheet] = useState<"pay" | "qr" | null>(null);
  const { partner } = view;

  const links = <LinksCard view={view} onShowQr={() => setSheet("qr")} />;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <Header view={view} />
      <KeyFacts view={view} />
      <div
        className={
          isWide
            ? "grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6"
            : "flex flex-col"
        }
      >
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <NextStep view={view} onPay={() => setSheet("pay")} />
          {isWide ? (
            <>
              <LedgerCard view={view} />
              <TransactionsCard view={view} />
            </>
          ) : (
            <Tabs
              className="w-full"
              selectedKey={tab}
              onSelectionChange={(key) => setTab(key as TabId)}
            >
              <div className={`max-lg:py-2 ${STICKY_TABS_BELOW_BAR}`}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label={t("partnerDetail.tabs.label")}>
                    {(
                      [
                        ["ledger", t("partnerDetail.tabs.ledger")],
                        ["transactions", t("partnerDetail.tabs.transactions")],
                        ["links", t("partnerDetail.tabs.links")],
                      ] as const
                    ).map(([id, label], index) => (
                      <Tabs.Tab key={id} className="whitespace-nowrap" id={id}>
                        {index > 0 && <Tabs.Separator />}
                        {label}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
              </div>
              <Tabs.Panel className="flex flex-col gap-5 px-0 pb-0" id="ledger">
                <LedgerCard view={view} />
              </Tabs.Panel>
              <Tabs.Panel
                className="flex flex-col gap-5 px-0 pb-0"
                id="transactions"
              >
                <TransactionsCard view={view} />
              </Tabs.Panel>
              <Tabs.Panel className="flex flex-col gap-5 px-0 pb-0" id="links">
                {links}
              </Tabs.Panel>
            </Tabs>
          )}
        </div>
        {isWide && <div className="flex min-w-0 flex-col gap-6">{links}</div>}
      </div>

      {sheet === "pay" && (
        <PayoutSheet
          partnerId={partner.id}
          partnerName={partner.name}
          toPay={view.toPayRappen}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "qr" && (
        <PartnerQrSheet
          code={partner.code}
          name={partner.name}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
