import type { CollectStatus, TodayTaskId } from "../lib/today";
import type { IconComponent } from "@/components/icons";
import type { StatusTone } from "@/components/status-chip";
import type { OrderTabId } from "@/features/merchant/orders/lib/order-tabs";
import type { ReactNode } from "react";

import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { Widget } from "./overview-analytics";

import { EmptyState } from "@/components/empty-state";
import {
  ChevronRightIcon,
  ClockIcon,
  GiftIcon,
  PayLaterIcon,
  PickupIcon,
  RequestsIcon,
  StatusDangerIcon,
  TodayIcon,
} from "@/components/icons";
import { StatCard } from "@/components/stat-card";
import { StatusChip } from "@/components/status-chip";

export interface TaskTile {
  id: TodayTaskId;
  /** The M03 tab the tile opens; null when the count is 0 (no link into an empty tab). */
  tab: OrderTabId | null;
  title: string;
  /** Only the alert rows (overdue, owing) carry a hint. */
  hint: string;
  count: number;
  /** Accessible name with the count in words: "Awaiting confirmation, 3 orders". */
  label: string;
}

export interface CollectPart {
  id: CollectStatus;
  label: string;
  amount: string;
  orders: string;
  /** Share of the total, 0–1. */
  share: number;
}

export interface PickupRow {
  id: string;
  reference: string;
  guestName: string;
  gift: string;
  isToday: boolean;
  /** Date tile parts: "Wed", "14", "Oct" ("Today" instead of the weekday). */
  day: { weekday: string; day: string; month: string };
  status: { text: string; tone: StatusTone };
}

export interface MerchantTodayProps {
  title: string;
  date: string;
  todayHeading: string;
  tasksHeading: string;
  attentionHeading: string;
  tiles: TaskTile[];
  collect: {
    title: string;
    total: string;
    hint: string;
    none: string;
    parts: CollectPart[];
  };
  pickups: {
    title: string;
    allLabel: string;
    empty: string;
    rows: PickupRow[];
  };
  empty: { message: string; actionLabel: string };
  isLoading: boolean;
  /** The analytics section under the Today part (step 1.9s). */
  analytics: ReactNode;
  /** Tour work (step 2.10), last in the Today part; tour money stays separate from gifts. */
  tours?: ReactNode;
}

const taskIcon: Record<TodayTaskId, IconComponent> = {
  "awaiting-confirmation": RequestsIcon,
  "awaiting-payment": ClockIcon,
  "to-prepare": GiftIcon,
  ready: PickupIcon,
  overdue: StatusDangerIcon,
  owing: PayLaterIcon,
};

const ALERTS: TodayTaskId[] = ["overdue", "owing"];

/** The tab each slice of "still to collect" opens. */
const collectTab: Record<CollectStatus, OrderTabId> = {
  accepted: "awaiting-payment",
  preparing: "preparing",
  ready: "ready",
  handed_over: "owing",
};

/** One series in the red chart ramp (owner review 1.9t), light to dark along the stages. */
const collectShade: Record<CollectStatus, string> = {
  accepted: "bg-(--chart-1-light)",
  preparing: "bg-(--chart-1-mid)",
  ready: "bg-(--chart-1)",
  handed_over: "bg-(--chart-1-dark)",
};

const cellLink =
  "outline-none hover:bg-surface-secondary focus-visible:focus-ring focus-visible:ring-inset";

/** A "To do" tile: a stat card with icon, name and count. Opens M03 on its tab; a tile at 0 is plain text. */
function Tile({ id, tab, title, count, label }: TaskTile) {
  return (
    <StatCard
      isLarge
      as={({ className, children }) =>
        tab ? (
          <Link
            aria-label={label}
            className={`h-full ${className}`}
            search={{ status: tab }}
            to="/store/orders"
          >
            {children}
          </Link>
        ) : (
          <div
            aria-label={label}
            className={`h-full ${className}`}
            role="group"
          >
            {children}
          </div>
        )
      }
      icon={taskIcon[id]}
      isLink={tab !== null}
      isMuted={!count}
      label={title}
      value={count}
    />
  );
}

/** Overdue and owing: shown above the tiles only when there is something to chase. */
function AlertRow({ id, tab, title, hint, count, label }: TaskTile) {
  const Icon = taskIcon[id];
  const danger = id === "overdue";

  return (
    <Link
      aria-label={label}
      className={`flex items-center gap-3 px-4 py-3 ${cellLink}`}
      search={{ status: tab ?? undefined }}
      to="/store/orders"
    >
      <span
        aria-hidden
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          danger
            ? "bg-danger-soft text-danger-soft-foreground"
            : "bg-warning-soft text-warning-soft-foreground"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={`font-semibold ${danger ? "text-danger" : "text-warning"}`}
        >
          {title}
        </span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
      <span
        aria-hidden
        className={`text-2xl font-semibold tabular-nums ${danger ? "text-danger" : "text-warning"}`}
      >
        {count}
      </span>
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
    </Link>
  );
}

