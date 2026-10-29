import type { PublicMapItem } from '@sk/api-contract'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { MapLibre } from '@/components/aerial-map/use-aerial-map'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { useLocale } from '@/contexts/locale-context'
import { boundsOf, clusterPins } from '@/features/map/lib/clusters'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
import { PhotoCluster, PhotoPin } from './pin-marker'

const NO_ELEMENTS = new Map<string, HTMLElement>()

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
 * The pin layer on the shared map: one marker button per pin, so each is in the tab order, has
 * `aria-pressed` and a 44 px hit area. Close pins merge into a photo cluster that zooms in on tap
 * and the selected pin never merges. Clusters are worked out when the camera stops, never per
 * frame (AGENTS.md rule 3). Past about 100 pins this moves to one GeoJSON layer (pins-design §6).
 * The map keeps every pin: `litIds` only decides which ones are dimmed.
 */
export function PinMap({
  map,
  maplibre,
  pins,
  litIds,
  filtered,
  selectedId,
  insetTop,
  insetBottom,
  onSelect,
}: {
  map: MapLibreMap | null
  maplibre: MapLibre | null
  /** In rank order: the tab order follows it. */
  pins: PublicMapItem[]
  litIds: ReadonlySet<string>
  /** A category is chosen, so lit pins grow. */
  filtered: boolean
  selectedId: string | undefined
  /** Space the overlays take (px), so the camera keeps pins clear of them. */
  insetTop: number
  insetBottom: number
  onSelect: (id: string) => void
}) {
  const { t, intlLocale } = useLocale()
  const markersRef = useRef(new Map<string, Marker>())
  const fittedRef = useRef<MapLibreMap | null>(null)
  const [store] = useState(createElementStore)
  const elements = useSyncExternalStore(store.subscribe, store.get, () => NO_ELEMENTS)
  // Bumped when the camera stops.
  const [view, setView] = useState(0)

  useEffect(() => {
    if (!map)
      return
    const bump = () => setView(value => value + 1)

    map.on('moveend', bump)
  }, [map])

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
      markers.set(pin.id, new maplibre.Marker({ element, anchor: 'center' }).setLngLat([pin.longitude, pin.latitude]).addTo(map))
    }
    for (const pin of pins) {
      const element = markers.get(pin.id)?.getElement()

      element?.parentElement?.appendChild(element)
    }
    store.set(new Map(Array.from(markers, ([id, marker]) => [id, marker.getElement()])))
  }, [map, maplibre, pins, store])

  // The first pins that arrive set the camera, once per map.
  useEffect(() => {
    if (!map || pins.length < 2 || fittedRef.current === map)
      return
    fittedRef.current = map
    map.fitBounds(boundsOf(pins.map(pin => [pin.longitude, pin.latitude])), {
      padding: { top: insetTop + 24, bottom: insetBottom + 24, left: 32, right: 32 },
      duration: 0,
      maxZoom: 16.5,
    })
  }, [map, pins, insetTop, insetBottom])

  const located = useMemo(
    () => pins.map(pin => ({ ...pin, coordinates: [pin.longitude, pin.latitude] as [number, number] })),
    [pins],
  )
  // Clusters change when the camera stops, not when React re-renders: `view` counts the stops.
  const { groups, taken } = useMemo(
    () => map
      ? clusterPins(point => map.project(point), located, selectedId)
      : { groups: new Map<string, typeof located>(), taken: new Set<string>() },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `view` is the camera's change counter, not a value the callback reads
    [map, view, located, selectedId],
  )

  // A cluster sits at the middle of its members; a pin that leaves a cluster goes to its own place.
  useEffect(() => {
    for (const pin of located) {
      const [sw, ne] = boundsOf((groups.get(pin.id) ?? [pin]).map(member => member.coordinates))

      markersRef.current.get(pin.id)?.setLngLat([(sw[0] + ne[0]) / 2, (sw[1] + ne[1]) / 2])
    }
  }, [groups, located])

  // Opening a card brings its pin into the clear part of the map.
  const selected = pins.find(pin => pin.id === selectedId)

  useEffect(() => {
    if (!map || !selected)
      return
    map.easeTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), 16),
      offset: [0, (insetTop - insetBottom) / 2],
      duration: reducedMotion() ? 0 : 600,
    })
  }, [map, selected, insetTop, insetBottom])

  function zoomTo(members: { coordinates: [number, number] }[]) {
    map?.fitBounds(boundsOf(members.map(member => member.coordinates)), {
      padding: { top: insetTop + 48, bottom: insetBottom + 48, left: 56, right: 56 },
      maxZoom: 18,
      duration: reducedMotion() ? 0 : 500,
    })
  }

  const today = zurichToday(new Date())
  const dateCopy = { until: (day: string) => t('map.date.until', { day }), from: (time: string) => t('map.date.from', { time }) }

  return Array.from(elements, ([id, element]) => {
    const pin = pins.find(candidate => candidate.id === id)
    const members = groups.get(id)

    if (!pin || (taken.has(id) && !members))
      return null
    const lit = litIds.has(id)
    const date = pin.nextDate ? nextDateLine(pin.nextDate, today, intlLocale, dateCopy) : undefined
    const label = [
      pin.title,
      date && `${t('map.pin.event')}, ${date}`,
      !lit && t('map.pin.dimmed'),
    ].filter(Boolean).join(', ')

    return createPortal(
      members
        ? <PhotoCluster lit={members.some(member => litIds.has(member.id))} members={members} zoomIn={() => zoomTo(members)} />
        : <PhotoPin label={label} look={{ selected: selectedId === id, lit, filtered }} pin={pin} onSelect={onSelect} />,
      element,
      id,
    )
  })
}
