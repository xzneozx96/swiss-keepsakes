import type { Tour } from '@sk/domain/bookings'

import { Button } from '@heroui/react'
import { pickText } from '@sk/domain/shared'
import { ClientOnly } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ItineraryStepper } from './itinerary-stepper'
import { TourSections } from './tour-sections'

// The map needs the browser (WebGL) and a large library: its chunk loads on the client only, and only once the sheet opens (AGENTS rule 9).
const TourItineraryMap = lazy(() =>
  import('@/features/tours/map/tour-itinerary-map').then(m => ({ default: m.TourItineraryMap })),
)

/** Stands in for the map while its chunk loads: it only reserves the map frame's height. */
const mapPlaceholder = <div aria-hidden className="h-[min(72svh,640px)] min-h-[460px] rounded-3xl bg-surface-secondary" />

/** The route on the page: its stops in order and a button that opens a sheet with the itinerary map, where it starts, before you go and all the route sections (at a glance, timetable, stop by stop, practical information). */
export function TourItinerarySheet({ tour }: { tour: Tour }) {
  const { t, language } = useLocale()
  const [open, setOpen] = useState(false)

  return (
    <section className="flex flex-col gap-4 border-t border-separator py-7">
      <h2 className="font-serif text-title">{t('tourMap.title')}</h2>
      <ItineraryStepper stops={tour.itinerary} />
      <Button fullWidth className="mt-1" size="lg" variant="secondary" onPress={() => setOpen(true)}>
        {t('tourDetail.itinerary.open')}
      </Button>
      <SheetFrame
        footer={(
          <Button fullWidth size="lg" variant="secondary" onPress={() => setOpen(false)}>
            {t('detail.sheet.close')}
          </Button>
        )}
        isOpen={open}
        title={t('tourMap.title')}
        onClose={() => setOpen(false)}
      >
        <ClientOnly fallback={mapPlaceholder}>
          <Suspense fallback={mapPlaceholder}>
            <TourItineraryMap key={tour.id} showHeading={false} tour={tour} />
          </Suspense>
        </ClientOnly>
        {[
          { id: 'meeting', title: t('tourDiscovery.meeting'), body: pickText(tour.meetingPoint, language).text },
          { id: 'conditions', title: t('tourDiscovery.conditions'), body: pickText(tour.conditions, language).text },
        ].map(section => (
          <section key={section.id} className="flex flex-col gap-3">
            <h2 className="font-serif text-title text-balance">{section.title}</h2>
            <p className="text-body text-pretty">{section.body}</p>
          </section>
        ))}
        <TourSections checkedOn={tour.checkedOn} sections={tour.sections} />
      </SheetFrame>
    </section>
  )
}