/** Still to collect: the total, one stacked bar by stage, and a legend that links to M03. */
function CollectWidget({
  title,
  total,
  hint,
  none,
  parts,
}: MerchantTodayProps["collect"]) {
  return (
    <Widget
      className="lg:col-span-2"
      description={parts.length ? hint : none}
      id="today-collect"
      title={title}
    >
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {total}
      </p>
      {parts.length > 0 && (
        <>
          <div
            aria-hidden
            className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full"
          >
            {parts.map((p) => (
              <span
                key={p.id}
                className={`h-full min-w-1.5 ${collectShade[p.id]}`}
                style={{ flexGrow: p.share, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-col">
            {parts.map((p) => (
              <li key={p.id}>
                <Link
                  className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 ${cellLink}`}
                  search={{ status: collectTab[p.id] }}
                  to="/store/orders"
                >
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${collectShade[p.id]}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{p.label}</span>{" "}
                    <span className="text-xs text-muted">{p.orders}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {p.amount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Widget>
  );
}

/** Next pickups: ready and preparing orders by pickup date; each row opens M04. */
function PickupsWidget({
  title,
  allLabel,
  empty,
  rows,
}: MerchantTodayProps["pickups"]) {
  return (
    <Widget
      actions={
        rows.length > 0 && (
          <Link
            className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-muted underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:focus-ring"
            to="/store/orders"
          >
            {allLabel}
          </Link>
        )
      }
      className="lg:col-span-3"
      id="today-pickups"
      title={title}
    >
      {rows.length ? (
        <ul className="-mx-2 -my-1.5 flex flex-col">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 ${cellLink}`}
                params={{ orderId: r.id }}
                to="/store/orders/$orderId"
              >
                <span
                  className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${
                    r.isToday
                      ? "bg-foreground text-background"
                      : "bg-surface-secondary"
                  }`}
                >
                  <span className="text-xs leading-4 font-medium">
                    {r.day.weekday}
                  </span>
                  <span className="text-lg leading-6 font-semibold tabular-nums">
                    {r.day.day}
                  </span>
                  <span className="text-xs leading-4">{r.day.month}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 xl:flex-row xl:items-center xl:gap-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      {r.guestName}{" "}
                      <span className="ms-1 text-xs font-normal text-muted">
                        {r.reference}
                      </span>
                    </span>
                    <span className="truncate text-sm text-muted">
                      {r.gift}
                    </span>
                  </span>
                  <span className="max-w-full self-start xl:self-center">
                    <StatusChip tone={r.status.tone}>
                      {r.status.text}
                    </StatusChip>
                  </span>
                </span>
                <ChevronRightIcon
                  aria-hidden
                  className="shrink-0 text-muted"
                  size={18}
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </Widget>
  );
}

/**
 * M02 Overview (owner review 1.9s): a Today part with what needs action now (alerts, the
 * four "To do" tiles, next pickups, still to collect), then the analytics section. The
 * Today part comes first in the DOM, so Tab reaches the tiles before the period switch.
 * Phones stack; from 1024px the widgets sit in a grid in the same DOM order.
 */
export function MerchantToday({
  title,
  date,
  todayHeading,
  tasksHeading,
  attentionHeading,
  tiles,
  collect,
  pickups,
  empty,
  isLoading,
  analytics,
  tours,
}: MerchantTodayProps) {
  const alerts = tiles.filter((t) => ALERTS.includes(t.id) && t.count > 0);
  const strip = tiles.filter((t) => !ALERTS.includes(t.id));
  const hasTasks = tiles.some((t) => t.count > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-title">{title}</h1>
        <span className="text-sm text-muted">{date}</span>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-60 rounded-3xl lg:h-36" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : (
        <>
          <section
            aria-labelledby="overview-today"
            className="flex flex-col gap-4"
          >
            <h2 className="text-heading" id="overview-today">
              {todayHeading}
            </h2>
            {alerts.length > 0 && (
              <section
                aria-labelledby="today-attention"
                className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface"
              >
                <h3 className="sr-only" id="today-attention">
                  {attentionHeading}
                </h3>
                <ul className="flex flex-col divide-y divide-separator">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      <AlertRow {...a} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="today-tasks" className="flex flex-col">
              <h3 className="sr-only" id="today-tasks">
                {tasksHeading}
              </h3>
              {hasTasks ? (
                <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                  {strip.map((tile) => (
                    <li key={tile.id} className="min-w-0">
                      <Tile {...tile} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl bg-surface shadow-surface">
                  <EmptyState
                    action={{ label: empty.actionLabel, to: "/store/orders" }}
                    icon={TodayIcon}
                    message={empty.message}
                  />
                </div>
              )}
            </section>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
              <PickupsWidget {...pickups} />
              <CollectWidget {...collect} />
            </div>
            {tours}
          </section>
          {analytics}
        </>
      )}
    </div>
  );
}
