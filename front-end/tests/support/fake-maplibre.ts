import { vi } from 'vitest'

type Listener = (event?: unknown) => void

/** A stand-in for maplibre-gl in jsdom: it records what the app asks of the map and lets a test fire map events. */
export class FakeMap {
  static instances: FakeMap[] = []

  listeners = new Map<string, Listener[]>()
  canvas = document.createElement('canvas')
  loaded = false
  /** Set by a test to say the style is not loaded, as MapLibre does while tiles are on the way. */
  styleLoadedOverride: boolean | undefined
  zoom: number
  remove = vi.fn()
  resize = vi.fn()
  setTerrain = vi.fn()
  addSource = vi.fn()
  addLayer = vi.fn()
  addControl = vi.fn()
  easeTo = vi.fn()
  flyTo = vi.fn()
  fitBounds = vi.fn()
  touchZoomRotate = { disableRotation: vi.fn() }
  keyboard = { disableRotation: vi.fn() }

  constructor(public options: Record<string, unknown>) {
    this.zoom = typeof options.zoom === 'number' ? options.zoom : 15
    ;(options.container as HTMLElement | undefined)?.appendChild(this.canvas)
    FakeMap.instances.push(this)
  }

  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener])

    return this
  }

  emit(event: string, payload?: unknown) {
    if (event === 'load')
      this.loaded = true
    this.listeners.get(event)?.forEach(listener => listener(payload))
  }

  isStyleLoaded() {
    return this.styleLoadedOverride ?? this.loaded
  }

  getCanvas() {
    return this.canvas
  }

  getZoom() {
    return this.zoom
  }

  project([lng, lat]: [number, number]) {
    // One degree is far apart on screen, so no two test pins merge unless they share a coordinate.
    return { x: lng * 100_000, y: lat * 100_000 }
  }
}

export class FakeMarker {
  static instances: FakeMarker[] = []

  lngLat: [number, number] = [0, 0]
  element: HTMLElement
  remove = vi.fn(() => this.element.remove())

  constructor(options: { element: HTMLElement }) {
    this.element = options.element
    FakeMarker.instances.push(this)
  }

  setLngLat(lngLat: [number, number]) {
    this.lngLat = lngLat

    return this
  }

  addTo(map: FakeMap) {
    map.getCanvas().parentElement?.appendChild(this.element)

    return this
  }

  getElement() {
    return this.element
  }
}

class FakeControl {
  on() {
    return this
  }
}

class FakeBounds {
  extend() {
    return this
  }
}

export const fakeMaplibre = {
  Map: FakeMap,
  Marker: FakeMarker,
  NavigationControl: FakeControl,
  FullscreenControl: FakeControl,
  LngLatBounds: FakeBounds,
  setWorkerUrl: vi.fn(),
}

export function resetFakeMaps() {
  FakeMap.instances = []
  FakeMarker.instances = []
}
