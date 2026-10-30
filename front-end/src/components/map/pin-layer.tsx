import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { ReactNode } from 'react'
import type { LngLat } from './map-context'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useLatest } from '@/hooks/use-latest'
import { boundsOf, clusterPins } from './clusters'
import { useMap } from './map-context'
import { reducedMotion } from './reduced-motion'

/** What the layer needs to know of a pin; a screen's own pin type extends it. */
export interface MapPin {
  id: string
  coordinates: LngLat
}

export interface PinState {
  selected: boolean
  dimmed: boolean
  select: () => void
}

const NO_ELEMENTS = new Map<string, HTMLElement>()
const NO_IDS: ReadonlySet<string> = new Set()

/**
 * The marker elements by pin id as a small external store: the effect that adds and removes
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

/**
 * The pin layer of the shared map: one marker per pin, drawn by `renderPin` (a button, so each pin is in the tab order,
 * has `aria-pressed` and a 44 px hit area). The tab order follows `pins`, the rank order. With `renderCluster`, pins
 * that are close on screen merge into one cluster that zooms in on tap, and the selected pin never merges; clusters are
 * worked out when the camera stops, never per frame (AGENTS.md rule 3). Past about 100 pins this moves to one GeoJSON
 * layer (pins-design §6). The map keeps every pin: `dimmedIds` only says which ones to dim (ADR-030), never which to
 * hide. `fit` frames the first pins that arrive, `followSelected` brings a newly selected pin into the clear part of the map.
 */
export function PinLayer<P extends MapPin>({
  pins,
  selectedId,
  dimmedIds = NO_IDS,
  anchor = 'center',
  draggable = false,
  fit = false,
  followSelected = false,
  renderPin,
  renderCluster,
  onSelect,
  onMove,
}: {
  /** In rank order: the tab order follows it. */
  pins: P[]
  selectedId?: string
  dimmedIds?: ReadonlySet<string>
  /** Which point of the pin sits on its coordinates. */
  anchor?: 'center' | 'bottom'
  draggable?: boolean
  fit?: 'first-load' | false
  followSelected?: boolean
  renderPin: (pin: P, state: PinState) => ReactNode
  /** Omit it for no clustering. */
  renderCluster?: (members: P[], zoomIn: () => void) => ReactNode
  onSelect?: (id: string) => void
  onMove?: (id: string, at: LngLat) => void
}) {
  const { map, maplibre, insets } = useMap()
  const markersRef = useRef(new Map<string, Marker>())
  const fittedRef = useRef<MapLibreMap | null>(null)
  const [store] = useState(createElementStore)
  const elements = useSyncExternalStore(store.subscribe, store.get, () => NO_ELEMENTS)
  // Bumped when the camera stops.
  const [stops, setStops] = useState(0)
  const latest = useLatest({ onMove })
  const clustering = renderCluster !== undefined

  useEffect(() => {
    if (!map || !clustering)
      return
    const bump = () => setStops(value => value + 1)

    map.on('moveend', bump)

    return () => {
      map.off('moveend', bump)
    }
  }, [map, clustering])

  // The markers belong to one map: a new map (a retry) starts without them.
  useEffect(() => {
    const markers = markersRef.current

    return () => {
      markers.forEach(marker => marker.remove())
      markers.clear()
      store.set(new Map())
    }
  }, [map, store])

  // The markers follow the pins list: new pins get one, removed pins lose theirs, and the elements
  // are re-appended in rank order so the tab order follows the ranking.
  useEffect(() => {
    const markers = markersRef.current

    if (!map || !maplibre)
      return
    const wanted = new Set(pins.map(pin => pin.id))

    for (const [id, marker] of markers) {
      if (!wanted.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    }
    for (const pin of pins) {
      if (markers.has(pin.id))
        continue
      const element = document.createElement('div')

      element.className = '[&:has([data-lift])]:z-[2] [&:has([aria-pressed=true])]:z-[3]'
      const marker = new maplibre.Marker({ element, anchor, draggable }).setLngLat(pin.coordinates).addTo(map)

      if (draggable) {
        marker.on('dragend', () => {
          const { lng, lat } = marker.getLngLat()

          latest.current.onMove?.(pin.id, [lng, lat])
        })
      }
      markers.set(pin.id, marker)
    }
    for (const pin of pins) {
      const element = markers.get(pin.id)?.getElement()

      element?.parentElement?.appendChild(element)
    }
    store.set(new Map(Array.from(markers, ([id, marker]) => [id, marker.getElement()])))
  }, [map, maplibre, pins, anchor, draggable, store, latest])

  // The first pins that arrive set the camera, once per map.
  useEffect(() => {
    if (!map || !fit || pins.length < 2 || fittedRef.current === map)
      return
    fittedRef.current = map
    map.fitBounds(boundsOf(pins.map(pin => pin.coordinates)), {
      padding: { top: insets.top + 24, bottom: insets.bottom + 24, left: 32, right: 32 },
      duration: 0,
      maxZoom: 16.5,
    })
  }, [map, fit, pins, insets])

  // Clusters change when the camera stops, not when React re-renders: `stops` counts the stops.
  const { groups, taken } = useMemo(
    () => map && clustering
      ? clusterPins(point => map.project(point), pins, selectedId)
      : { groups: new Map<string, P[]>(), taken: new Set<string>() },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `stops` is the camera's change counter, not a value the callback reads
    [map, clustering, stops, pins, selectedId],
  )

  // A cluster sits at the middle of its members; a pin that leaves a cluster goes to its own place.
  useEffect(() => {
    for (const pin of pins) {
      const [sw, ne] = boundsOf((groups.get(pin.id) ?? [pin]).map(member => member.coordinates))

      markersRef.current.get(pin.id)?.setLngLat([(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2])
    }
  }, [groups, pins])

  // Opening a card brings its pin into the clear part of the map. Only a new selection does it: a pin that is dragged
  // or edited while selected does not pull the map after it.
  const present = pins.some(pin => pin.id === selectedId)
  const pinsRef = useLatest(pins)

  useEffect(() => {
    const selected = pinsRef.current.find(pin => pin.id === selectedId)

    if (!map || !followSelected || !selected)
      return
    map.easeTo({
      center: selected.coordinates,
      zoom: Math.max(map.getZoom(), 16),
      offset: [0, (insets.top - insets.bottom) / 2],
      duration: reducedMotion() ? 0 : 600,
    })
  }, [map, followSelected, selectedId, present, insets, pinsRef])

  function zoomTo(members: P[]) {
    map?.fitBounds(boundsOf(members.map(member => member.coordinates)), {
      padding: { top: insets.top + 48, bottom: insets.bottom + 48, left: 56, right: 56 },
      maxZoom: 18,
      duration: reducedMotion() ? 0 : 500,
    })
  }

  const byId = new Map(pins.map(pin => [pin.id, pin]))

  return Array.from(elements, ([id, element]) => {
    const pin = byId.get(id)
    const members = groups.get(id)

    if (!pin || (taken.has(id) && !members))
      return null

    return createPortal(
      members && renderCluster
        ? renderCluster(members, () => zoomTo(members))
        : renderPin(pin, { selected: selectedId === id, dimmed: dimmedIds.has(id), select: () => onSelect?.(id) }),
      element,
      id,
    )
  })
}
