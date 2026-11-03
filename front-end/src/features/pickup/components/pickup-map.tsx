import { useMemo } from 'react'

import { MapView } from '@/components/map/map-view'
import { TeardropPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { useLocale } from '@/contexts/locale-context'

const LUCERNE: [number, number] = [8.3068, 47.0535]

/**
 * Where the Google Maps link of a pickup point puts the pin, on the same map as the place editor. It only shows: the pin
 * is the link's position, which the API reads again on save, so there is nothing to drag. It opens on the pin and
 * starts again on it when a new link moves it. `onFailed` lets the sheet say the map could not load, as the place editor does.
 */
export function PickupMap({ lat, lng, title, onFailed }: {
  lat: number | null
  lng: number | null
  /** The point's name, written above the pin. */
  title?: string
  onFailed: () => void
}) {
  const { t } = useLocale()
  const position = useMemo<[number, number] | null>(() => (lat !== null && lng !== null ? [lng, lat] : null), [lat, lng])
  const pins = useMemo(() => (position ? [{ id: 'position', coordinates: position }] : []), [position])

  return (
    <MapView
      key={position ? `${position[0]},${position[1]}` : 'none'}
      className="relative h-56 rounded-2xl"
      label={t('pickup.map.label')}
      view={{ center: position ?? LUCERNE, zoom: position ? 16.5 : 15.2, minZoom: 12, maxZoom: 19 }}
      onFailed={onFailed}
    >
      <PinLayer anchor="bottom" labelsFromZoom={0} pins={pins} renderPin={() => <TeardropPin label={t('pickup.map.marker')} title={title} />} />
    </MapView>
  )
}
