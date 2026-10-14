import type { TourBooking } from "../types";

import { Link } from "@tanstack/react-router";

import { GroupSummary } from "./booking-summary";

import { pickText } from "@/lib/localized";
import { DateTile } from "@/components/date-tile";
import { EmptyState } from "@/components/empty-state";
import { ChevronRightIcon, ClockIcon, TourIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";
import { BookingStatusLabels } from "@/features/tours/components/booking-status";
import { useTours } from "@/features/tours/hooks/use-tours";

const closed: TourBooking["status"][] = [
  "expired",
  "cancelled",
  "completed",
  "no_show",
];

/** C14 Tour bookings: each booking as the gift C14 ticket (date tile, tour, both labels). */
export function TourBookingList() {
  const { bookings, guestId, tours } = useTours();
  const { t } = useLocale();
  const owned = bookings
    .filter((booking) => booking.guestId === guestId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  if (!owned.length)
    return (
      <EmptyState
        action={{ label: t("tourBooking.explore"), to: "/tours" }}
        icon={TourIcon}
        message={t("tourBooking.empty")}
      />
    );

  return (
    <ul className="flex flex-col gap-3">
      {owned.map((booking) => (
        <BookingTicket
          key={booking.id}
          booking={booking}
          photo={tours.find((item) => item.id === booking.tourId)?.photos[0]}
        />
      ))}
    </ul>
  );
}

function BookingTicket({
  booking,
  photo,
}: {
  booking: TourBooking;
  photo?: string;
}) {
  const { language, intlLocale } = useLocale();
  const name = pickText(booking.tourName, language);
  const at = new Date(booking.startsAt);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, {
      ...options,
      timeZone: "Europe/Zurich",
    })
      .format(at)
      .replace(/\.$/, "");

  return (
    <li>
      <Link
        className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]"
        params={{ bookingId: booking.id }}
        to="/account/bookings/$bookingId"
      >
        <div className="flex items-center gap-4 p-4">
          <DateTile
            date={{
              weekday: part({ weekday: "short" }),
              day: part({ day: "numeric" }),
              month: part({ month: "short" }),
            }}
            muted={closed.includes(booking.status)}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2
              className="line-clamp-2 font-serif text-card-title"
              lang={name.language}
            >
              {name.text}
            </h2>
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted tabular-nums">
              <ClockIcon aria-hidden className="shrink-0" size={16} />
              {part({ hour: "2-digit", minute: "2-digit" })}
            </span>
            <GroupSummary group={booking} />
          </div>
          <Media
            alt=""
            className="size-14 shrink-0 rounded-xl"
            photo={photo ?? "lucerne-old-town"}
          />
        </div>
        <div className="flex flex-col items-start gap-3 border-t border-dashed border-separator p-4">
          <BookingStatusLabels booking={booking} />
          <div className="flex w-full items-center gap-3 text-sm">
            <span className="flex-1 text-muted tabular-nums">
              {booking.ref}
            </span>
            <ChevronRightIcon
              aria-hidden
              className="-me-1 shrink-0 text-muted"
              size={20}
            />
          </div>
        </div>
      </Link>
    </li>
  );
}
