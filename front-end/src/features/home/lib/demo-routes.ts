import type { PublicLanguage, PublicTourCard } from '@sk/api-contract'
import type { Tour } from '@sk/domain/bookings'

import { pilatus } from '@/features/tours/lucerne/pilatus'
import { rigi } from '@/features/tours/lucerne/rigi'
import { thingsThatRemain } from '@/features/tours/lucerne/things-that-remain'

/** A home route card: the public tour card, plus a photo for the demo tours (the API has no tour cover until 2b). */
export type HomeRoute = PublicTourCard & { photo?: string }

/**
 * The demo tours as home route cards (G-S9-TOURS-DEMO: tours stay on demo content until release 2b). They are the tours
 * the existing tour page draws, with the same slugs, so a card opens its page. Used while the API has no published tour.
 */
export function demoRoutes(lang: PublicLanguage): HomeRoute[] {
  return ([thingsThatRemain, pilatus, rigi] satisfies Tour[])
    .filter(tour => tour.published && !tour.archivedAt && !tour.unannounced)
    .map(tour => ({
      id: tour.id,
      slug: tour.slug,
      title: tour.name[lang] ?? tour.name.en ?? tour.slug,
      stayTag: 'both',
      interests: [],
      durationMinutes: tour.durationMinutes,
      coverKey: null,
      photo: tour.photos[0],
      language: lang,
      requestedLanguage: lang,
      fallback: false,
      availableLanguages: ['en', 'de'],
    }))
}
