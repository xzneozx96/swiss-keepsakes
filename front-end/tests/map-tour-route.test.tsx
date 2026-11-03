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
  it('keeps its look: 3D with terrain, the pitch and the bearing, and the shared credits', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!
    const style = map.options.style as { sources: Record<string, unknown>, sky?: unknown }

    expect(map.options).toMatchObject({ pitch: 55, bearing: -25, maxPitch: 65, zoom: 16.2, center: [8.3, 47.05], cooperativeGestures: true, attributionControl: false })
    expect(style.sources).toHaveProperty('dem')
    expect(style).toHaveProperty('sky')
    act(() => map.emit('load'))
    expect(map.setTerrain).toHaveBeenCalledWith({ source: 'dem', exaggeration: 1.3 })
  })

  it('draws the route line, the zoom, compass and fullscreen controls and one numbered pin per stop', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!

    act(() => map.emit('load'))
    act(() => map.emit('idle'))

    await waitFor(() => expect(map.addSource).toHaveBeenCalledWith('tour-route', expect.objectContaining({ type: 'geojson' })))
    expect(map.addLayer.mock.calls.map(([layer]) => layer.id)).toEqual(['tour-route-halo', 'tour-route-line'])
    expect(map.addControl).not.toHaveBeenCalled()
    for (const name of [en['map.zoomIn'], en['map.zoomOut'], en['map.compass'], en['map.fullscreen']])
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    await waitFor(() => expect(FakeMarker.instances).toHaveLength(3))
    const pins = FakeMarker.instances.map(marker => marker.getElement().querySelector('button')!)

    expect(pins.map(pin => pin.textContent)).toEqual(['1', '2', '3'])
    expect(pins.map(pin => pin.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
    expect(pins.map(pin => pin.className)).toEqual(['tour-map-marker', 'tour-map-marker', 'tour-map-marker'])
  })

  it('shows the stop card as the shared card, with the position and the first step disabled, and steps to the next stop', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('load'))

    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en['tourMap.previous'] })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: en['tourMap.next'] }))

    expect(await screen.findByRole('heading', { level: 3, name: 'Stop 1' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: en['tourMap.next'] })).toHaveFocus())
  })

  it('selects a stop from its pin and shows its card', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('load'))

    expect(screen.getByRole('heading', { level: 3, name: 'Stop 0' })).toBeInTheDocument()
    await waitFor(() => expect(FakeMarker.instances).toHaveLength(3))
    await userEvent.click(FakeMarker.instances[1]!.getElement().querySelector('button')!)

    expect(await screen.findByRole('heading', { level: 3, name: 'Stop 1' })).toBeInTheDocument()
    expect(FakeMarker.instances[1]!.getElement().querySelector('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the shared failed notice and builds a new map on Try again', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))

    expect(await screen.findByRole('alert')).toHaveTextContent(en['map.failed.title'])
    await userEvent.click(screen.getByRole('button', { name: en['map.failed.retry'] }))

    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
    expect(FakeMap.instances[0]!.remove).toHaveBeenCalled()
  })

  it('lifts the credits clear of the stop card and its ✕, at the bottom right', async () => {
    renderRoute()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('load'))
    const credits = document.querySelector<HTMLElement>('[data-map-credits]')!

    expect(credits).toHaveClass('end-2')
    // The card is 36 px above the bottom edge and its ✕ takes 44 px above it (jsdom has no layout, so the card is 0 px tall).
    expect(credits.style.bottom).toContain('88px')
  })
})
