import type {
  Departure,
  Tour,
  TourBooking,
  TourRecords,
} from '@sk/domain/bookings'
import type { Language } from '@/contexts/locale-context'
import type { Outcome } from '@/features/payment/hooks/use-payment'
import type {
  ExternalPaymentInput,
  TourOutcome,
} from '@/features/tours/merchant/lib/transitions'

/** One booking, and the language staff emails are written in. */
interface BookingInput {
  id: string
  language: Language
}

/**
 * Tours, departures and bookings (C08 to C12, M06 to M10). Each change is checked again on the
 * latest data and leaves the booking as it is when it is no longer allowed.
 */
export interface ToursClient {
  records: () => Promise<TourRecords>
  /** Holds the seats of the guest's new booking (C11); nothing is added when they went meanwhile. */
  createBooking: (input: {
    booking: TourBooking
    language: Language
  }) => Promise<void>
  /** The guest pays what is due online (C12); demo mode also takes the provider's answer. */
  pay: (input: BookingInput & { outcome: Outcome }) => Promise<void>
  recordPayment: (
    input: BookingInput & { payment: ExternalPaymentInput },
  ) => Promise<void>
  recordOutcome: (input: BookingInput & { result: TourOutcome }) => Promise<void>
  /** Adds the tour, or replaces the stored one with the same id (M13). */
  saveTour: (tour: Tour) => Promise<void>
  /** Archived tours are unpublished and hidden from guests; restoring brings one back as a draft. */
  setTourArchived: (input: { id: string, archived: boolean }) => Promise<void>
  addDeparture: (departure: Departure) => Promise<void>
  setDepartureCapacity: (input: { id: string, capacity: number }) => Promise<void>
}
