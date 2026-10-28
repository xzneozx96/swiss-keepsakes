/**
 * Lab, home V9, revision 8: "Where we'd take you to eat" is the full approved guest map, option B
 * "Cards" from `/lab/pins` (`home-v9-food-map.tsx`), embedded in the section and filtered to
 * "Local food and drink" on load. Everything happens inside the section: Categories, List, the
 * photo pins and clusters, the floating card row and the place sheet. This file only frames it:
 * - The approved layout reserves the phone's tab bar (68 px) at its foot. The frame is 548 px
 *   tall and the map is drawn 68 px taller, the extra cut off, so the card row and the credits
 *   sit at the frame's foot as they sit above the tab bar on the Map tab.
 * - MapLibre mounts only when the section comes near the phone's viewport (a same-size
 *   placeholder before); the map component loads MapLibre by dynamic import.
 * - Vertical swipes scroll the page: the map uses MapLibre's cooperative gestures (one finger
 *   scrolls the page with MapLibre's own hint, two fingers move the map; see
 *   `home-v9-guest-map.tsx`). Pins, Categories, List and the cards are ordinary taps.
 */
import type { Language } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'

import { useEffect, useRef, useState } from 'react'

import { mapPins, v9Copy } from '@/features/lab/home-v9-data'
import { FoodOptionCards } from '@/features/lab/home-v9-food-map'
import { SectionHead } from '@/features/lab/home-v9-parts'
import { TAB_BAR } from '@/features/lab/map-guest-kit'

const FRAME_HEIGHT = 548

function LiveFoodMap({ home, language }: { home: HomeModel, language: Language }) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-surface [transform:translateZ(0)]" data-v9-food-map="live" style={{ height: FRAME_HEIGHT }}>
      <div className="absolute inset-x-0 top-0" style={{ height: FRAME_HEIGHT + TAB_BAR }}>
        <FoodOptionCards
          answers={home.answers}
          contentCase="data"
          language={language}
          pins={mapPins(home.items)}
          state="loaded"
          onDirections={url => home.open(url)}
        />
      </div>
    </div>
  )
}

/** Mounts the live map once the section is within about a screen of the phone's viewport. */
export function Food({ home, language }: { home: HomeModel, language: Language }) {
  const c = v9Copy[language]
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = ref.current

    if (!element || near)
      return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNear(true)
        observer.disconnect()
      }
    }, { root: element.closest('[data-home-scroller]'), rootMargin: '600px 0px' })

    observer.observe(element)

    return () => observer.disconnect()
  }, [near])

  return (
    <section aria-labelledby={home.headingId('v9-food')} className="flex flex-col gap-3" data-v9-food>
      <SectionHead body={c.foodBody} home={home} id="v9-food" title={c.foodTitle} />
      <div ref={ref} className="px-4">
        {near
          ? <LiveFoodMap home={home} language={language} />
          : <div aria-hidden className="rounded-2xl bg-surface-secondary shadow-surface" data-v9-food-map="placeholder" style={{ height: FRAME_HEIGHT }} />}
      </div>
    </section>
  )
}
