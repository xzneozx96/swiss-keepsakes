import { Button } from '@heroui/react'
import { useParams } from '@tanstack/react-router'

import { useTourActions, useTours } from '../hooks/use-tours'
import { bookingBalance } from '../lib/selectors'

/**
 * Prototype-bar controls for tour operations (English, outside the product UI). The demo
 * clock cannot jump, so these stand in for time passing: the balance deadline of the
 * booking on screen passes now, and the scheduled reminder job runs now.
 */
export function TourDemoControl({ onDone }: { onDone: () => void }) {
  const { bookings, now } = useTours()
  const { skipPastDeadline, sendReminders } = useTourActions()
  const { bookingId } = useParams({ strict: false })
  const booking = bookings.find(b => b.id === bookingId)
  const canPass
    = !!booking
      && booking.status === 'confirmed'
      && bookingBalance(booking) > 0
      && Date.parse(booking.balanceDueAt) > now.getTime()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Tours · merchant operations</p>
      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={!canPass}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (booking)
              skipPastDeadline(booking.id)
            onDone()
          }}
        >
          Skip past this booking’s balance deadline
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => {
            sendReminders()
            onDone()
          }}
        >
          Run the reminder job (N10, N13)
        </Button>
      </div>
      <p className="text-sm text-muted">
        The skip moves the demo clock to one minute past the balance deadline of
        a confirmed booking that still owes money
        {booking ? ` (on screen: ${booking.ref})` : ''}
        ; its snapshotted policy
        then applies: cancel and release seats (N11), a grace period, or the
        merchant decides. Time passes for every booking and order. The reminder
        job sends what is due by now: balance reminders 3 days and 1 day before
        the deadline (R07 proposal, timing not approved) and the reminder the
        day before the tour. Each is sent once. A saved card is never charged.
      </p>
    </div>
  )
}
