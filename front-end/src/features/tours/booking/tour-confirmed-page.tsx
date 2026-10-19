import { Button, buttonVariants } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'

import { BookingsIcon, StatusSuccessIcon } from '@/components/icons'
import { SurfaceCard } from '@/components/surface-card'
import { useLocale } from '@/contexts/locale-context'
import { TripProfile } from '@/features/checkout/components/trip-profile'

import { useTripProfile } from '@/features/checkout/hooks/use-trip-profile'
import { TourKeepsakes } from '@/features/tours/discovery/tour-keepsakes'
import { useTours } from '@/features/tours/hooks/use-tours'
import { bookingBalance } from '@/features/tours/lib/selectors'
import { pickText } from '@/lib/localized'
import { BookingSummary, useBookingFormat } from './booking-summary'
import { calendarHref } from './calendar'
import { BookingMoney, GuestTourBookingPage } from './guest-tour-booking-page'
import { MissingBooking, useOwnedBooking } from './tour-payment-page'

export function TourConfirmedPage({ bookingId }: { bookingId: string }) {
  const { booking, now } = useOwnedBooking(bookingId)
  const { t, language } = useLocale()
  const { money, date } = useBookingFormat()
  const navigate = useNavigate()
  const trip = useTripProfile({ kind: 'tour', bookingId })
  const tour = useTours().tours.find(item => item.id === booking?.tourId)

  if (!booking)
    return <MissingBooking />
  if (booking.status !== 'confirmed')
    return <GuestTourBookingPage bookingId={bookingId} />
  const overdueRule = booking.overduePolicy?.action ?? 'merchant'

  return (
    // C07 Request sent: success header, the booking card, the money section, then the trip card,
    // 40px apart as C07's sections.
    <div className="flex flex-col gap-10 px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8">
      <header className="flex flex-col items-start gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
          <StatusSuccessIcon aria-hidden size={30} />
        </span>
        <h1 className="font-serif text-display text-balance">
          {t('tourBooking.confirmed')}
        </h1>
        <p className="text-muted">{t('tourBooking.confirmedBody')}</p>
        {booking.policy === 'later' && bookingBalance(booking) > 0 && (
          <p className="text-sm font-medium">
            {t('tourBooking.laterDue', {
              amount: money(bookingBalance(booking)),
              date: date(booking.balanceDueAt),
            })}
            {' '}
            {t(`tourBooking.overdueRule.${overdueRule}`, {
              hours:
                booking.overduePolicy?.action === 'grace'
                  ? booking.overduePolicy.graceHours
                  : 0,
            })}
          </p>
        )}
      </header>
      <SurfaceCard>
        <BookingSummary booking={booking} />
      </SurfaceCard>
      <section aria-labelledby="booking-total" className="flex flex-col gap-4">
        <h2 className="text-heading" id="booking-total">
          {t('tourBooking.total')}
        </h2>
        <BookingMoney booking={booking} now={now} />
        <a
          className={buttonVariants({
            variant: 'secondary',
            size: 'lg',
            fullWidth: true,
          })}
          download={`${booking.ref}.ics`}
          href={calendarHref(booking, {
            name: pickText(booking.tourName, language).text,
            place: pickText(booking.meetingPoint, language).text,
            note: t('tourBooking.calendarNote', { ref: booking.ref }),
          })}
        >
          <BookingsIcon aria-hidden size={20} />
          {t('tourBooking.addToCalendar')}
        </a>
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onPress={() =>
            void navigate({
              to: '/account/bookings/$bookingId',
              params: { bookingId },
            })}
        >
          {t('tourBooking.view')}
        </Button>
      </section>
      <TourKeepsakes ids={tour?.keepsakeIds} variant="confirmation" />
      <TripProfile
        answers={trip.answers}
        kind="tour"
        status={trip.status}
        onSave={trip.save}
        onSkip={trip.skip}
      />
    </div>
  )
}
