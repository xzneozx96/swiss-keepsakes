import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ItineraryMap } from '@/features/merchant/products/components/itinerary/itinerary-map'
import { en } from '@/i18n/en'
import { FakeMap, FakeMarker, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

const stops = [
  { id: 'a', name: 'Station', coordinates: [8.3, 47.05] as [number, number] },
  { id: 'b', name: 'Bridge', coordinates: [8.31, 47.06] as [number, number] },
]

function renderMap(props: Partial<React.ComponentProps<typeof ItineraryMap>> = {}) {
  const handlers = { onSelect: vi.fn(), onMove: vi.fn(), onDrop: vi.fn() }

  render(
    <LocaleProvider>
      <ItineraryMap selectedId={null} stops={stops} {...handlers} {...props} />
    </LocaleProvider>,
  )

  return handlers
}

async function drawn() {
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  const map = FakeMap.instances[0]!

  await waitFor(() => expect(map.listeners.get('click')).toHaveLength(1))
  act(() => map.emit('load'))
  act(() => map.emit('idle'))

  return map
}

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

describe('[E4.6][shared-map] the itinerary editor map draws through the shared map component', () => {
  it('is a flat map with cooperative gestures, zoom controls only, and the route', async () => {
    renderMap()
    const map = await drawn()

    expect(map.options).toMatchObject({ pitch: 0, maxPitch: 0, dragRotate: false, cooperativeGestures: true, attributionControl: false })
    expect(screen.getByRole('button', { name: en['map.zoomIn'] })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en['map.compass'] })).toBeNull()
    expect(screen.queryByRole('button', { name: en['map.fullscreen'] })).toBeNull()
    await waitFor(() => expect(map.addSource).toHaveBeenCalledWith('tour-route', expect.anything()))
  })

  it('numbers the pins by position, labels them with the stop, and frames the route when no stop is selected', async () => {
    renderMap()
    const map = await drawn()

    expect(await screen.findByRole('button', { name: 'Stop 1: Station' })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Stop 2: Bridge' })).toHaveTextContent('2')
    await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1))
  })

  it('opens on the selected stop and marks its pin', async () => {
    renderMap({ selectedId: 'b' })
    const map = await drawn()

    expect(map.options).toMatchObject({ center: [8.31, 47.06] })
    expect(await screen.findByRole('button', { name: 'Stop 2: Bridge' })).toHaveAttribute('aria-pressed', 'true')
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('selects a stop from its pin and reports where a pin was dropped after a drag', async () => {
    const { onSelect, onMove } = renderMap()

    await drawn()
    await userEvent.click(await screen.findByRole('button', { name: 'Stop 2: Bridge' }))
    expect(onSelect).toHaveBeenCalledWith('b')
    const marker = FakeMarker.instances[1]!
    const dragEnd = marker.on.mock.calls.find(([event]) => event === 'dragend')![1] as () => void

    marker.lngLat = [8.312, 47.061]
    dragEnd()

    expect(onMove).toHaveBeenCalledWith('b', [8.312, 47.061])
    expect(marker.options.draggable).toBe(true)
  })

  it('adds a stop where the map is tapped after Drop a pin, once, and not before', async () => {
    const { onDrop } = renderMap()
    const map = await drawn()

    act(() => map.emit('click', { lngLat: { lng: 8.32, lat: 47.07 }, originalEvent: { target: map.getCanvas() } }))
    expect(onDrop).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: en['products.itinerary.drop.start'] }))
    expect(screen.getByText(en['products.itinerary.drop.hint'])).toBeInTheDocument()
    expect(map.getCanvas().style.cursor).toBe('crosshair')
    act(() => map.emit('click', { lngLat: { lng: 8.32, lat: 47.07 }, originalEvent: { target: map.getCanvas() } }))

    expect(onDrop).toHaveBeenCalledWith([8.32, 47.07])
    expect(screen.queryByText(en['products.itinerary.drop.hint'])).toBeNull()
    act(() => map.emit('click', { lngLat: { lng: 8.33, lat: 47.08 }, originalEvent: { target: map.getCanvas() } }))
    expect(onDrop).toHaveBeenCalledTimes(1)
  })

  it('does not count a tap on a pin as a dropped pin, and Escape cancels the drop', async () => {
    const { onDrop } = renderMap()
    const map = await drawn()
    const marker = document.createElement('div')

    marker.className = 'maplibregl-marker'
    document.body.append(marker)
    await userEvent.click(screen.getByRole('button', { name: en['products.itinerary.drop.start'] }))
    act(() => map.emit('click', { lngLat: { lng: 8.3, lat: 47.05 }, originalEvent: { target: marker } }))
    expect(onDrop).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: en['products.itinerary.drop.start'] })).toBeInTheDocument()
    expect(map.getCanvas().style.cursor).toBe('')
    marker.remove()
  })

  it('shows the shared failed notice with a retry when the map cannot load', async () => {
    renderMap()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))
    await userEvent.click(await screen.findByRole('button', { name: en['map.failed.retry'] }))

    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
  })
})
