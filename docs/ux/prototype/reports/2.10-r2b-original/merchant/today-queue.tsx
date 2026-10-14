import type { TourWork } from "./lib/work";
import type { TourBooking } from "../types";
import type { IconComponent } from "@/components/icons";
import type { MessageKey } from "@/i18n/en";

import { Link } from "@tanstack/react-router";

import { useTours } from "../hooks/use-tours";
import { departureSeats } from "../lib/selectors";

import { departurePhase, tourWork } from "./lib/work";
import { useTourFormatting } from "./shared";
import { useOverdueCheck } from "./use-overdue-check";

import {
  ChevronRightIcon,
  ClockIcon,
  PayLaterIcon,
  StatusDangerIcon,
  TourIcon,
} from "@/components/icons";
import { StatCard } from "@/components/stat-card";
import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { Widget } from "@/features/merchant/today/components/overview-analytics";
import { pickText } from "@/lib/localized";

const cellLink =
  "outline-none hover:bg-surface-secondary focus-visible:focus-ring focus-visible:ring-inset";

const tasks: {
  id: Exclude<keyof TourWork, "toCollect">;
  title: MessageKey;
  hint: MessageKey;
  icon: IconComponent;
  danger: boolean;
}[] = [
  {
    id: "toRecord",
    title: "tourMerchant.task.toRecord",
    hint: "tourMerchant.task.toRecordHint",
    icon: ClockIcon,
    danger: false,
  },
  {
    id: "overdue",
    title: "tourMerchant.task.overdue",
    hint: "tourMerchant.task.overdueHint",
    icon: StatusDangerIcon,
    danger: true,
  },
  {
    id: "owing",
    title: "tourMerchant.task.owing",
    hint: "tourMerchant.task.owingHint",
    icon: PayLaterIcon,
    danger: false,
  },
  {
    id: "reconcile",
    title: "tourMerchant.task.reconcile",
    hint: "tourMerchant.task.reconcileHint",
    icon: StatusDangerIcon,
    danger: true,
  },
];

/** One booking opens M07, one departure opens M06, anything wider opens M05. */
function TaskLink({
  bookings,
  className,
  label,
  children,
}: {
  bookings: TourBooking[];
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  const departures = new Set(bookings.map((b) => b.departureId));

  if (bookings.length === 1)
    return (
      <Link
        aria-label={label}
        className={className}
        params={{ bookingId: bookings[0].id }}
        to="/store/bookings/$bookingId"
      >
        {children}
      </Link>
    );
  if (departures.size === 1)
    return (
      <Link
        aria-label={label}
        className={className}
        params={{ departureId: bookings[0].departureId }}
        to="/store/bookings/departures/$departureId"
      >
        {children}
      </Link>
    );

  return (
    <Link aria-label={label} className={className} to="/store/bookings">
      {children}
    </Link>
  );
}

/**
 * M02 tour work, inside the Today part of Overview, in the M02 widget look (1.9t): each open
 * task (results to record, overdue balances, delivered but owed, payments to reconcile) is its
 * own stat card with the round arrow button; the next departures sit in a widget like Next
 * pickups; the tour balance still to collect is its own card. Tour money stays a separate
 * figure from the gift "Still to collect" (AC19: no double counting, goods and tours apart).
 */
export function TourTodayQueue() {
  const { departures, data, tours, now } = useTours();
  const { t, language } = useLocale();
  const { money, weekday, dayMonth, time } = useTourFormatting();

  useOverdueCheck();
  const work = tourWork(data.bookings, now);
  const today = zurichDate(now);
  const next = departures
    .filter((d) => {
      const phase = departurePhase(
        d,
        tours.find((tour) => tour.id === d.tourId),
        now,
      );

      return phase === "open" || phase === "closed";
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 4);
  const open = tasks.filter((task) => work[task.id].length > 0);

  return (
    <section aria-labelledby="today-tours" className="flex flex-col gap-3">
      <div className="flex min-h-11 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="font-semibold" id="today-tours">
            {t("tourMerchant.today")}
          </h3>
          <p className="text-xs text-pretty text-muted">
            {t("tourMerchant.todayIntro")}
          </p>
        </div>
        <Link
          className="inline-flex h-8 shrink-0 items-center text-sm font-medium text-muted underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:focus-ring"
          to="/store/bookings"
        >
          {t("tourMerchant.back")}
        </Link>
      </div>
      {open.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {open.map((task) => {
            const count = work[task.id].length;
            const title = t(task.title);

            return (
              <li key={task.id} className="min-w-0">
                <StatCard
                  isLarge
                  isLink
                  as={({ className, children }) => (
                    <TaskLink
                      bookings={work[task.id]}
                      className={`h-full ${className}`}
                      label={t("tourMerchant.taskLabel", { title, count })}
                    >
                      {children}
                    </TaskLink>
                  )}
                  icon={task.icon}
                  label={title}
                  value={
                    <span
                      className={task.danger ? "text-danger" : "text-warning"}
                    >
                      {count}
                    </span>
                  }
                >
                  <span aria-hidden className="text-xs text-pretty text-muted">
                    {t(task.hint)}
                  </span>
                </StatCard>
              </li>
            );
          })}
        </ul>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
        <Widget
          className="lg:col-span-3"
          id="today-tours-next"
          title={t("tourMerchant.nextDepartures")}
        >
          {next.length === 0 ? (
            <p className="text-sm text-muted">{t("tourMerchant.todayEmpty")}</p>
          ) : (
            <ul className="-mx-2 -my-1.5 flex flex-col">
              {next.map((departure) => {
                const tour = tours.find((item) => item.id === departure.tourId);
                const seats = departureSeats(data, departure.id, now);
                const isToday =
                  zurichDate(new Date(departure.startsAt)) === today;

                return (
                  <li key={departure.id}>
                    <Link
                      className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 ${cellLink}`}
                      params={{ departureId: departure.id }}
                      to="/store/bookings/departures/$departureId"
                    >
                      <span
                        className={`flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5 text-center ${
                          isToday
                            ? "bg-foreground text-background"
                            : "bg-surface-secondary"
                        }`}
                      >
                        <span className="text-xs leading-4 font-medium">
                          {isToday
                            ? t("merchantToday.pickups.today")
                            : weekday(departure.startsAt)}
                        </span>
                        <span className="text-xs leading-4 tabular-nums">
                          {dayMonth(departure.startsAt)}
                        </span>
                        <span className="text-sm leading-5 font-semibold tabular-nums">
                          {time(departure.startsAt)}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-center gap-2 font-medium">
                          <TourIcon
                            aria-hidden
                            className="shrink-0 text-muted"
                            size={16}
                          />
                          <span className="truncate">
                            {tour && pickText(tour.name, language).text}
                          </span>
                        </span>
                        <span className="text-sm text-muted tabular-nums">
                          {t("tourMerchant.seatsBooked", {
                            count: seats.confirmed,
                            capacity: seats.capacity,
                          })}
                          {seats.held > 0 &&
                            ` · ${t("tourMerchant.onHold", { held: seats.held })}`}
                        </span>
                      </span>
                      <ChevronRightIcon
                        aria-hidden
                        className="shrink-0 text-muted"
                        size={18}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Widget>
        <dl className="lg:col-span-2">
          <StatCard
            isLarge
            icon={PayLaterIcon}
            label={t("tourMerchant.todayCollect")}
            value={
              <span className="tabular-nums">{money(work.toCollect)}</span>
            }
          />
        </dl>
      </div>
    </section>
  );
}
