import type { ReportPeriod } from "../lib/report";
import type { ShownLabel } from "@/features/orders/hooks/use-orders";

import { Button, Skeleton, Table, Tabs } from "@heroui/react";

import { EmptyState } from "@/components/empty-state";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ReportsIcon,
} from "@/components/icons";
import { StatusChip } from "@/components/status-chip";

export interface ReportNumber {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface ReportGroupView {
  id: string;
  name: string;
  /** "3 orders · CHF 167.00" */
  summary: string;
  /** Recorded commission of the group. */
  commission: string;
  /** "+CHF 11.30 estimated", null when nothing is open. */
  estimated: string | null;
}

/** A transaction as the partner sees it: guest name only, no contact or custom details (AC12). */
export interface ReportRowView {
  id: string;
  reference: string;
  /** Order date, 13.10.2026. */
  date: string;
  guestName: string;
  gifts: string;
  value: string;
  status: ShownLabel;
  /** Amount null when the order earns none (cancelled or declined). */
  commission: { amount: string | null; label: ShownLabel };
}

export interface PartnerReportProps {
  copy: {
    periodsLabel: string;
    previous: string;
    next: string;
    numbersHeading: string;
    groupsHeading: string;
    groupCommission: string;
    transactionsHeading: string;
    columns: {
      order: string;
      value: string;
      status: string;
      commission: string;
    };
    empty: string;
    emptyAction: string;
  };
  period: ReportPeriod;
  periods: { id: ReportPeriod; label: string }[];
  rangeLabel: string;
  /** False when today lies in the shown period; the empty state then offers no way back. */
  isCurrent: boolean;
  canGoNext: boolean;
  numbers: ReportNumber[];
  groups: ReportGroupView[];
  rows: ReportRowView[];
  isLoading: boolean;
  onPeriodChange: (period: ReportPeriod) => void;
  onPrevious: () => void;
  onNext: () => void;
}

function NumbersCard({ numbers }: { numbers: ReportNumber[] }) {
  return (
    <dl className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 shadow-surface lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:px-0">
      {numbers.map((n) => (
        <div key={n.id} className="flex flex-col gap-0.5 py-4 lg:px-4">
          <dt className="text-label text-muted">{n.label}</dt>
          <dd className="text-title tabular-nums">{n.value}</dd>
          <dd className="text-sm text-muted">{n.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

function GroupsCard({
  groups,
  label,
}: {
  groups: ReportGroupView[];
  label: string;
}) {
  return (
    <ul className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-4 shadow-surface">
      {groups.map((g) => (
        <li key={g.id} className="flex items-start justify-between gap-3 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold">{g.name}</span>
            <span className="text-sm text-muted">{g.summary}</span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
            <span className="tabular-nums">
              <span className="sr-only">{label}: </span>
              {g.commission}
            </span>
            {g.estimated && (
              <span className="text-sm text-muted tabular-nums">
                {g.estimated}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CommissionCell({ commission }: Pick<ReportRowView, "commission">) {
  return (
    <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
      {commission.amount && (
        <span className="tabular-nums">{commission.amount}</span>
      )}
      <StatusChip tone={commission.label.tone}>
        {commission.label.text}
      </StatusChip>
    </div>
  );
}

/** Phones: one card per transaction. Rows open nothing; the partner sees no order detail. */
function StackedRows({
  rows,
  label,
  columns,
}: {
  rows: ReportRowView[];
  label: string;
  columns: PartnerReportProps["copy"]["columns"];
}) {
  return (
    <ul aria-label={label} className="flex flex-col gap-3 lg:hidden">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label text-muted">
                {row.reference} · {row.date}
              </span>
              <span className="font-semibold">{row.guestName}</span>
              <span className="text-sm text-muted">{row.gifts}</span>
            </div>
            <span className="shrink-0 font-semibold tabular-nums">
              <span className="sr-only">{columns.value}: </span>
              {row.value}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-separator pt-3">
            <span className="text-sm text-muted">{columns.commission}</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {row.commission.amount && (
                <span className="font-semibold tabular-nums">
                  {row.commission.amount}
                </span>
              )}
              <StatusChip tone={row.commission.label.tone}>
                {row.commission.label.text}
              </StatusChip>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** From 1024px: a Table; the gifts sit under the guest so both chips stay on one line. */
function RowsTable({
  rows,
  label,
  columns,
}: {
  rows: ReportRowView[];
  label: string;
  columns: PartnerReportProps["copy"]["columns"];
}) {
  return (
    <Table className="hidden lg:block">
      <Table.ScrollContainer>
        <Table.Content aria-label={label}>
          <Table.Header>
            <Table.Column isRowHeader>{columns.order}</Table.Column>
            <Table.Column className="text-end">{columns.value}</Table.Column>
            <Table.Column>{columns.status}</Table.Column>
            <Table.Column>{columns.commission}</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{row.guestName}</span>
                    <span className="text-label whitespace-nowrap text-muted">
                      {row.reference} · {row.date}
                    </span>
                    <span className="text-sm text-muted">{row.gifts}</span>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-end whitespace-nowrap tabular-nums">
                  {row.value}
                </Table.Cell>
                <Table.Cell className="py-2 [&_svg]:shrink-0">
                  <StatusChip tone={row.status.tone}>
                    {row.status.text}
                  </StatusChip>
                </Table.Cell>
                <Table.Cell className="py-2 whitespace-nowrap">
                  <CommissionCell commission={row.commission} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-64 rounded-3xl lg:h-28" />
      <Skeleton className="h-20 rounded-3xl" />
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-40 rounded-3xl lg:h-16" />
      ))}
    </div>
  );
}

/**
 * P02 Partner report (spec §4.8, R15): period, the three numbers, product groups and the
 * transactions of this partner only. Read-only; nothing here opens an order.
 */
export function PartnerReport({
  copy,
  period,
  periods,
  rangeLabel,
  isCurrent,
  canGoNext,
  numbers,
  groups,
  rows,
  isLoading,
  onPeriodChange,
  onPrevious,
  onNext,
}: PartnerReportProps) {
  const content = isLoading ? (
    <ReportSkeleton />
  ) : rows.length ? (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="report-numbers" className="flex flex-col gap-3">
        <h2 className="text-heading" id="report-numbers">
          {copy.numbersHeading}
        </h2>
        <NumbersCard numbers={numbers} />
      </section>
      {groups.length > 0 && (
        <section
          aria-labelledby="report-groups"
          className="flex flex-col gap-3"
        >
          <h2 className="text-heading" id="report-groups">
            {copy.groupsHeading}
          </h2>
          <GroupsCard groups={groups} label={copy.groupCommission} />
        </section>
      )}
      <section
        aria-labelledby="report-transactions"
        className="flex flex-col gap-3"
      >
        <h2 className="text-heading" id="report-transactions">
          {copy.transactionsHeading}
        </h2>
        <StackedRows
          columns={copy.columns}
          label={copy.transactionsHeading}
          rows={rows}
        />
        <RowsTable
          columns={copy.columns}
          label={copy.transactionsHeading}
          rows={rows}
        />
      </section>
    </div>
  ) : (
    <EmptyState
      action={
        isCurrent ? undefined : { label: copy.emptyAction, to: "/partner" }
      }
      icon={ReportsIcon}
      message={copy.empty}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        className="w-full"
        selectedKey={period}
        onSelectionChange={(key) => onPeriodChange(key as ReportPeriod)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={copy.periodsLabel}>
            {periods.map((p, index) => (
              <Tabs.Tab key={p.id} id={p.id}>
                {index > 0 && <Tabs.Separator />}
                {p.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {periods.map((p) => (
          <Tabs.Panel
            key={p.id}
            className="flex flex-col gap-4 px-0 pb-0"
            id={p.id}
          >
            <div className="flex items-center justify-between gap-2">
              <Button
                isIconOnly
                aria-label={copy.previous}
                size="sm"
                variant="secondary"
                onPress={onPrevious}
              >
                <ChevronLeftIcon size={18} />
              </Button>
              <span aria-live="polite" className="font-semibold">
                {rangeLabel}
              </span>
              <Button
                isIconOnly
                aria-label={copy.next}
                isDisabled={!canGoNext}
                size="sm"
                variant="secondary"
                onPress={onNext}
              >
                <ChevronRightIcon size={18} />
              </Button>
            </div>
            {content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
