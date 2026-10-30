import type { ReactNode } from 'react'
import type { LngLat, MapContextValue, MapInsets } from './map-context'
import type { MapStatus } from './map-status'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useLatest } from '@/hooks/use-latest'
import { MapContext } from './map-context'
import { MapCredits } from './map-credits'
import { MapStatusLayer } from './map-status'
import { useMapInstance } from './use-map-instance'

const NO_INSETS: MapInsets = { top: 0, bottom: 0 }
/** Where the credits sit above the bottom edge when a screen states no inset (px). */
const CREDITS_MARGIN = 8

/**
 * The shared map: it owns the MapLibre instance (flat aerial photo, or 3D for the tour route map until E4.12),
 * the frame, the loading overlay, the failed notice and the credits. Layers and controls are its children and
 * read the map through `useMap()`; they clean up their own markers when the map changes (a retry makes a new
 * one). MapLibre loads by dynamic `import()` in `useMapInstance`, never with the first paint.
 *
 * `className` is the frame's position (`relative`, or `absolute inset-0`), size and shape. `insets` is what the screen's overlays take: the credits stay clear
 * of it, and the layers keep the camera clear of it. `status` is the screen's own state (its pins are loading, it
 * has none, or they failed), shown over the map's own loading and failed states. `inert` makes the whole map a
 * picture (the editor's preview, the guest list that covers the map); the status notices and the credits stay
 * pressable. `safeArea` is for a frame that ends at the screen's bottom edge.
 */
export function MapView({
  label,
  view,
  mode = 'flat',
  interactive = true,
  cooperativeGestures = false,
  lazy,
  resetKey,
  insets: given = NO_INSETS,
  status,
  inert = false,
  credits = true,
  overlay,
  safeArea = false,
  className = '',
  onRetry,
  onFailed,
  onMapClick,
  children,
}: {
  /** The canvas's accessible name. */
  label: string
  view: { center: LngLat | undefined, zoom: number, minZoom?: number, maxZoom?: number }
  mode?: 'flat' | '3d'
  interactive?: boolean
  cooperativeGestures?: boolean
  lazy?: boolean
  resetKey?: unknown
  insets?: MapInsets
  status?: Exclude<MapStatus, 'map-loading'>
  inert?: boolean
  credits?: boolean
  safeArea?: boolean
  /** Controls drawn over the map that stay pressable when the map is `inert` (they may use `useMap()` too). */
  overlay?: ReactNode
  className?: string
  /** The screen's own retry (its data); a failed map retries itself. */
  onRetry?: () => void
  /** The map could not load. */
  onFailed?: () => void
  onMapClick?: (at: LngLat) => void
  children?: ReactNode
}) {
  const { t } = useLocale()
  const frameRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const flat = mode === 'flat'
  const { containerRef, map, maplibre, state, drawn, retry } = useMapInstance({
    terrain: !flat,
    lazy,
    resetKey,
    options: {
      ...view,
      interactive,
      cooperativeGestures,
      attributionControl: false,
      ...(flat ? {} : { pitch: 55, bearing: -25, maxPitch: 65 }),
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': t('map.gesture.wheel'),
        'CooperativeGesturesHandler.MacHelpText': t('map.gesture.wheelMac'),
        'CooperativeGesturesHandler.MobileHelpText': t('map.gesture.touch'),
      },
    },
  })
  const latest = useLatest({ onFailed, onMapClick })
  // By value, so a screen may write its insets inline without the layers moving the camera on every render.
  const insets = useMemo(() => ({ top: given.top, bottom: given.bottom }), [given.top, given.bottom])

  useEffect(() => {
    map?.getCanvas().setAttribute('aria-label', label)
  }, [map, label])

  useEffect(() => {
    if (state === 'error')
      latest.current.onFailed?.()
  }, [state, latest])

  useEffect(() => {
    if (!map)
      return
    // A tap on a pin (a marker sits over the map, and its click reaches the map too) is not a tap on the map.
    const onClick = (event: { lngLat: { lng: number, lat: number }, originalEvent?: { target: EventTarget | null } }) => {
      const target = event.originalEvent?.target

      if (target instanceof Element && target.closest('.maplibregl-marker'))
        return
      latest.current.onMapClick?.([event.lngLat.lng, event.lngLat.lat])
    }

    map.on('click', onClick)

    return () => {
      map.off('click', onClick)
    }
  }, [map, latest])

  // CSS fullscreen has no browser Escape and no scroll lock of its own. A dialog above it takes Escape first.
  useEffect(() => {
    if (!fullscreen)
      return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented)
        setFullscreen(false)
    }
    const overflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  const value = useMemo<MapContextValue>(
    () => ({ map, maplibre, state, drawn, mode, insets, frameRef, fullscreen, setFullscreen }),
    [map, maplibre, state, drawn, mode, insets, fullscreen],
  )
  const loading = state === 'loading' || !drawn
  const shown: MapStatus | undefined = state === 'error' || status === 'failed'
    ? 'failed'
    : loading ? 'map-loading' : status
  const lift = safeArea || fullscreen ? 'env(safe-area-inset-bottom,0px)' : '0px'

  function retryAll() {
    if (state === 'error')
      retry()
    onRetry?.()
  }

  return (
    <div
      ref={frameRef}
      className={`overflow-hidden bg-[#c9d3c6] ${fullscreen ? 'fixed! inset-0 z-[9999] size-full! min-h-0! rounded-none!' : ''} ${className}`}
      data-map-frame=""
    >
      <MapContext value={value}>
        {/* MapLibre makes its container `position: relative`, so it sits in a sized box. */}
        <div className="absolute inset-0" inert={inert}>
          <div ref={containerRef} className="size-full" />
          {children}
        </div>
        {overlay}
      </MapContext>
      <MapStatusLayer status={shown} top={insets.top + 10} onRetry={retryAll} />
      {credits && (
        <MapCredits
          className="absolute end-2 z-10 max-w-[calc(100%-1rem)]"
          style={{ bottom: `calc(${lift} + ${insets.bottom || CREDITS_MARGIN}px)` }}
          watch={frameRef}
        />
      )}
    </div>
  )
}
