import { Button } from '@heroui/react'
import {
  availableSeats,
  participantSeats,
} from '@sk/domain/bookings'
import { dateTimeFormat } from '@sk/domain/shared'

import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useTourRecords } from '@/features/tours/api/queries'
import { useTourActions, useTourDraft } from '@/features/tours/hooks/use-tours'
import { createTourSeed } from '@/features/tours/seed'
import { addSampleTourBookings } from './sample-bookings'
import { competingHold, openPayment } from './transitions'

function time(iso: string) {
  return dateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso))
}

/**
 * Prototype-bar controls for the guest tour booking (English, outside the product UI): a
 * competing guest for the last seats, the demo clock past a 15-minute hold, the provider's
 * answer for the open payment on screen (late, repeated or session closed), and sample
 * bookings in every C16 state. Simulations of the browser prototype, not of a real backend.
 */
export function TourBookingDemoControl({ onDone }: { onDone: () => void }) {
  const { update } = useDemoActions()
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const data = useTourRecords()
  const draft = useTourDraft()
  const guest = useGuests(guests => guests.find(g => g.id === signedInGuestId))
  const { language } = useLocale()
  const navigate = useNavigate()
  const { resolvePayment, repeatProviderResult } = useTourActions()
  const { bookingId, slug } = useParams({ strict: false })
  const [note, setNote] = useState('')
  const now = demoNow(clockStartedAt)
  const booking = data.bookings.find(b => b.id === bookingId)
  const open = booking && openPayment(booking)
  const answered = booking?.payments.some(
    p => p.method === 'online' && p.status !== 'processing',
  )
  const tour = data.tours.find(
    item => item.slug === slug && item.id === draft.tourId,
  )
  const departure = data.departures.find(
    item => item.id === draft.departureId && item.tourId === tour?.id,
  )
  const seatsLeft = departure ? availableSeats(data, departure.id, now) : 0

  const done = (message = '') => {
    setNote(message)
    if (!message)
      onDone()
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Tours · guest booking</p>
      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={!tour || !departure || seatsLeft < 1}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (tour && departure) {
              update(s => ({
                ...s,
                data: {
                  ...s.data,
                  tours: competingHold(
                    s.data.tours ?? createTourSeed(),
                    tour,
                    departure,
                    participantSeats(draft),
                    demoNow(s.clockStartedAt),
                  ),
                },
              }))
            }
            done()
          }}
        >
          Another guest takes the last seats
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => {
            update(s => ({
              ...s,
              clockStartedAt: s.clockStartedAt - 16 * 60_000,
            }))
            done()
          }}
        >
          Skip ahead 16 minutes
        </Button>
      </div>
      <p className="text-sm text-muted">
        Another guest: on the departure and group screens
        {departure ? ` (${seatsLeft} seats left now)` : ''}, a competing guest
        holds enough seats that your group no longer fits. Skip ahead moves the
        demo clock for everything, so a running 15-minute hold passes its
        deadline.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={!open}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (booking)
              resolvePayment(booking.id, 'succeeded')
            done()
          }}
        >
          Provider confirms this tour payment now
        </Button>
        <Button
          isDisabled={!open}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (booking && open)
              resolvePayment(booking.id, 'succeeded', open.at)
            done()
          }}
        >
          {open
            ? `Provider confirms it was paid at ${time(open.at)}, result arrives now`
            : 'Provider confirms an earlier payment, result arrives now'}
        </Button>
        <Button
          isDisabled={!open}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (booking)
              resolvePayment(booking.id, 'failed')
            done()
          }}
        >
          Provider declines or closes the session, no charge
        </Button>
        <Button
          isDisabled={!answered}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (booking)
              repeatProviderResult(booking.id)
            done(
              'Repeated result ignored: that payment already has its result, so no money or booking changed.',
            )
          }}
        >
          Provider sends its last result again
        </Button>
      </div>
      <p className="text-sm text-muted">
        Works on the tour booking on screen
        {booking ? ` (${booking.ref})` : ''} whose payment is processing. Choose
        Processing on the payment page, skip ahead past the hold, then confirm:
        the booking stays expired and the money shows for reconciliation.
      </p>
      {note && (
        <p aria-live="polite" className="text-sm font-medium">
          {note}
        </p>
      )}
      <Button
        className="self-start"
        isDisabled={!guest}
        size="sm"
        variant="tertiary"
        onPress={() => {
          if (guest) {
            update(s => ({
              ...s,
              data: {
                ...s.data,
                tours: addSampleTourBookings(
                  s.data.tours ?? createTourSeed(),
                  guest.id,
                  { name: guest.name, phone: '+41 79 123 45 67' },
                  language,
                  demoNow(s.clockStartedAt),
                ),
              },
            }))
          }
          done()
          void navigate({ to: '/account', search: { tab: 'bookings' } })
        }}
      >
        Add sample tour bookings in every state
      </Button>
      <p className="text-sm text-muted">
        Signed in only. Adds held, expired, paid-after-expiry, delivered with a
        balance, completed and no-show tour bookings to Tour bookings. Reset
        removes them.
      </p>
    </div>
  )
}
