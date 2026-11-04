import type { Map as MapLibreMap } from 'maplibre-gl'
import type { RefObject } from 'react'
import type { MapInstanceState, MapLibre } from './use-map-instance'

import { createContext, use } from 'react'

export type LngLat = [lng: number, lat: number]

/** The space (px) the screen's own overlays take at the top and bottom of the frame. */
export interface MapInsets {
  top: number
  bottom: number
}

/** The phone's guest tab bar (px). */
export const GUEST_TAB_BAR = 68

export interface MapContextValue {
  map: MapLibreMap | null
  maplibre: MapLibre | null
  state: MapInstanceState
  /** True from the map's first idle after its style loaded: the visible tiles are on screen. */
  drawn: boolean
  mode: 'flat' | '3d'
  insets: MapInsets
  /** The space (px) the screen keeps clear at the frame's foot for the guest tab bar: `GUEST_TAB_BAR`, or 0 for a map that ends above it (the home's embedded map). Overlays at the foot read it. */
  tabBarSpace: number
  frameRef: RefObject<HTMLDivElement | null>
  fullscreen: boolean
  setFullscreen: (on: boolean) => void
}

export const MapContext = createContext<MapContextValue | null>(null)

/** The map and its state, for the layers and controls drawn inside a `MapView`. */
export function useMap(): MapContextValue {
  const value = use(MapContext)

  if (!value)
    throw new Error('useMap needs a MapView around it')

  return value
}
