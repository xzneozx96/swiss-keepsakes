import type { Map as MapLibreMap } from 'maplibre-gl'

import { createFileRoute, Link } from '@tanstack/react-router'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'react'

import { demSource, loadAerialStyle } from '@/features/tours/map/aerial-style'
import { tourSeed } from '@/features/tours/seed'
import { noIndexHead } from '@/lib/no-index'

/** Lab: simple ways to make the 3D tour map look less like blocks. Not part of the product. */
export const Route = createFileRoute('/lab/map')({
  ssr: false,
  head: noIndexHead,
  component: MapLab,
})

const LIBERTY = 'https://tiles.openfreemap.org/styles/liberty'
const options = [
  {
    id: 'A',
    title: 'A · Current',
    note: 'OpenFreeMap Liberty: drawn map with extruded OSM building boxes.',
    style: LIBERTY,
    terrain: false,
  },
  {
    id: 'B',
    title: 'B · Aerial photo with terrain',
    note: 'swisstopo SWISSIMAGE draped over real relief, with place, road and water names on top. Chosen on 15.10.2026.',
    style: 'aerial',
    terrain: true,
  },
  {
    id: 'C',
    title: 'C · Current style with terrain',
    note: 'Same drawn map, plus real relief. Buildings stay boxes.',
    style: LIBERTY,
    terrain: true,
  },
]

const tour = tourSeed.find(item => item.itinerary.length > 1) ?? tourSeed[0]

function LabMap({
  style,
  terrain,
}: Pick<(typeof options)[number], 'style' | 'terrain'>) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current

    if (!container)
      return
    let map: MapLibreMap | undefined
    let disposed = false

    void Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css'),
      style === 'aerial' ? loadAerialStyle() : style,
    ]).then(([{ Map, setWorkerUrl }, , resolved]) => {
      if (disposed)
        return
      setWorkerUrl(workerUrl)
      const first = tour.itinerary[0].coordinates

      map = new Map({
        container,
        style: resolved,
        center: first,
        zoom: 15.5,
        pitch: 60,
        bearing: -25,
        maxPitch: 75,
        cooperativeGestures: true,
      })
      map.on('load', () => {
        if (!map)
          return
        if (terrain) {
          if (!map.getSource('dem'))
            map.addSource('dem', demSource)
          map.setTerrain({ source: 'dem', exaggeration: 1.3 })
        }
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: tour.itinerary.map(stop => stop.coordinates),
            },
          },
        })
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#d52b1e', 'line-width': 4 },
        })
      })
    })

    return () => {
      disposed = true
      map?.remove()
    }
  }, [style, terrain])

  return (
    <div ref={ref} className="h-[420px] w-full overflow-hidden rounded-2xl" />
  )
}

function MapLab() {
  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <div className="flex w-[375px] flex-col gap-10 bg-background py-6 shadow-overlay">
        <header className="flex flex-col gap-1 px-4">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">3D map look</h1>
          <p className="text-sm text-muted">
            Same stop and route (
            {tour.id}
            ), three basemaps. Drag with two
            fingers to tilt.
          </p>
        </header>
        {options.map(({ id, title, note, style, terrain }) => (
          <section key={id} className="flex flex-col gap-3 px-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <LabMap style={style} terrain={terrain} />
          </section>
        ))}
      </div>
    </div>
  )
}
