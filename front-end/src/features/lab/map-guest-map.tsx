/**
 * Lab map for N02 and the tour route panel: MapLibre with the tour map's aerial style made
 * flat (no terrain source, no sky, no tilt, no rotation). Pins are HTML marker buttons, so
 * they are in the tab order, carry aria-pressed and have a 44 px hit area. Each option draws
 * its own pin and cluster through render props; a marker is created once per pin, follows the
 * pin when the merchant moves it, and a chip change only re-renders its content. MapLibre and its CSS load by dynamic import.
 * Product note: past about 100 pins, move to one GeoJSON layer (decision record, research).
 */
import type { Map as MapLibreMap, Marker, StyleSpecification } from 'maplibre-gl'
import type { LngLat, Pin } from '@/features/lab/map-guest-data'

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { loadAerialStyle } from '@/features/tours/map/aerial-style'
import { useLatest } from '@/hooks/use-latest'

export type MapStatus = 'loading' | 'ready' | 'error'

export interface Insets {
  top: number
  bottom: number
}

/** Pins this close on screen (px) merge into one cluster. The selected pin never does. */
const CLUSTER_RADIUS = 34
const LUCERNE: LngLat = [8.3068, 47.0535]

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The tour map's style without the 3D parts (decision G11). */
export async function flatAerialStyle(): Promise<StyleSpecification> {
  const style = await loadAerialStyle()

  delete style.sources.dem
  delete style.sky

  return style
}

