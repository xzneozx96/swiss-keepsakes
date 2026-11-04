import type { ComponentProps } from 'react'

import { lazy, Suspense } from 'react'

import { useNearViewport } from '@/hooks/use-near-viewport'

// A dynamic import, so the map kit (and through it MapLibre and its CSS, which `useMapInstance` imports in turn) stays out of the first load.
const MapView = lazy(async () => ({ default: (await import('./map-view')).MapView }))

function MapPlaceholder() {
  return <div aria-hidden className="absolute inset-0 bg-[#c9d3c6]" data-map-placeholder="" />
}

/**
 * A `MapView` for a map low on a page: until its frame is within about 600 px of the viewport it is a placeholder of
 * the same size, and the map kit loads then, by dynamic `import()`. `className` sets the frame's size (and shape): give it a
 * height, so the page does not jump when the map arrives. The other props are `MapView`'s.
 */
export function LazyMapView({ className = '', ...props }: ComponentProps<typeof MapView>) {
  const [ref, near] = useNearViewport<HTMLDivElement>()

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <Suspense fallback={<MapPlaceholder />}>
        {near ? <MapView {...props} className="absolute inset-0" /> : <MapPlaceholder />}
      </Suspense>
    </div>
  )
}
