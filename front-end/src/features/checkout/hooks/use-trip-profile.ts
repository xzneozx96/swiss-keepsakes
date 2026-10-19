import type { TripAnswers } from '@sk/domain/orders'
import type { TripTarget } from '../lib/trip'

import { queryKeys, useCommand, useDataClient } from '@/features/data-client'

import { useDemoSelector } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useTourData } from '@/features/tours/api/queries'
import { tripView } from '../lib/trip'

/**
 * The trip questions of one purchase (R09, 2.17): the orders from one C07 send, or one tour
 * booking. Saving or skipping writes to every order of the target, never to other purchases.
 */
export function useTripProfile(target: TripTarget) {
  const client = useDataClient()
  const { mutate: saveTrip } = useCommand(client.account.saveTrip, [
    queryKeys.orders.orders,
    queryKeys.tours.tourData,
  ])
  const guestId = useDemoSelector(s => s.data.signedInGuestId)
  const orders = useOrders()
  const tours = useTourData()
  const { status, answers } = tripView({ orders, tours }, guestId, target)

  return {
    status,
    /** Its own answers once answered; before that, a covering trip's answers or blank. */
    answers,
    save: (next: TripAnswers) => saveTrip({ target, answers: next }),
    skip: () => saveTrip({ target }),
  }
}
