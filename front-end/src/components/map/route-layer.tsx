import type { GeoJSONSource } from 'maplibre-gl'
import type { LngLat } from './map-context'

import { useEffect } from 'react'

import { useMap } from './map-context'

const SOURCE = 'tour-route'

const lineOf = (coordinates: LngLat[]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }) as const

/**
 * The route on the shared map: a dashed red line over a light halo, through `coordinates` in order. It is drawn
 * once the style has loaded, follows a changed list, and comes back on a new map (a retry). Give it a list that
 * only changes when a stop does.
 */
export function RouteLayer({ coordinates }: { coordinates: LngLat[] }) {
  const { map, state } = useMap()

  useEffect(() => {
    if (!map || state !== 'ready')
      return
    const source = map.getSource<GeoJSONSource>(SOURCE)

    if (source) {
      source.setData(lineOf(coordinates))

      return
    }
    map.addSource(SOURCE, { type: 'geojson', data: lineOf(coordinates) })
    map.addLayer({
      id: 'tour-route-halo',
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#fffaf4', 'line-width': 8, 'line-opacity': 0.9 },
    })
    map.addLayer({
      id: 'tour-route-line',
      type: 'line',
      source: SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#d52b1e', 'line-width': 4, 'line-dasharray': [2, 1] },
    })
  }, [map, state, coordinates])

  return null
}
