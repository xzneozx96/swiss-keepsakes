import type { TourData } from '@sk/domain/bookings'

import { createTourSeed } from '../seed'

/**
 * Tour data stored by an earlier build of the same DEMO_VERSION lacks Tour fields added since
 * (age bands, participant fields). Fill them from the seed so old browsers keep working.
 * New or changed fixtures still appear only after Reset.
 */
export function upgradeTourData(stored: TourData): TourData {
  const seed = createTourSeed().tours

  return {
    ...stored,
    tours: stored.tours.map(tour => ({
      ...seed.find(s => s.id === tour.id),
      ...tour,
    })),
  }
}
