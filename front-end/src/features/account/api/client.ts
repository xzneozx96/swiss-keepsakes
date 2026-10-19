import type { Guest, TripAnswers } from '@sk/domain/orders'
import type { TripTarget } from '@/features/checkout/lib/trip'

/** Guest profiles and the trip questions of each purchase. */
export interface AccountClient {
  guests: () => Promise<Guest[]>
  /** The signed-in guest's own name or photo; an undefined photo removes it. */
  updateProfile: (patch: Partial<Pick<Guest, 'name' | 'avatar'>>) => Promise<void>
  /** The signed-in guest's answers for one purchase (R09); no answers means the guest skipped. */
  saveTrip: (input: { target: TripTarget, answers?: TripAnswers }) => Promise<void>
}
