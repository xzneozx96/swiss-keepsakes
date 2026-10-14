import { Link } from "@tanstack/react-router";

import { GroupSummary, useBookingFormat } from "./booking-summary";

import { pickText } from "@/lib/localized";
import { EmptyState } from "@/components/empty-state";
import { TourIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";
import { BookingStatusLabels } from "@/features/tours/components/booking-status";
import { useTours } from "@/features/tours/hooks/use-tours";

export function TourBookingList() {
  const { bookings, guestId, tours } = useTours();
  const { language, t } = useLocale();
  const { date } = useBookingFormat();
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
    <ul className="flex flex-col gap-6">
      {owned.map((booking) => {
        const tour = tours.find((item) => item.id === booking.tourId);

        return (
          <li key={booking.id}>
            <Link
              className="flex flex-col gap-3 rounded-2xl bg-surface pb-4 outline-none transition-colors hover:bg-surface-secondary focus-visible:focus-ring"
              params={{ bookingId: booking.id }}
              to="/account/bookings/$bookingId"
            >
              <Media
                alt={pickText(booking.tourName, language).text}
                className="aspect-[16/8] rounded-t-2xl"
                photo={tour?.photos[0] ?? "lucerne-old-town"}
              />
              <div className="flex flex-col gap-3 px-4">
                <h2
                  className="font-serif text-heading"
                  lang={pickText(booking.tourName, language).language}
                >
                  {pickText(booking.tourName, language).text}
                </h2>
                <p className="text-sm font-medium">{date(booking.startsAt)}</p>
                <GroupSummary group={booking} />
                <BookingStatusLabels booking={booking} />
                <p className="text-xs text-muted">{booking.ref}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
