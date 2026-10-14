import type { TourBooking, TourParticipants } from "../types";

import { BookingsIcon, TravelGroupIcon } from "@/components/icons";
import { SurfaceCardBlock, SurfaceCardTitle } from "@/components/surface-card";
import { useLocale } from "@/contexts/locale-context";
import { formatMoney } from "@/lib/format";
import { pickText } from "@/lib/localized";

export function useBookingFormat() {
  const { intlLocale } = useLocale();

  return {
    money: (cents: number) => formatMoney(cents / 100, intlLocale),
    date: (iso: string) =>
      new Intl.DateTimeFormat(intlLocale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Zurich",
      }).format(new Date(iso)),
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

export function GroupSummary({ group }: { group: TourParticipants }) {
  const groupText = useGroupText();

  return <p className="text-sm text-muted">{groupText(group)}</p>;
}

/**
 * The booking's facts as two blocks of a SurfaceCard (C07's order card): the tour name over
 * date and group rows, then reference, meeting point, contact and answers. Each screen
 * wraps it in its own `SurfaceCard` (C13, C16).
 */
export function BookingSummary({ booking }: { booking: TourBooking }) {
  const { t, language } = useLocale();
  const { date } = useBookingFormat();
  const name = pickText(booking.tourName, language);
  const meeting = pickText(booking.meetingPoint, language);

  return (
    <>
      <SurfaceCardBlock>
        <SurfaceCardTitle className="text-balance" lang={name.language}>
          {name.text}
        </SurfaceCardTitle>
        <div className="flex flex-col gap-1.5">
          <p className="flex items-start gap-2 text-sm">
            <BookingsIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            <span className="font-medium">{date(booking.startsAt)}</span>
          </p>
          <div className="flex items-start gap-2 text-sm">
            <TravelGroupIcon
              aria-hidden
              className="mt-0.5 shrink-0"
              size={16}
            />
            <GroupSummary group={booking} />
          </div>
        </div>
      </SurfaceCardBlock>
      <SurfaceCardBlock>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted">{t("tourBooking.reference")}</dt>
            <dd className="font-medium tabular-nums">{booking.ref}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("tourBooking.meeting")}</dt>
            <dd className="font-medium" lang={meeting.language}>
              {meeting.text}
            </dd>
          </div>
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
