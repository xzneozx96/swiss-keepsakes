import type { TripAnswers } from '@sk/domain/orders'
import type { TripTarget } from '../lib/trip'

import { useCommand } from '@/features/data-client'

import { useDemoSelector } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useTourRecords } from '@/features/tours/api/queries'
import { tripView } from '../lib/trip'

/**
 * The trip questions of one purchase (R09, 2.17): the orders from one C07 send, or one tour
 * booking. Saving or skipping writes to every order of the target, never to other purchases.
 */
export function useTripProfile(target: TripTarget) {
  const { mutate: saveTrip } = useCommand('account', 'saveTrip')
  const guestId = useDemoSelector(s => s.data.signedInGuestId)
  const orders = useOrders()
  const tours = useTourRecords()
  const { status, answers } = tripView({ orders, tours }, guestId, target)

  return {
    status,
    /** Its own answers once answered; before that, a covering trip's answers or blank. */
    answers,
    save: (next: TripAnswers) => saveTrip({ target, answers: next }),
    skip: () => saveTrip({ target }),
  }
}
