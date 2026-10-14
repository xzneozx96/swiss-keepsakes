import type { TourBooking } from "../types";

import { Alert, Table } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { BookingStatusLabels } from "../components/booking-status";
import { useTours } from "../hooks/use-tours";
import {
  balanceOverdue,
  bookingBalance,
  bookingPaid,
  departureSeats,
} from "../lib/selectors";

import { AttendanceActions } from "./attendance-actions";
import {
  departureBookings,
  departureEnd,
  departurePhase,
  manifestOrder,
  tourWork,
} from "./lib/work";
import { GroupText, phaseChip, useTourFormatting } from "./shared";
import { useOverdueCheck } from "./use-overdue-check";

import { EmptyState } from "@/components/empty-state";
import { AccountIcon, BookingsIcon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { DetailCard } from "@/features/merchant/order-detail/components/detail-card";
import { pickText } from "@/lib/localized";

function Money({ booking }: { booking: TourBooking }) {
  const { t } = useLocale();
  const { money, date } = useTourFormatting();
  const { now } = useTours();
  const overdue = balanceOverdue(booking, now);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="tabular-nums">
        {t("tourMerchant.paidOf", {
          paid: money(bookingPaid(booking)),
          total: money(booking.total),
        })}
      </p>
      <p className="text-muted tabular-nums">
        {t("tourMerchant.balance")}: {money(bookingBalance(booking))}
      </p>
      {overdue && (
        <p className="font-medium text-danger">
          {t("tourMerchant.overdueSince", { date: date(overdue.since) })}
        </p>
      )}
    </div>
  );
}

function BookingLink({ booking }: { booking: TourBooking }) {
  return (
    <Link
      className="inline-flex min-h-8 w-fit items-center text-sm underline underline-offset-4"
      params={{ bookingId: booking.id }}
      to="/store/bookings/$bookingId"
    >
      {booking.ref}
    </Link>
  );
}

function Phone({ booking }: { booking: TourBooking }) {
  return (
    <a
      className="inline-flex min-h-8 w-fit items-center text-sm whitespace-nowrap tabular-nums underline underline-offset-4"
      href={`tel:${booking.phone.replace(/\s/g, "")}`}
    >
      {booking.phone}
    </a>
  );
}

/**
 * M06 Guest list of one departure: every booking with its group, contact and payment label.
 * After the tour ends, Owner and Manager record service delivered or no-show per booking;
 * the departure itself is never marked completed by time alone.
 */
export function TourManifestPage({ departureId }: { departureId: string }) {
  const { data, departures, tours, now } = useTours();
  const { t, language } = useLocale();
  const { date, time, money } = useTourFormatting();

  useOverdueCheck();
  const departure = departures.find((item) => item.id === departureId);
  const tour = tours.find((item) => item.id === departure?.tourId);

  if (!departure || !tour)
    return (
      <EmptyState
        action={{ label: t("tourMerchant.back"), to: "/store/bookings" }}
        icon={BookingsIcon}
        message={t("tourMerchant.notFound")}
      />
    );
  const rows = [...departureBookings(data, departureId)].sort(manifestOrder);
  const phase = departurePhase(departure, tour, now);
  const seats = departureSeats(data, departureId, now);
  const work = tourWork(rows, now);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Link
        className="inline-flex min-h-11 w-fit items-center text-sm text-muted underline underline-offset-4"
        to="/store/bookings"
      >
        {t("tourMerchant.back")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-title">{t("tourMerchant.manifest")}</h1>
        <p className="font-medium">{pickText(tour.name, language).text}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted tabular-nums">
            {date(departure.startsAt)}
          </span>
          <StatusChip tone={phaseChip[phase].tone}>
            {t(phaseChip[phase].key)}
          </StatusChip>
        </div>
        <p className="text-sm tabular-nums">
          {t("tourMerchant.seatSummary", {
            count: seats.confirmed,
            capacity: seats.capacity,
            held: seats.held,
          })}{" "}
          · {t("tourMerchant.toCollect")}: {money(work.toCollect)}
        </p>
      </div>
      {phase === "cancelled" && departure.cancelledAt ? (
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {t("tourMerchant.cancelledDeparture", {
                date: date(departure.cancelledAt),
              })}
            </Alert.Title>
            <Alert.Description>
              {t("tourMerchant.cancelledDepartureBody")}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : phase === "ended" ? (
        work.toRecord.length > 0 && (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {t("tourMerchant.attention.toRecord", {
                  count: work.toRecord.length,
                })}
              </Alert.Title>
              <Alert.Description>
                {t("tourMerchant.recordHelp")}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )
      ) : (
        <p className="text-sm text-muted">
          {t("tourMerchant.afterEndAt", {
            time: time(new Date(departureEnd(departure, tour)).toISOString()),
          })}
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={AccountIcon} message={t("tourMerchant.empty")} />
      ) : (
        <>
          <ul className="flex flex-col gap-4 lg:hidden">
            {rows.map((booking) => (
              <li key={booking.id}>
                <DetailCard icon={AccountIcon} title={booking.contactName}>
                  <div className="flex flex-wrap gap-x-4">
                    <BookingLink booking={booking} />
                    <Phone booking={booking} />
                  </div>
                  <BookingStatusLabels booking={booking} />
                  <GroupText group={booking} />
                  <Money booking={booking} />
                  <AttendanceActions booking={booking} />
                </DetailCard>
              </li>
            ))}
          </ul>
          <Table className="hidden lg:block">
            <Table.ScrollContainer>
              <Table.Content aria-label={t("tourMerchant.manifest")}>
                <Table.Header>
                  <Table.Column isRowHeader>
                    {t("tourMerchant.guest")}
                  </Table.Column>
                  <Table.Column>{t("tourMerchant.group")}</Table.Column>
                  <Table.Column>{t("tourMerchant.money")}</Table.Column>
                  <Table.Column>{t("tourMerchant.actions")}</Table.Column>
                </Table.Header>
                <Table.Body>
                  {rows.map((booking) => (
                    <Table.Row key={booking.id}>
                      <Table.Cell>
                        <Link
                          className="font-semibold whitespace-nowrap underline underline-offset-4"
                          params={{ bookingId: booking.id }}
                          to="/store/bookings/$bookingId"
                        >
                          {booking.contactName}
                        </Link>
                        <p className="mt-1 text-sm whitespace-nowrap text-muted">
                          {booking.ref}
                        </p>
                        <Phone booking={booking} />
                      </Table.Cell>
                      <Table.Cell>
                        <GroupText group={booking} />
                        <div className="mt-2">
                          <BookingStatusLabels booking={booking} />
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Money booking={booking} />
                      </Table.Cell>
                      <Table.Cell>
                        <AttendanceActions booking={booking} />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </>
      )}
    </div>
  );
}
