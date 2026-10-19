import type { TourBooking, TourParticipants } from "../types";

import { DateTile } from "@/components/date-tile";
import {
  BookingsIcon,
  ClockIcon,
  PickupIcon,
  TravelGroupIcon,
} from "@/components/icons";
import { Media } from "@/components/media";
import { SurfaceCardBlock, SurfaceCardTitle } from "@/components/surface-card";
import { useLocale } from "@/contexts/locale-context";
import { BookingStatusLabels } from "@/features/tours/components/booking-status";
import { useTours } from "@/features/tours/hooks/use-tours";
import { formatMoney, dateTimeFormat } from "@/lib/format";
import { pickText } from "@/lib/localized";

export function useBookingFormat() {
  const { intlLocale } = useLocale();
  const zurich = (iso: string, options: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale, {
      ...options,
      timeZone: "Europe/Zurich",
    }).format(new Date(iso));
  // A DateTile part without the trailing dot of "Di." or "Okt.".
  const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
    zurich(iso, options).replace(/\.$/, "");

  return {
    money: (cents: number) => formatMoney(cents / 100, intlLocale),
    date: (iso: string) =>
      zurich(iso, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    time: (iso: string) => zurich(iso, { hour: "2-digit", minute: "2-digit" }),
    day: (iso: string) => ({
      weekday: part(iso, { weekday: "short" }),
      day: part(iso, { day: "numeric" }),
      month: part(iso, { month: "short" }),
    }),
  };
}

/** "2 adults · 1 child", leaving out groups with nobody in them. */
export function useGroupText() {
  const { t } = useLocale();

  return (group: TourParticipants) =>
    (
      [
        ["adults", group.adults],
        ["children", group.children],
        ["infants", group.infants],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([kind, count]) =>
        t(`tourBooking.count.${kind}.${count === 1 ? "one" : "other"}`, {
          count,
        }),
      )
      .join(" · ");
}

const closed: TourBooking["status"][] = [
  "expired",
  "cancelled",
  "completed",
  "no_show",
];

/** Bookings that need nothing more from the guest or the organiser: C14 lists them under "Past". */
export const isClosedBooking = (booking: TourBooking) =>
  closed.includes(booking.status);

/** The tour's first photo: the ticket and list thumbnails. */
export function useTourPhoto(booking: TourBooking) {
  const { tours } = useTours();

  return (
    tours.find((item) => item.id === booking.tourId)?.photos[0] ??
    "lucerne-old-town"
  );
}

const metaRow = "flex min-w-0 items-start gap-1.5 text-sm text-muted";

/**
 * The ticket head of gift C14 (md tile) and C15 (lg tile): date tile, tour name, start time
 * and group, and the tour photo. Tour C14 rows and the C16 ticket use it.
 */
export function TourTicketHead({
  booking,
  size = "md",
}: {
  booking: TourBooking;
  size?: "md" | "lg";
}) {
  const { language } = useLocale();
  const { day, time } = useBookingFormat();
  const groupText = useGroupText();
  const name = pickText(booking.tourName, language);
  const photo = useTourPhoto(booking);

  return (
    <div className="flex items-center gap-4 p-4">
      <DateTile
        date={day(booking.startsAt)}
        muted={isClosedBooking(booking)}
        size={size}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2
          className="line-clamp-2 font-serif text-card-title"
          lang={name.language}
        >
          {name.text}
        </h2>
        <span className={`${metaRow} tabular-nums`}>
          <ClockIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {time(booking.startsAt)}
        </span>
        <span className={metaRow}>
          <TravelGroupIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {groupText(booking)}
        </span>
      </div>
      <Media alt="" className="size-14 shrink-0 rounded-xl" photo={photo} />
    </div>
  );
}

const row = "flex items-start gap-2 text-sm";
const rowIcon = "mt-0.5 shrink-0";

/**
 * C13's booking card (gift C07's order card): tour name and reference beside the tour photo (the
 * C14/C15 ticket thumbnail, owner round 3), both labels, then the date, group and meeting-point
 * rows; then contact and answers. C13 wraps it in a SurfaceCard.
 */
export function BookingSummary({ booking }: { booking: TourBooking }) {
  const { t, language } = useLocale();
  const { date } = useBookingFormat();
  const groupText = useGroupText();
  const name = pickText(booking.tourName, language);
  const meeting = pickText(booking.meetingPoint, language);
  const photo = useTourPhoto(booking);

  return (
    <>
      <SurfaceCardBlock>
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <SurfaceCardTitle className="text-balance" lang={name.language}>
              {name.text}
            </SurfaceCardTitle>
            <span className="text-sm text-muted tabular-nums">
              {t("tourBooking.reference")} {booking.ref}
            </span>
          </div>
          <Media alt="" className="size-14 shrink-0 rounded-xl" photo={photo} />
        </div>
        <BookingStatusLabels booking={booking} />
        <div className="flex flex-col gap-1.5">
          <p className={row}>
            <BookingsIcon aria-hidden className={rowIcon} size={16} />
            {date(booking.startsAt)}
          </p>
          <p className={row}>
            <TravelGroupIcon aria-hidden className={rowIcon} size={16} />
            {groupText(booking)}
          </p>
          <p className={row}>
            <PickupIcon aria-hidden className={rowIcon} size={16} />
            <span>
              {t("tourBooking.meeting")}:{" "}
              <span lang={meeting.language}>{meeting.text}</span>
            </span>
          </p>
        </div>
      </SurfaceCardBlock>
      <SurfaceCardBlock>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted">{t("tourBooking.contact")}</dt>
            <dd>
              {booking.contactName} · {booking.phone}
            </dd>
          </div>
          {booking.childName && (
            <div>
              <dt className="text-muted">{t("tourBooking.childNameShort")}</dt>
              <dd>{booking.childName}</dd>
            </div>
          )}
          {booking.participantInfo?.map((answer) => {
            const label = pickText(answer.label, language);

            return (
              <div key={label.text}>
                <dt className="text-muted" lang={label.language}>
                  {label.text}
                </dt>
                <dd className="break-words">{answer.value}</dd>
              </div>
            );
          })}
        </dl>
      </SurfaceCardBlock>
    </>
  );
}
