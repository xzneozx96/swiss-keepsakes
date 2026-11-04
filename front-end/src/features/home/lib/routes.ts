import type { PublicTourCard } from '@sk/api-contract'
import type { Stay } from '@/features/onboarding/lib/record'

import { rankItems } from '@sk/domain/content'

/**
 * The route cards by stay length: a multi-day stay shows multi-day tours first, a short stay or no answer shows short-stay
 * tours first. A tour tagged `both` fits either, so it stays in server order with the group that comes first. Drops nothing.
 */
export function routeOrder(tours: readonly PublicTourCard[], stay: Stay | null): PublicTourCard[] {
  return rankItems(tours.map(tour => ({ tour, stay: tour.stayTag, interests: [] })), { stay: stay ?? 'short_stay' }).map(entry => entry.tour)
}
