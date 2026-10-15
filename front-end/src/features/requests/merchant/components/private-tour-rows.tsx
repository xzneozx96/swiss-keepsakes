import type { PrivateTourRow } from "../hooks/use-merchant-requests";
import type { DataTableColumn } from "@/components/data-table";
import type { EmptyStateProps } from "@/components/empty-state";

import { Button, buttonVariants } from "@heroui/react";

import { DateTile } from "@/components/date-tile";
import { DataTable } from "@/components/data-table";
import { RowActions } from "@/components/row-actions";
import { EmailIcon, StatusSuccessIcon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";

interface PrivateTourRowsProps {
  rows: PrivateTourRow[];
  label: string;
  onMarkAnswered: (id: string) => void;
  /** Shown inside the table (a card on phones) when `rows` is empty. */
  empty?: EmptyStateProps;
  /** Back to page 1 when this changes. */
  resetKey?: string;
  isLoading?: boolean;
}

/**
 * Phones: one M03 ticket per request. The date tile is the first preferred day; then the
 * guest's email, New or Answered with the language and time; group, dates and interests;
 * and the two actions. The reply goes by email outside the app, then the staff member marks
 * the request answered by hand (D9).
 */
function StackedRows({ rows, label, onMarkAnswered }: PrivateTourRowsProps) {
  const { t } = useLocale();

  return (
    <ul aria-label={label} className="flex flex-col gap-5 lg:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <article
            aria-labelledby={`pt-${row.id}`}
            className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface"
          >
            <div className="flex items-center gap-4 p-4">
              <DateTile date={row.day} muted={row.isAnswered} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3
                  className="text-lg leading-tight font-semibold [overflow-wrap:anywhere]"
                  id={`pt-${row.id}`}
                >
                  {row.email}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <StatusChip tone={row.status.tone}>
                    {row.status.text}
                  </StatusChip>
                  <span className="text-xs text-muted tabular-nums">
                    {row.meta}
                  </span>
                </div>
              </div>
            </div>
            <dl className="flex flex-col gap-2 px-4 pb-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">
                  {t("merchantRequests.private.group")}
                </dt>
                <dd className="text-end font-medium tabular-nums">
                  {row.group}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">
                  {t("merchantRequests.private.dates")}
                </dt>
                <dd className="text-end font-medium tabular-nums">
                  {row.dates}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 pt-1">
                <dt className="text-muted">
                  {t("merchantRequests.private.interests")}
                </dt>
                <dd className={row.interests ? "" : "text-muted"}>
                  {row.interests ?? t("merchantRequests.private.noInterests")}
                </dd>
              </div>
            </dl>
            {/* The M15 card's action bar: small ink buttons, so a list of cards stays calm. */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-separator px-4 py-2.5">
              <a
                className={buttonVariants({ variant: "tertiary", size: "sm" })}
                href={row.mailto}
              >
                <EmailIcon aria-hidden size={16} />
                {t("merchantRequests.write")}
              </a>
              {row.isAnswered ? (
                <span className="text-xs text-muted tabular-nums">
                  {row.answeredOn}
                </span>
              ) : (
                <Button
                  aria-label={t("merchantRequests.private.markAnsweredLabel", {
                    email: row.email,
                  })}
                  size="sm"
                  variant="tertiary"
                  onPress={() => onMarkAnswered(row.id)}
                >
                  <StatusSuccessIcon aria-hidden size={16} />
                  {t("merchantRequests.private.markAnswered")}
                </Button>
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** From 1024px: a Table. The email is the reply link; "Mark answered" sits in its own column. */
/** M20 inbox: phone tickets, or the table from 1024px. */
export function PrivateTourRows(props: PrivateTourRowsProps) {
  const { t } = useLocale();
  const { onMarkAnswered } = props;
  const columns: DataTableColumn<PrivateTourRow>[] = [
    {
      id: "guest",
      header: t("merchantRequests.column.guest"),
      skeleton: "two-line",
      isRowHeader: true,
      cellClassName: "whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <a
            className="w-fit rounded font-semibold underline-offset-4 outline-none hover:underline focus-visible:focus-ring"
            href={row.mailto}
          >
            {row.email}
          </a>
          <span className="text-label text-muted tabular-nums">{row.meta}</span>
        </div>
      ),
    },
    {
      id: "group",
      header: t("merchantRequests.column.group"),
      skeleton: "line",
      cellClassName: "whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <span className="tabular-nums">{row.group}</span>
          <span className="text-label text-muted tabular-nums">
            {row.dates}
          </span>
        </div>
      ),
    },
    {
      id: "interests",
      header: t("merchantRequests.column.interests"),
      skeleton: "two-line",
      render: (row) => (
        <p
          className={`line-clamp-2 max-w-xs ${row.interests ? "" : "text-muted"}`}
          title={row.interests ?? undefined}
        >
          {row.interests ?? t("merchantRequests.private.noInterests")}
        </p>
      ),
    },
    {
      id: "status",
      header: t("merchantRequests.column.status"),
      skeleton: "chip",
      cellClassName: "py-2",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusChip tone={row.status.tone}>{row.status.text}</StatusChip>
          {row.answeredOn && (
            <span className="text-label whitespace-nowrap text-muted tabular-nums">
              {row.answeredOn}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      cards={(page) => <StackedRows {...props} rows={page} />}
      columns={columns}
      empty={props.empty}
      getRowId={(row) => row.id}
      isLoading={props.isLoading}
      label={props.label}
      resetKey={props.resetKey}
      rowActions={{
        render: (row) => (
          <RowActions
            actions={[
              {
                id: "write",
                label: t("merchantRequests.write"),
                icon: EmailIcon,
                href: row.mailto,
              },
              ...(row.isAnswered
                ? []
                : [
                    {
                      id: "answered",
                      label: t("merchantRequests.private.markAnswered"),
                      icon: StatusSuccessIcon,
                    },
                  ]),
            ]}
            label={t("table.rowActions", { name: row.email })}
            onAction={(id) => id === "answered" && onMarkAnswered(row.id)}
          />
        ),
      }}
      rows={props.rows}
    />
  );
}
