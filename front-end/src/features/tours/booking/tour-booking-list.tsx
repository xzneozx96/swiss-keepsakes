import type { TourBooking } from "../types";

import { Link } from "@tanstack/react-router";

import {
  TourTicketHead,
  isClosedBooking,
  useBookingFormat,
  useTourPhoto,
} from "./booking-summary";

import { EmptyState } from "@/components/empty-state";
import { ChevronRightIcon, TourIcon } from "@/components/icons";
import { Media } from "@/components/media";
import {
  TicketGroups,
  pastRowClass,
  ticketClass,
} from "@/components/ticket-groups";
import { useLocale } from "@/contexts/locale-context";
import { BookingStatusLabels } from "@/features/tours/components/booking-status";
import { useTours } from "@/features/tours/hooks/use-tours";
import { pickText } from "@/lib/localized";

/**
 * C14 Tour bookings, grouped as gift C14 (owner, round 3): open bookings come first as tickets,
 * soonest departure on top; closed ones follow as quieter rows, newest first. Every booking
 * shows its total and opens C16.
 */
export function TourBookingList() {
  const { bookings, guestId } = useTours();
  const { t } = useLocale();
  const owned = bookings
    .filter((booking) => booking.guestId === guestId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const open = owned
    .filter((booking) => !isClosedBooking(booking))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const past = owned.filter(isClosedBooking);

  if (!owned.length)
    return (
      <EmptyState
        action={{ label: t("tourBooking.explore"), to: "/tours" }}
        icon={TourIcon}
        message={t("tourBooking.empty")}
      />
    );

  return (
    <TicketGroups
      id="bookings"
      open={open.map((booking) => (
        <BookingTicket key={booking.id} booking={booking} />
      ))}
      openTitle={t("transactions.open.title")}
      past={past.map((booking) => (
        <PastRow key={booking.id} booking={booking} />
      ))}
      pastTitle={t("tourBooking.past")}
    />
  );
}

/** Open booking: the gift C14 ticket (date tile, tour, time, group, photo, then both labels). */
function BookingTicket({ booking }: { booking: TourBooking }) {
  const { money } = useBookingFormat();

  return (
    <li>
      <Link
        className={ticketClass}
        params={{ bookingId: booking.id }}
        to="/account/bookings/$bookingId"
      >
        <TourTicketHead booking={booking} />
        <div className="flex flex-col items-start gap-3 border-t border-dashed border-separator p-4">
          <BookingStatusLabels booking={booking} />
          <div className="flex w-full items-center gap-3 text-sm">
            <span className="flex-1 text-muted tabular-nums">
              {booking.ref}
            </span>
            <span className="font-semibold tabular-nums">
              {money(booking.total)}
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

/** Closed booking: gift C14's quiet past row with both labels. */
function PastRow({ booking }: { booking: TourBooking }) {
  const { language } = useLocale();
  const { money, date } = useBookingFormat();
  const name = pickText(booking.tourName, language);
  const photo = useTourPhoto(booking);

  return (
    <li>
      <Link
        className={pastRowClass}
        params={{ bookingId: booking.id }}
        to="/account/bookings/$bookingId"
      >
        <Media alt="" className="size-14 shrink-0 rounded-xl" photo={photo} />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <div className="flex w-full flex-col">
            <div className="flex w-full items-start justify-between gap-3">
              <span
                className="line-clamp-2 font-medium break-words hyphens-auto"
                lang={name.language}
              >
                {name.text}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {money(booking.total)}
              </span>
            </div>
            <span className="text-sm text-muted tabular-nums">
              {booking.ref} · {date(booking.startsAt)}
            </span>
          </div>
          <BookingStatusLabels booking={booking} />
        </div>
        <ChevronRightIcon
          aria-hidden
          className="shrink-0 self-center text-muted"
          size={20}
        />
      </Link>
    </li>
  );
}
