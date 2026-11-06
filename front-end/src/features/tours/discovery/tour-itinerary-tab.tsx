import type { Tour } from '@sk/domain/bookings'

import { pickText } from '@sk/domain/shared'
import { ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ItineraryStepper } from './itinerary-stepper'
import { TourSections } from './tour-sections'

// The map needs the browser (WebGL) and a large library: its chunk loads on the client only, and only while this tab is selected (AGENTS rule 9).
const TourItineraryMap = lazy(() =>
  import('@/features/tours/map/tour-itinerary-map').then(m => ({ default: m.TourItineraryMap })),
)

/** Stands in for the map while its chunk loads: it only reserves the map frame's height. */
const mapPlaceholder = <div aria-hidden className="h-[min(72svh,640px)] min-h-[460px] rounded-3xl bg-surface-secondary" />

/**
 * The Itinerary tab (owner, 06.11.2026; it replaced a bottom sheet): the map, the stops in order, where it
 * starts, before you go and the route sections (at a glance, timetable, practical information).
 * The sections hold no stop-by-stop part to merge into the stepper: the stops' descriptions live on the map's stop card.
 */
export function TourItineraryTab({ tour }: { tour: Tour }) {
  const { t, language } = useLocale()

  return (
    <div className="flex flex-col">
      {/* A tour added in M13 has no stops yet (no map positions): no map and no stepper. */}
      {tour.itinerary.length > 0 && (
        <section className="flex flex-col gap-5 pb-7">
          <ClientOnly fallback={mapPlaceholder}>
            <Suspense fallback={mapPlaceholder}>
              <TourItineraryMap key={tour.id} tour={tour} />
            </Suspense>
          </ClientOnly>
          <ItineraryStepper stops={tour.itinerary} />
        </section>
      )}
      {[
        { id: 'meeting', title: t('tourDiscovery.meeting'), body: pickText(tour.meetingPoint, language).text },
        { id: 'conditions', title: t('tourDiscovery.conditions'), body: pickText(tour.conditions, language).text },
      ].map(section => (
        <section key={section.id} className="flex flex-col gap-3 border-t border-separator py-7 first:border-t-0 first:pt-0">
          <h2 className="font-serif text-title text-balance">{section.title}</h2>
          <p className="text-body text-pretty">{section.body}</p>
        </section>
      ))}
      <TourSections checkedOn={tour.checkedOn} sections={tour.sections} />
    </div>
  )
}
