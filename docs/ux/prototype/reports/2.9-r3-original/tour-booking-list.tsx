import type { TourBooking } from "../types";

import { Link } from "@tanstack/react-router";

import { TourTicketHead } from "./booking-summary";

import { EmptyState } from "@/components/empty-state";
import { ChevronRightIcon, TourIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { BookingStatusLabels } from "@/features/tours/components/booking-status";
import { useTours } from "@/features/tours/hooks/use-tours";

/**
 * C14 Tour bookings: each booking as the gift C14 ticket, with the same bordered surface as the
 * hub's order tickets (coordinator D2), newest booking first.
 */
export function TourBookingList() {
  const { bookings, guestId } = useTours();
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
        <BookingTicket key={booking.id} booking={booking} />
      ))}
    </ul>
  );
}

function BookingTicket({ booking }: { booking: TourBooking }) {
  return (
    <li>
      <Link
        className="flex flex-col overflow-hidden rounded-2xl border border-separator bg-surface outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]"
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
