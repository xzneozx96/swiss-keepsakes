import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl'

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLatest } from '@/hooks/use-latest'
import { loadAerialStyle } from '@/features/tours/map/aerial-style'
import { loadFlatAerialStyle } from './flat-style'

export type AerialMapState = 'loading' | 'ready' | 'error'
export type MapLibre = typeof import('maplibre-gl')

/** A map that has not drawn its style after this long has failed (a lost connection never fires an error). */
const LOAD_TIMEOUT_MS = 16_000

/** Flat: no tilt, no rotation by drag, keyboard or touch (decision G11). A caller's options win. */
const flatView: Partial<MapOptions> = {
  pitch: 0,
  maxPitch: 0,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  attributionControl: false,
}

/**
 * The one MapLibre map of the guest app: the guest map and the tour route map both draw through
 * it. MapLibre and its CSS load by dynamic `import()` (AGENTS.md rule 9), the style is the
 * SWISSIMAGE photo with OpenFreeMap names, and the map is flat. `terrain` keeps the elevation
 * source and the sky for the tour route map, which stays 3D until E4.12 flattens it; no other map
 * should pass it.
 *
 * The map exists once the hook returns it, before its style has drawn. `state` is `ready` after
 * the style loaded, when layers can be added. `lazy` builds the map only when its container comes
 * near the viewport. `resetKey` builds a new map when it changes.
 */
export function useAerialMap({
  options,
  terrain = false,
  lazy = false,
  resetKey,
}: {
  options: Omit<MapOptions, 'container' | 'style'>
  terrain?: boolean
  lazy?: boolean
  resetKey?: unknown
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [maplibre, setMaplibre] = useState<MapLibre | null>(null)
  const [state, setState] = useState<AerialMapState>('loading')
  const [attempt, setAttempt] = useState(0)
  const [seenKey, setSeenKey] = useState(resetKey)
  const latest = useLatest({ options, terrain })

  // A new map for a new key starts from loading (adjusted during render, not in an effect).
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setState('loading')
    setMap(null)
  }

  useEffect(() => {
    const container = containerRef.current

    if (!container)
      return
    let disposed = false
    let started = false
    let resizeObserver: ResizeObserver | undefined
    let instance: MapLibreMap | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined

    async function initialize() {
      if (started)
        return
      started = true
      try {
        const { terrain: withTerrain, options: mapOptions } = latest.current
        const styleLoading = withTerrain ? loadAerialStyle() : loadFlatAerialStyle()
        const [lib] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ])
        const style = await styleLoading

        if (disposed || !container)
          return
        lib.setWorkerUrl(workerUrl)
        const created = new lib.Map({
          ...(withTerrain ? {} : flatView),
          ...mapOptions,
          container,
          style,
        })

        instance = created
        if (!withTerrain) {
          created.touchZoomRotate.disableRotation()
          created.keyboard.disableRotation()
        }
        created.on('load', () => {
          if (disposed)
            return
          clearTimeout(timeout)
          if (withTerrain)
            created.setTerrain({ source: 'dem', exaggeration: 1.3 })
          setState('ready')
        })
        timeout = setTimeout(() => {
          if (!disposed)
            setState('error')
        }, LOAD_TIMEOUT_MS)
        created.on('error', () => {
          if (!created.isStyleLoaded() && !disposed)
            setState('error')
        })
        resizeObserver = new ResizeObserver(() => created.resize())
        resizeObserver.observe(container)
        setMaplibre(lib)
        setMap(created)
      }
      catch {
        if (!disposed)
          setState('error')
      }
    }

    const observer = lazy
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
              observer?.disconnect()
              void initialize()
            }
          },
          { rootMargin: '240px' },
        )
      : undefined

    if (observer)
      observer.observe(container)
    else void initialize()

    return () => {
      disposed = true
      clearTimeout(timeout)
      observer?.disconnect()
      resizeObserver?.disconnect()
      instance?.remove()
    }
  }, [attempt, lazy, resetKey, latest])

  const retry = useCallback(() => {
    setState('loading')
    setMap(null)
    setAttempt(value => value + 1)
  }, [])

  return { containerRef, map, maplibre, state, retry }
}
