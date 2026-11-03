import { Button } from '@heroui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CloseIcon, PlusIcon } from '@/components/icons'
import { useMap } from '@/components/map/map-context'
import { MapControls, MapCorner } from '@/components/map/map-controls'
import { MapView } from '@/components/map/map-view'
import { NumberedPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { RouteLayer } from '@/components/map/route-layer'
import { useLocale } from '@/contexts/locale-context'

export type Coordinates = [number, number]

export interface PinStop {
  id: string
  coordinates: Coordinates
  /** The name as shown in the interface language; only used for the pin's label. */
  name: string
}

/** Luzerne's old town, where an empty tour starts. */
const LUCERNE: Coordinates = [8.3093, 47.0502]
const STOP_ZOOM = 16.2

/** "Drop a pin": the button, its hint, the crosshair and Escape to cancel. */
function DropPin({ dropping, onToggle }: { dropping: boolean, onToggle: () => void }) {
  const { t } = useLocale()
  const { map, drawn } = useMap()

  useEffect(() => {
    const canvas = map?.getCanvas()

    if (canvas)
      canvas.style.cursor = dropping ? 'crosshair' : ''
    if (!dropping)
      return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        onToggle()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [dropping, map, onToggle])

  if (!drawn)
    return null

  return (
    <MapCorner corner="top-left">
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        <Button className="min-h-11 shadow-surface" variant={dropping ? 'primary' : 'secondary'} onPress={onToggle}>
          {dropping ? <CloseIcon aria-hidden size={16} /> : <PlusIcon aria-hidden size={16} />}
          {t(dropping ? 'products.itinerary.drop.cancel' : 'products.itinerary.drop.start')}
        </Button>
        {dropping && (
          <p className="rounded-xl bg-surface px-3 py-2 text-sm shadow-surface" role="status">
            {t('products.itinerary.drop.hint')}
          </p>
        )}
      </div>
    </MapCorner>
  )
}

/**
 * The itinerary editor's map: the guest map's aerial photo, numbered pins and dashed route, seen from above so
 * pins are easy to place. Pins are numbered by their position in `stops` (as the guest map numbers them). Select a
 * pin to select its stop, drag it to move it, and "Drop a pin" then a tap adds a stop. The map is made once; typing
 * in a card never rebuilds it. If the map cannot load, the shared notice says so with a retry and the list carries on
 * without it. The map, pins, route, controls and credits are the shared map kit (components/map).
 */
export function ItineraryMap({
  stops,
  selectedId,
  onSelect,
  onMove,
  onDrop,
}: {
  stops: PinStop[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, coordinates: Coordinates) => void
  onDrop: (coordinates: Coordinates) => void
}) {
  const { t } = useLocale()
  const [dropping, setDropping] = useState(false)
  const toggleDropping = useCallback(() => setDropping(on => !on), [])
  // The map opens on the selected stop; with none selected it frames the whole route.
  const [start] = useState(() => stops.find(stop => stop.id === selectedId) ?? stops[0])
  const [framed] = useState(() => !selectedId && stops.length > 1)
  const coordinates = useMemo(() => stops.map(stop => stop.coordinates), [stops])
  const pins = useMemo(
    () => stops.map((stop, index) => ({
      id: stop.id,
      coordinates: stop.coordinates,
      number: index + 1,
      label: `${t('products.itinerary.stop.number', { n: index + 1 })}: ${stop.name}`,
    })),
    [stops, t],
  )

  return (
    <MapView
      cooperativeGestures
      className="relative isolate h-[min(52svh,340px)] min-h-72 rounded-2xl bg-surface-tertiary lg:h-[420px]"
      label={t('products.itinerary.map.label')}
      view={{ center: start?.coordinates ?? LUCERNE, zoom: start ? STOP_ZOOM : 12 }}
      onMapClick={(at) => {
        if (!dropping)
          return
        setDropping(false)
        onDrop(at)
      }}
    >
      <RouteLayer coordinates={coordinates} />
      <PinLayer
        draggable
        followSelected
        fit={framed ? 'first-load' : false}
        pins={pins}
        renderPin={(pin, state) => <NumberedPin id={pin.id} label={pin.label} number={pin.number} selected={state.selected} onPress={state.select} />}
        selectedId={selectedId ?? undefined}
        onMove={onMove}
        onSelect={onSelect}
      />
      <MapControls />
      <DropPin dropping={dropping} onToggle={toggleDropping} />
    </MapView>
  )
}
