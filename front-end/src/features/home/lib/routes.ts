import type { PublicTourCard } from '@sk/api-contract'
import type { Stay } from '@/features/onboarding/lib/record'

import { rankItems } from '@sk/domain/content'

/** The rail reads the first page of tours only (ADR-033), so the stay ranking applies inside these. */
export const HOME_TOUR_COUNT = 10

/**
 * The route cards by stay length: a multi-day stay shows multi-day tours first, a short stay or no answer shows short-stay
 * tours first. A tour tagged `both` fits either, so it stays in server order with the group that comes first. Drops nothing.
 */
export function routeOrder(tours: readonly PublicTourCard[], stay: Stay | null): PublicTourCard[] {
  return rankItems(tours.map(tour => ({ tour, stay: tour.stayTag, interests: [] })), { stay: stay ?? 'short_stay' }).map(entry => entry.tour)
}

/** "Rigi: From Lake to Sky" reads as the place ("Rigi") and the line under it ("From Lake to Sky"). A title without a colon is all place. */
export function splitTitle(title: string): { place: string, line: string | undefined } {
  const at = title.indexOf(': ')

  return at > 0 ? { place: title.slice(0, at), line: title.slice(at + 2) } : { place: title, line: undefined }
}

/** Swiper's loop with the cards effect wants at least this many slides (it warns and stalls with fewer). */
const MIN_SLIDES = 9

/** The tours repeated until there are enough slides for the loop, in order: three tours become nine slides. */
export function loopSlides<T>(tours: readonly T[]): T[] {
  return tours.length === 0 ? [] : Array.from({ length: Math.ceil(MIN_SLIDES / tours.length) }, () => tours).flat()
}
