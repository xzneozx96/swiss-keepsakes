import type { DataTableColumn } from "@/components/data-table";
import type { EmptyStateProps } from "@/components/empty-state";
import type { ShownLabel } from "@/features/orders/hooks/use-orders";

import { DataTable } from "@/components/data-table";
import { RowActions } from "@/components/row-actions";
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  PickupIcon,
} from "@/components/icons";
import { Media } from "@/components/media";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";

export interface OrderRowProps {
  id: string;
  /** Opens M04 order detail. */
  href: string;
  reference: string;
  guestName: string;
  /** "1 × Kapellbrücke pocket knife", "+1 more" when the order has more lines. */
  gifts: string;
  /** Phone ticket: every order line with its photo. */
  giftLines: {
    id: string;
    name: string;
    /** Variant and engraving, "" when there is neither. */
    meta: string;
    quantity: number;
    photo?: string;
  }[];
  total: string;
  progress: ShownLabel;
  payment: ShownLabel;
  /** Short payment status ("Deposit paid"); its amounts and due date are `paymentFacts`. */
  paymentStatus: string;
  paymentFacts: { label: string; value: string }[];
  pickupDate: string;
  /** Date tile parts: "Fri", "16", "Oct". */
  pickupDay: { weekday: string; day: string; month: string };
  pickupPlace: string;
}

interface OrderRowsProps {
  rows: OrderRowProps[];
  /** Accessible name of the list or table, e.g. the selected tab. */
  label: string;
  columns: { order: string; gifts: string; status: string; pickup: string };
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps;
  /** Back to page 1 when this changes. */
  resetKey?: string;
  isLoading?: boolean;
}

const progressText = {
  neutral: "text-muted",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/** Payment only takes a colour when it needs action. */
const paymentText = {
  neutral: "text-muted",
  info: "text-muted",
  success: "text-muted",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Phones: one pickup ticket per order (owner's lab choice L). Date tile, guest, reference and
 * place; every gift with its photo; progress; then total and payment, one fact per row.
 * The whole ticket opens M04.
 */
function StackedRows({ rows, label }: OrderRowsProps) {
  const { t } = useLocale();

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <a
            className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface outline-none card-hover focus-visible:focus-ring"
            href={row.href}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex w-12 shrink-0 flex-col items-center border-e border-separator pe-4">
                <span className="text-[11px] font-medium uppercase">
                  {row.pickupDay.weekday}
                </span>
                <span className="text-3xl leading-tight font-semibold tabular-nums">
                  {row.pickupDay.day}
                </span>
                <span className="text-xs text-muted">
                  {row.pickupDay.month}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg leading-tight font-semibold">
                  {row.guestName}
                </h3>
                <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted">
                  <span className="shrink-0">{row.reference}</span>
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                  <PickupIcon aria-hidden className="shrink-0" size={14} />
                  <span className="truncate" title={row.pickupPlace}>
                    {row.pickupPlace}
                  </span>
                </div>
              </div>
              <ChevronRightIcon
                aria-hidden
                className="shrink-0 text-muted"
                size={18}
              />
            </div>
            <div className="flex flex-col gap-4 p-4">
              <ul className="flex flex-col gap-3">
                {row.giftLines.map((gift) => (
                  <li key={gift.id} className="flex items-center gap-3">
                    <Media
                      alt=""
                      className="size-14 shrink-0 rounded-lg"
                      photo={gift.photo}
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="leading-snug font-medium">{gift.name}</p>
                      {gift.meta && (
                        <p className="mt-1 text-muted">{gift.meta}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      ×{gift.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              <span
                className={`flex items-start gap-2 text-sm font-medium ${progressText[row.progress.tone]}`}
              >
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current"
                />
                {row.progress.text}
              </span>
            </div>
            <div className="flex flex-col gap-2 border-t border-dashed border-separator px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted">
                  {t("merchantOrders.card.total")}
                </span>
                <span className="font-semibold tabular-nums">{row.total}</span>
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                {[
                  {
                    label: t("merchantOrders.card.payment"),
                    value: row.paymentStatus,
                  },
                  ...row.paymentFacts,
                ].map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="shrink-0 text-muted">{fact.label}</dt>
                    <dd
                      className={`text-end tabular-nums ${paymentText[row.payment.tone]}`}
                    >
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** From 1024px: a Table, four columns so both labels fit beside the sidebar. */
export function OrderRows(props: OrderRowsProps) {
  const { t } = useLocale();
  const { columns: names } = props;
  const columns: DataTableColumn<OrderRowProps>[] = [
    {
      id: "order",
      header: names.order,
      isRowHeader: true,
      skeleton: "two-line",
      cellClassName: "whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.guestName}</span>
          <span className="text-label text-muted">{row.reference}</span>
        </div>
      ),
    },
    { id: "gifts", header: names.gifts, render: (row) => row.gifts },
    {
      id: "status",
      header: names.status,
      skeleton: "chip",
      cellClassName: "py-2",
      render: (row) => (
        <div className="flex flex-col items-start gap-1.5 [&_svg]:shrink-0">
          <StatusChip tone={row.progress.tone}>{row.progress.text}</StatusChip>
          <StatusChip tone={row.payment.tone}>{row.payment.text}</StatusChip>
        </div>
      ),
    },
    {
      id: "pickup",
      header: names.pickup,
      skeleton: "two-line",
      cellClassName: "whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <span>{row.pickupDate}</span>
          <span className="text-label text-muted">{row.pickupPlace}</span>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      cards={(page) => <StackedRows {...props} rows={page} />}
      columns={columns}
      empty={props.empty}
      getRowHref={(row) => row.href}
      getRowId={(row) => row.id}
      isLoading={props.isLoading}
      label={props.label}
      resetKey={props.resetKey}
      rowActions={{
        render: (row) => (
          <RowActions
            actions={[
              {
                id: "open",
                label: t("rowAction.openOrder"),
                icon: ArrowUpRightIcon,
                href: row.href,
              },
            ]}
            label={t("table.rowActions", { name: row.guestName })}
          />
        ),
      }}
      rows={props.rows}
    />
  );
}
