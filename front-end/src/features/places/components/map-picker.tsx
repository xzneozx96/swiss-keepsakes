import type { Map as MapLibreMap } from 'maplibre-gl'
import type { RefObject } from 'react'

import { useEffect, useMemo, useRef } from 'react'

import { RecenterIcon, TrashIcon } from '@/components/icons'
import { useMap } from '@/components/map/map-context'
import { MapControlButton, MapControls } from '@/components/map/map-controls'
import { MapView } from '@/components/map/map-view'
import { TeardropPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { reducedMotion } from '@/components/map/reduced-motion'
import { useLocale } from '@/contexts/locale-context'
import { useLatest } from '@/hooks/use-latest'

const LUCERNE: [number, number] = [8.3068, 47.0535]
const PIN_ID = 'position'
const RECENTER_ZOOM = 16.5
/** One arrow key press moves the pin about 5 m; with Shift about 25 m. */
const STEP = 0.00005
/** The space the controls (right), the credits (bottom) and the pin's own head (top) take, so a pin the camera brings to the middle is never under them (px). */
const CLEAR = { top: 56, right: 56, bottom: 52, left: 16 }
const OFFSET: [number, number] = [(CLEAR.left - CLEAR.right) / 2, (CLEAR.top - CLEAR.bottom) / 2]

const round = (value: number) => Number(value.toFixed(5))

/** Where the pin is on screen, inside the clear part of the map? */
function inClearPart(map: { project: (point: [number, number]) => { x: number, y: number }, getContainer: () => HTMLElement }, at: [number, number]) {
  const { x, y } = map.project(at)
  const { clientWidth, clientHeight } = map.getContainer()

  return x >= CLEAR.left && x <= clientWidth - CLEAR.right && y >= CLEAR.top && y <= clientHeight - CLEAR.bottom
}

/**
 * The camera and the controls of the picker, on the map once it exists. The camera brings the pin to the middle of the
 * clear part of the map when the position comes from somewhere else (a link, the coordinate fields), and only keeps it in
 * the clear part when the person moved it on the map themselves (a tap, a drag, a key), so the map never jumps under their
 * hand. Recenter does the same for a person who has dragged the map away.
 */
function PickerLayers({ position, ownMoveRef, onRemove }: { position: [number, number] | null, ownMoveRef: RefObject<string | null>, onRemove?: () => void }) {
  const { t } = useLocale()
  const { map } = useMap()
  const key = position ? `${position[0]},${position[1]}` : null
  const settledRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    if (!map)
      return
    // A new map opens on the pin already.
    if (settledRef.current !== map) {
      settledRef.current = map

      return
    }
    if (!position)
      return
    const own = ownMoveRef.current === key

    if (own && inClearPart(map, position))
      return
    map.easeTo({
      center: position,
      zoom: own ? map.getZoom() : Math.max(map.getZoom(), RECENTER_ZOOM),
      offset: OFFSET,
      duration: reducedMotion() ? 0 : 400,
    })
    // `key` stands for the position: the effect runs when it changes, not on a new array with the same numbers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  function recenter() {
    map?.easeTo({
      center: position ?? LUCERNE,
      zoom: position ? RECENTER_ZOOM : 15.2,
      offset: position ? OFFSET : [0, 0],
      duration: reducedMotion() ? 0 : 400,
    })
  }

  return (
    <MapControls>
      <MapControlButton icon={RecenterIcon} label={t('places.map.recenter')} onPress={recenter} />
      {position && onRemove && <MapControlButton icon={TrashIcon} label={t('places.map.clear')} tone="danger" onPress={onRemove} />}
    </MapControls>
  )
}

/**
 * The position picker of the place editor, on the same flat aerial photo style as the guest map, so a pin placed
 * here lands where the guest map draws it. A tap places the pin, the pin drags, and the arrow keys nudge it. The map,
 * zoom, credits and loading are the shared map kit; Recenter and Remove position are two more round buttons under the
 * zoom. If the map cannot load, `onFailed` lets the step show coordinate fields instead.
 */
export function MapPicker({ lat, lng, title, onPlace, onFailed, onRemove, className = 'h-72 lg:h-96' }: {
  lat: number | null
  lng: number | null
  /** The place's current title, written above the pin; none while it is empty. */
  title?: string
  onPlace: (position: { lat: number, lng: number }) => void
  onFailed: () => void
  /** The Remove position button; without it there is none. */
  onRemove?: () => void
  /** The size of the box, as height classes; the width is the parent's. */
  className?: string
}) {
  const { t } = useLocale()
  const position = useMemo<[number, number] | null>(() => (lat !== null && lng !== null ? [lng, lat] : null), [lat, lng])
  const pins = useMemo(() => (position ? [{ id: PIN_ID, coordinates: position }] : []), [position])
  // The last position the person set on the map itself, to tell it from one that came from a link or the fields.
  const ownMoveRef = useRef<string | null>(null)
  const latest = useLatest({ lat, lng, onPlace })

  function place(at: { lat: number, lng: number }) {
    ownMoveRef.current = `${at.lng},${at.lat}`
    latest.current.onPlace(at)
  }

  function nudge(event: React.KeyboardEvent) {
    const step = event.shiftKey ? STEP * 5 : STEP
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowUp: [step, 0], ArrowDown: [-step, 0] }
    const move = moves[event.key]
    const { lat: at, lng: along } = latest.current

    if (!move || at === null || along === null)
      return
    event.preventDefault()
    place({ lat: round(at + move[0]), lng: round(along + move[1]) })
  }

  return (
    <MapView
      className={`relative rounded-2xl ${className}`}
      label={t('places.map.label')}
      view={{ center: position ?? LUCERNE, zoom: position ? 16.5 : 15.2, minZoom: 12, maxZoom: 19 }}
      onFailed={onFailed}
      onMapClick={([along, at]) => place({ lat: round(at), lng: round(along) })}
    >
      <PinLayer
        draggable
        anchor="bottom"
        labelsFromZoom={0}
        pins={pins}
        renderPin={() => <TeardropPin describedBy="places-map-help" label={t('places.map.marker')} title={title} onKeyDown={nudge} />}
        onMove={(_id, [along, at]) => place({ lat: round(at), lng: round(along) })}
      />
      <PickerLayers ownMoveRef={ownMoveRef} position={position} onRemove={onRemove} />
    </MapView>
  )
}
