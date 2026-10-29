import type { Tour } from '@sk/domain/bookings'

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { TourItineraryMap } from '@/features/tours/map/tour-itinerary-map'
import { en } from '@/i18n/en'
import { FakeMap, FakeMarker, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

function stop(n: number, lng: number, lat: number) {
  return {
    id: `stop-${n}`,
    name: { en: `Stop ${n}`, de: `Halt ${n}` },
    description: { en: `About ${n}`, de: `Über ${n}` },
    minutesFromStart: n * 10,
    coordinates: [lng, lat] as [number, number],
    photo: '',
  }
}

const tour = {
  id: 'tour-1',
  itinerary: [stop(0, 8.3, 47.05), stop(1, 8.31, 47.06), stop(2, 8.32, 47.07)],
} as unknown as Tour

class ImmediateObserver {
  constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
  observe() {
    this.callback([{ isIntersecting: true }])
  }

  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  resetFakeMaps()
  localStorage.clear()
  vi.stubGlobal('IntersectionObserver', ImmediateObserver)
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderRoute() {
  return render(
    <LocaleProvider>
      <TourItineraryMap tour={tour} />
    </LocaleProvider>,
  )
}

describe('[E4.6][shared-map] the tour route map draws through the shared map component', () => {
  it('keeps its look: 3D with terrain, the pitch, the bearing and the compact credits', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!
    const style = map.options.style as { sources: Record<string, unknown>, sky?: unknown }

    expect(map.options).toMatchObject({ pitch: 55, bearing: -25, maxPitch: 65, zoom: 16.2, center: [8.3, 47.05], cooperativeGestures: true, attributionControl: { compact: true } })
    expect(style.sources).toHaveProperty('dem')
    expect(style).toHaveProperty('sky')
    act(() => map.emit('load'))
    expect(map.setTerrain).toHaveBeenCalledWith({ source: 'dem', exaggeration: 1.3 })
  })

  it('draws the route line, the zoom and fullscreen controls and one numbered pin per stop', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!

    act(() => map.emit('load'))

    expect(map.addSource).toHaveBeenCalledWith('tour-route', expect.objectContaining({ type: 'geojson' }))
    expect(map.addLayer.mock.calls.map(([layer]) => layer.id)).toEqual(['tour-route-halo', 'tour-route-line'])
    expect(map.addControl).toHaveBeenCalledTimes(2)
    const pins = FakeMarker.instances.map(marker => marker.getElement())

    expect(pins.map(pin => pin.textContent)).toEqual(['1', '2', '3'])
    expect(pins.map(pin => pin.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
  })

  it('selects a stop from its pin and shows its card', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('load'))

    expect(screen.getByRole('heading', { level: 3, name: 'Stop 0' })).toBeInTheDocument()
    await userEvent.click(FakeMarker.instances[1]!.getElement())

    expect(await screen.findByRole('heading', { level: 3, name: 'Stop 1' })).toBeInTheDocument()
    expect(FakeMarker.instances[1]!.getElement()).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the unavailable message and builds a new map on Reload', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))

    expect(await screen.findByText(en['tourMap.unavailable'])).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: en['tourMap.retry'] }))

    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
    expect(FakeMap.instances[0]!.remove).toHaveBeenCalled()
  })
})
