import type { DeparturePhase, TourWork } from "./lib/work";
import type { Departure, Tour } from "../types";
import type { StatusTone } from "@/components/status-chip";
import type { MessageKey } from "@/i18n/en";

import { Table } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { useTours } from "../hooks/use-tours";
import { departureSeats } from "../lib/selectors";

import { departureBookings, departurePhase, tourWork } from "./lib/work";
import { phaseChip, useTourFormatting } from "./shared";
import { useOverdueCheck } from "./use-overdue-check";

import { EmptyState } from "@/components/empty-state";
import { BookingsIcon, TourIcon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { DetailCard } from "@/features/merchant/order-detail/components/detail-card";
import { pickText } from "@/lib/localized";

interface Row {
  departure: Departure;
  tour?: Tour;
  phase: DeparturePhase;
  seats: ReturnType<typeof departureSeats>;
  work: TourWork;
}

const attention: {
  key: MessageKey;
  tone: StatusTone;
  count: (w: TourWork) => number;
}[] = [
  {
    key: "tourMerchant.attention.toRecord",
    tone: "warning",
    count: (w) => w.toRecord.length,
  },
  {
    key: "tourMerchant.attention.overdue",
    tone: "danger",
    count: (w) => w.overdue.length,
  },
  {
    key: "tourMerchant.attention.owing",
    tone: "warning",
    count: (w) => w.owing.length,
  },
  {
    key: "tourMerchant.attention.reconcile",
    tone: "danger",
    count: (w) => w.reconcile.length,
  },
];

function Attention({ work }: { work: TourWork }) {
  const { t } = useLocale();
  const items = attention.filter((a) => a.count(work) > 0);

  if (!items.length)
    return <span className="text-sm text-muted">{t("tourMerchant.none")}</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((a) => (
        <StatusChip key={a.key} tone={a.tone}>
          {t(a.key, { count: a.count(work) })}
        </StatusChip>
      ))}
    </div>
  );
}

/** Free seats only mean something for a departure guests can still book. */
const bookable = (phase: DeparturePhase) =>
  phase === "open" || phase === "closed";

function DepartureCards({ rows }: { rows: Row[] }) {
  const { t, language } = useLocale();
  const { date, money } = useTourFormatting();

  return (
    <ul className="flex flex-col gap-4 lg:hidden">
      {rows.map(({ departure, tour, phase, seats, work }) => (
        <li key={departure.id}>
          <DetailCard
            icon={TourIcon}
            title={tour ? pickText(tour.name, language).text : ""}
            trailing={
              <StatusChip tone={phaseChip[phase].tone}>
                {t(phaseChip[phase].key)}
              </StatusChip>
            }
          >
            <p className="font-medium tabular-nums">
              {date(departure.startsAt)}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                [
                  t("tourMerchant.booked"),
                  t("tourMerchant.seatsOf", {
                    count: seats.confirmed,
                    capacity: seats.capacity,
                  }),
                ],
                [t("tourMerchant.holds"), seats.held],
                [
                  t("tourMerchant.available"),
                  bookable(phase) ? seats.available : "—",
                ],
                [t("tourMerchant.toCollect"), money(work.toCollect)],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <Attention work={work} />
            <Link
              className="inline-flex min-h-11 w-fit items-center font-medium underline underline-offset-4"
              params={{ departureId: departure.id }}
              to="/store/bookings/departures/$departureId"
            >
              {t("tourMerchant.openManifest")}
            </Link>
          </DetailCard>
        </li>
      ))}
    </ul>
  );
}

function DepartureTable({ rows, label }: { rows: Row[]; label: string }) {
  const { t, language } = useLocale();
  const { date, money } = useTourFormatting();

  return (
    <Table className="hidden lg:block">
      <Table.ScrollContainer>
        <Table.Content aria-label={label}>
          <Table.Header>
            <Table.Column isRowHeader>
              {t("tourMerchant.departure")}
            </Table.Column>
            <Table.Column>{t("tourMerchant.seats")}</Table.Column>
            <Table.Column>{t("tourMerchant.toCollect")}</Table.Column>
            <Table.Column>{t("tourMerchant.needsAttention")}</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map(({ departure, tour, phase, seats, work }) => (
              <Table.Row
                key={departure.id}
                className="cursor-pointer"
                href={`#/store/bookings/departures/${departure.id}`}
              >
                <Table.Cell>
                  <span className="block font-semibold">
                    {tour && pickText(tour.name, language).text}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-muted tabular-nums">
                    {date(departure.startsAt)}
                    {phase !== "open" && (
                      <StatusChip tone={phaseChip[phase].tone}>
                        {t(phaseChip[phase].key)}
                      </StatusChip>
                    )}
                  </span>
                </Table.Cell>
                {/* Booked, holds and free share one column, so the row keeps room for its chips. */}
                <Table.Cell className="tabular-nums">
                  <span className="block whitespace-nowrap">
                    {t("tourMerchant.seatsBooked", {
                      count: seats.confirmed,
                      capacity: seats.capacity,
                    })}
                  </span>
                  <span className="block text-sm whitespace-nowrap text-muted">
                    {t("tourMerchant.seatsDetail", {
                      held: seats.held,
                      free: bookable(phase) ? seats.available : "—",
                    })}
                  </span>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap tabular-nums">
                  {money(work.toCollect)}
                </Table.Cell>
                <Table.Cell>
                  <Attention work={work} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

/**
 * M05 Departure schedule: upcoming departures soonest first, then ended ones newest first.
 * Seats come from the same selector as the guest flow (C10). Each departure opens M06.
 */
export function TourDeparturesPage() {
  const { data, departures, tours, now } = useTours();
  const { t } = useLocale();

  useOverdueCheck();
  const rows: Row[] = departures.map((departure) => {
    const tour = tours.find((item) => item.id === departure.tourId);

    return {
      departure,
      tour,
      phase: departurePhase(departure, tour, now),
      seats: departureSeats(data, departure.id, now),
      work: tourWork(departureBookings(data, departure.id), now),
    };
  });
  const byStart = (a: Row, b: Row) =>
    Date.parse(a.departure.startsAt) - Date.parse(b.departure.startsAt);
  const upcoming = rows.filter((r) => r.phase !== "ended").sort(byStart);
  const ended = rows
    .filter((r) => r.phase === "ended")
    .sort((a, b) => byStart(b, a));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-title">{t("tourMerchant.departures")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t("tourMerchant.departuresIntro")}
        </p>
      </div>
      {rows.length === 0 && (
        <EmptyState
          icon={BookingsIcon}
          message={t("tourMerchant.noDepartures")}
        />
      )}
      {[
        { id: "upcoming", title: t("tourMerchant.upcoming"), rows: upcoming },
        { id: "ended", title: t("tourMerchant.ended"), rows: ended },
      ]
        .filter((group) => group.rows.length > 0)
        .map((group) => (
          <section
            key={group.id}
            aria-labelledby={`departures-${group.id}`}
            className="flex flex-col gap-3"
          >
            <h2 className="text-heading" id={`departures-${group.id}`}>
              {group.title}
            </h2>
            <DepartureCards rows={group.rows} />
            <DepartureTable label={group.title} rows={group.rows} />
          </section>
        ))}
    </div>
  );
}