function boundsOf(points: LngLat[]): [LngLat, LngLat] {
  const lngs = points.map(p => p[0])
  const lats = points.map(p => p[1])

  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

/** Greedy screen-space clustering in rank order, so a cluster is led by its best-ranked pin. */
function clusterPins(map: MapLibreMap, pins: Pin[], selected: string | undefined) {
  const points = pins.map(pin => ({ pin, at: map.project(pin.coordinates) }))
  const taken = new Set<string>()
  const groups = new Map<string, Pin[]>()

  for (const { pin, at } of points) {
    if (taken.has(pin.id) || pin.id === selected)
      continue
    const members = points.filter(other =>
      other.pin.id !== selected
      && !taken.has(other.pin.id)
      && Math.hypot(other.at.x - at.x, other.at.y - at.y) < CLUSTER_RADIUS,
    )

    if (members.length > 1) {
      members.forEach(m => taken.add(m.pin.id))
      groups.set(pin.id, members.map(m => m.pin))
    }
  }

  return { groups, taken }
}

/**
 * The marker elements by pin id, as a small external store: the effect that adds and removes
 * markers writes it, and the render reads it to portal each pin into its marker.
 */
function createElementStore() {
  let elements = new Map<string, HTMLElement>()
  const listeners = new Set<() => void>()

  return {
    get: () => elements,
    set(next: Map<string, HTMLElement>) {
      elements = next
      listeners.forEach(listener => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function GuestMap({
  pins,
  showPins = true,
  selected,
  insets,
  label,
  route,
  attempt = 0,
  onStatus,
  renderPin,
  renderCluster,
}: {
  /** In rank order: the tab order follows it. Pins may come and go while the map is open. */
  pins: Pin[]
  showPins?: boolean
  selected?: string
  /** Space the overlays take, so the camera keeps pins clear of them. */
  insets: Insets
  label: string
  /** A merchant route drawn as a line through the pins, for the tour panel. */
  route?: boolean
  attempt?: number
  onStatus?: (status: MapStatus) => void
  renderPin: (pin: Pin) => React.ReactNode
  renderCluster: (members: Pin[], zoomIn: () => void) => React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const markerClassRef = useRef<typeof Marker | null>(null)
  const liveMapRef = useRef<MapLibreMap | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [store] = useState(createElementStore)
  const elements = useSyncExternalStore(store.subscribe, store.get)
  // Bumped when the camera stops; clustering is computed then, never on every frame.
  const [view, setView] = useState(0)
  const latest = useLatest({ pins, insets, onStatus, label, route })

  useEffect(() => {
    const container = containerRef.current

    if (!container)
      return
    let disposed = false
    let instance: MapLibreMap | undefined
    const markers = markersRef.current
    const timeout = setTimeout(() => latest.current.onStatus?.('error'), 16000)

    async function initialize() {
      try {
        const styleLoading = flatAerialStyle()
        const [maplibre] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ])
        const style = await styleLoading

        if (disposed || !container)
          return
        maplibre.setWorkerUrl(workerUrl)
        markerClassRef.current = maplibre.Marker
        const { pins: initialPins, insets: initialInsets } = latest.current

        instance = new maplibre.Map({
          container,
          style,
          center: LUCERNE,
          zoom: 15.2,
          minZoom: 12,
          maxZoom: 18.5,
          pitch: 0,
          maxPitch: 0,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          // Credits are drawn by the lab frame, always visible (see MapCredits).
          attributionControl: false,
        })
        instance.touchZoomRotate.disableRotation()
        instance.keyboard.disableRotation()
        instance.getCanvas().setAttribute('aria-label', latest.current.label)
        if (initialPins.length > 1) {
          instance.fitBounds(boundsOf(initialPins.map(p => p.coordinates)), {
            padding: { top: initialInsets.top + 24, bottom: initialInsets.bottom + 24, left: 32, right: 32 },
            duration: 0,
            maxZoom: 16.5,
          })
        }
        const ready = instance

        ready.on('load', () => {
          if (disposed)
            return
          clearTimeout(timeout)
          if (latest.current.route && initialPins.length > 1) {
            ready.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: initialPins.map(p => p.coordinates) },
              },
            })
            ready.addLayer({
              id: 'route-halo',
              type: 'line',
              source: 'route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#fffaf4', 'line-width': 7, 'line-opacity': 0.9 },
            })
            ready.addLayer({
              id: 'route-line',
              type: 'line',
              source: 'route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#d52b1e', 'line-width': 3.5, 'line-dasharray': [2, 1] },
            })
          }
          liveMapRef.current = ready
          setMap(ready)
          setView(v => v + 1)
          latest.current.onStatus?.('ready')
        })
        ready.on('moveend', () => setView(v => v + 1))
        ready.on('error', () => {
          if (!ready.isStyleLoaded() && !disposed)
            latest.current.onStatus?.('error')
        })
      }
      catch {
        if (!disposed)
          latest.current.onStatus?.('error')
      }
    }
    void initialize()

    return () => {
      disposed = true
      clearTimeout(timeout)
      liveMapRef.current = null
      markers.forEach(marker => marker.remove())
      markers.clear()
      store.set(new Map())
      instance?.remove()
    }
  }, [attempt, latest, store])

  // One marker per pin: new pins get one, removed pins lose theirs. The elements are then
  // re-appended in rank order, so the tab order follows the ranking.
  const order = pins.map(p => p.id).join(' ')

  useEffect(() => {
    const MarkerClass = markerClassRef.current

    if (!map || map !== liveMapRef.current || !MarkerClass)
      return
    const markers = markersRef.current
    const ids = order ? order.split(' ') : []
    const wanted = new Set(ids)

    for (const [id, marker] of markers) {
      if (!wanted.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    }
    for (const id of ids) {
      const pin = latest.current.pins.find(p => p.id === id)

      if (!pin || markers.has(id))
        continue
      const element = document.createElement('div')

      element.className = '[&:has([data-lift])]:z-[2] [&:has([aria-pressed=true])]:z-[3]'
      markers.set(id, new MarkerClass({ element, anchor: 'center' }).setLngLat(pin.coordinates).addTo(map))
    }
    for (const id of ids) {
      const element = markers.get(id)?.getElement()

      element?.parentElement?.appendChild(element)
    }
    store.set(new Map(Array.from(markers, ([id, marker]) => [id, marker.getElement()])))
  }, [map, order, latest, store])

  const { groups, taken } = map && view > 0 && showPins
    ? clusterPins(map, pins, selected)
    : { groups: new Map<string, Pin[]>(), taken: new Set<string>() }

  // A cluster sits at the middle of its members; a pin that leaves a cluster, or that the
  // merchant moves, goes to its own place.
  useEffect(() => {
    for (const pin of latest.current.pins) {
      const members = groups.get(pin.id)
      const [sw, ne] = members ? boundsOf(members.map(m => m.coordinates)) : [pin.coordinates, pin.coordinates]

      markersRef.current.get(pin.id)?.setLngLat([(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2])
    }
  })

  // Opening a card, or moving the open pin, brings it into the clear part of the map.
  const selectedAt = pins.find(p => p.id === selected)?.coordinates.join(',')

  useEffect(() => {
    const pin = latest.current.pins.find(p => p.id === selected)

    if (!map || !pin)
      return
    const { top, bottom } = latest.current.insets

    map.easeTo({
      center: pin.coordinates,
      zoom: Math.max(map.getZoom(), 16),
      offset: [0, (top - bottom) / 2],
      duration: reducedMotion() ? 0 : 600,
    })
  }, [map, selected, selectedAt, latest])

  function zoomTo(members: Pin[]) {
    if (!map)
      return
    const { top, bottom } = insets

    map.fitBounds(boundsOf(members.map(m => m.coordinates)), {
      padding: { top: top + 48, bottom: bottom + 48, left: 56, right: 56 },
      maxZoom: 18,
      duration: reducedMotion() ? 0 : 500,
    })
  }

  return (
    <>
      {/* MapLibre makes its container `position: relative` (unlayered CSS), so it sits in a sized box. */}
      <div className="absolute inset-0 bg-[#c9d3c6]">
        <div ref={containerRef} className="size-full" />
      </div>
      {showPins && Array.from(elements, ([id, element]) => {
        const pin = pins.find(p => p.id === id)
        const members = groups.get(id)

        if (!pin || (taken.has(id) && !members))
          return null

        return createPortal(
          members ? renderCluster(members, () => zoomTo(members)) : renderPin(pin),
          element,
          id,
        )
      })}
    </>
  )
}
