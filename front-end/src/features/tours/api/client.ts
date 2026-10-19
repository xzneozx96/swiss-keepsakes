import type { TourData } from '@sk/domain/bookings'

/** Tours, departures and bookings (C08 to C12, M06 to M10). */
export interface ToursClient {
  /** Its `draft` is the guest's booking in progress, which the booking screens read from the store. */
  tourData: () => Promise<TourData>
}
