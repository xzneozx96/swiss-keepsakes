import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { ReactNode, Ref } from 'react'

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'

import { foldCreditsOnFirstTouch } from '@/components/aerial-map/fold-credits'
import { useLocale } from '@/contexts/locale-context'
import { loadAerialStyle } from '@/features/tours/map/aerial-style'
import { useLatest } from '@/hooks/use-latest'

const LUCERNE: [number, number] = [8.3068, 47.0535]
/** One arrow key press moves the pin about 5 m; with Shift about 25 m. */
const STEP = 0.00005

/** What the parent can ask of the map: bring it back to the pin (or to Lucerne while there is none). */
export interface MapPickerControls {
  recenter: () => void
}

const round = (value: number) => Number(value.toFixed(5))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const markerClass
  = 'flex size-11 cursor-grab items-end justify-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent'
const markerShape
  = '<span aria-hidden="true" style="transform:rotate(45deg)" class="grid size-9 place-items-center rounded-full rounded-br-none bg-accent shadow-surface ring-2 ring-white"><span class="size-3 rounded-full bg-white"></span></span>'

/**
 * The position picker of the place editor, on the same flat aerial photo style as the guest map, so a pin placed
 * here lands where the guest map draws it. A tap places the pin, the marker drags, and the arrow keys nudge it.
 * MapLibre loads by dynamic import, never with the editor's first paint. If it cannot load, `onFailed` lets the
 * step show coordinate fields instead.
 */
export function MapPicker({ lat, lng, onPlace, onFailed, className = 'h-72 lg:h-96', overlay, controlsRef }: {
  lat: number | null
  lng: number | null
  onPlace: (position: { lat: number, lng: number }) => void
  onFailed: () => void
  /** The size of the box, as height classes; the width is the parent's. */
  className?: string
  /** Controls placed anywhere over the map: the box leaves the map under it to the pointer, so give each control its own `pointer-events-auto`. */
  overlay?: ReactNode
  controlsRef?: Ref<MapPickerControls>
}) {
  const { t } = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<Marker | null>(null)
  const markerClassRef = useRef<typeof Marker | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const latest = useLatest({ lat, lng, onPlace, onFailed, label: t('places.map.marker'), help: 'places-map-help' })

  useEffect(() => {
    const container = containerRef.current

    if (!container)
      return
    let disposed = false
    let instance: MapLibreMap | undefined
    const unfold = foldCreditsOnFirstTouch(container)

    async function initialize() {
      try {
        const styleLoading = loadAerialStyle()
        const [maplibre] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
        const style = await styleLoading

        if (disposed || !container)
          return
        // The map is flat: no terrain and no sky (decision G11).
        delete style.sources.dem
        delete style.sky
        maplibre.setWorkerUrl(workerUrl)
        markerClassRef.current = maplibre.Marker
        const { lat: startLat, lng: startLng } = latest.current

        instance = new maplibre.Map({
          container,
          style,
          center: startLat !== null && startLng !== null ? [startLng, startLat] : LUCERNE,
          zoom: startLat !== null ? 16.5 : 15.2,
          minZoom: 12,
          maxZoom: 19,
          pitch: 0,
          maxPitch: 0,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
        })
        instance.touchZoomRotate.disableRotation()
        instance.keyboard.disableRotation()
        const ready = instance

        ready.on('click', (event) => {
          // A tap on the marker itself is not a new position.
          if (markerRef.current?.getElement().contains(event.originalEvent.target as Node))
            return
          latest.current.onPlace({ lat: round(event.lngLat.lat), lng: round(event.lngLat.lng) })
        })
        ready.on('load', () => {
          if (!disposed)
            setMap(ready)
        })
        ready.on('error', () => {
          if (!disposed && !ready.loaded())
            latest.current.onFailed()
        })
      }
      catch {
        if (!disposed)
          latest.current.onFailed()
      }
    }
    void initialize()

    return () => {
      disposed = true
      markerRef.current?.remove()
      markerRef.current = null
      unfold()
      instance?.remove()
    }
  }, [latest])

  // The marker follows the form: placed, moved by a tap, a drag, the keys or the fields, or removed.
  useEffect(() => {
    const MarkerClass = markerClassRef.current

    if (!map || !MarkerClass)
      return
    if (lat === null || lng === null) {
      markerRef.current?.remove()
      markerRef.current = null

      return
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
      if (!map.getBounds().contains([lng, lat]))
        map.easeTo({ center: [lng, lat], duration: reducedMotion() ? 0 : 400 })

      return
    }
    const element = document.createElement('button')

    element.type = 'button'
    element.className = markerClass
    element.setAttribute('aria-label', latest.current.label)
    element.setAttribute('aria-describedby', latest.current.help)
    element.innerHTML = markerShape
    element.onkeydown = (event) => {
      const step = event.shiftKey ? STEP * 5 : STEP
      const moves: Record<string, [number, number]> = { ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowUp: [step, 0], ArrowDown: [-step, 0] }
      const move = moves[event.key]
      const { lat: at, lng: along } = latest.current

      if (!move || at === null || along === null)
        return
      event.preventDefault()
      latest.current.onPlace({ lat: round(at + move[0]), lng: round(along + move[1]) })
    }
    const marker = new MarkerClass({ element, anchor: 'bottom', draggable: true }).setLngLat([lng, lat]).addTo(map)

    marker.on('dragend', () => {
      const position = marker.getLngLat()

      latest.current.onPlace({ lat: round(position.lat), lng: round(position.lng) })
    })
    markerRef.current = marker
  }, [map, lat, lng, latest])

  useImperativeHandle(controlsRef, () => ({
    recenter: () => {
      const { lat: at, lng: along } = latest.current

      map?.easeTo({
        center: at !== null && along !== null ? [along, at] : LUCERNE,
        zoom: at !== null ? 16.5 : 15.2,
        duration: reducedMotion() ? 0 : 400,
      })
    },
  }), [map, latest])

  // MapLibre makes its container `position: relative`, so it sits in a box that has a size.
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#c9d3c6] ${className}`}>
      {!map && <p className="absolute inset-0 grid place-items-center text-sm text-muted" role="status">{t('places.map.loading')}</p>}
      <div ref={containerRef} className="size-full" />
      {overlay && <div className="pointer-events-none absolute inset-0 z-10">{overlay}</div>}
    </div>
  )
}
