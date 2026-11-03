import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { MapPicker } from '@/features/places/components/map-picker'
import { en } from '@/i18n/en'
import { FakeMap, FakeMarker, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

// The map is 600 x 300 px; the clear part leaves 56 px for the controls on the right, 52 for the credits below and 56 for the pin's head above.
const OFFSET = [-20, 2]

function renderPicker(props: { lat: number | null, lng: number | null } & Partial<React.ComponentProps<typeof MapPicker>>) {
  const handlers = { onPlace: vi.fn(), onFailed: vi.fn(), onRemove: vi.fn() }
  const ui = (next: typeof props) => (
    <LocaleProvider>
      <p id="places-map-help">Arrow keys move the pin</p>
      <MapPicker {...handlers} {...next} />
    </LocaleProvider>
  )
  const view = render(ui(props))

  return { ...handlers, rerender: (next: typeof props) => view.rerender(ui(next)) }
}

async function ready() {
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
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('[E4.2][AC68] the place picker draws through the shared map component', () => {
  it('is a flat map that opens on the pin, with a teardrop pin that drags', async () => {
    renderPicker({ lat: 47.05, lng: 8.3 })
    const map = await ready()

    expect(map.options).toMatchObject({ center: [8.3, 47.05], zoom: 16.5, minZoom: 12, maxZoom: 19, pitch: 0, dragRotate: false })
    const pin = await screen.findByRole('button', { name: en['places.map.marker'] })

    expect(pin).toHaveAccessibleDescription('Arrow keys move the pin')
    expect(FakeMarker.instances[0]!.options).toMatchObject({ anchor: 'bottom', draggable: true })
  })

  it('places the pin where the map is tapped, rounded to five decimals, without moving the camera', async () => {
    const { onPlace } = renderPicker({ lat: null, lng: null })
    const map = await ready()

    act(() => map.emit('click', { lngLat: { lng: 8.3123456, lat: 47.0512345 }, originalEvent: { target: map.getCanvas() } }))

    expect(onPlace).toHaveBeenCalledWith({ lat: 47.05123, lng: 8.31235 })
    expect(map.easeTo).not.toHaveBeenCalled()
  })

  it('reports where the pin was dropped after a drag, and nudges it with the arrow keys (Shift for five times as far)', async () => {
    const { onPlace } = renderPicker({ lat: 47.05, lng: 8.3 })

    await ready()
    const pin = await screen.findByRole('button', { name: en['places.map.marker'] })
    const marker = FakeMarker.instances[0]!
    const dragEnd = marker.on.mock.calls.find(([event]) => event === 'dragend')![1] as () => void

    marker.lngLat = [8.30123, 47.05123]
    dragEnd()
    expect(onPlace).toHaveBeenLastCalledWith({ lat: 47.05123, lng: 8.30123 })
    fireEvent.keyDown(pin, { key: 'ArrowRight' })
    expect(onPlace).toHaveBeenLastCalledWith({ lat: 47.05, lng: 8.30005 })
    fireEvent.keyDown(pin, { key: 'ArrowUp', shiftKey: true })
    expect(onPlace).toHaveBeenLastCalledWith({ lat: 47.05025, lng: 8.3 })
  })

  it('eases to the middle of the clear part of the map when the position comes from a link, even if the pin was in view', async () => {
    const { rerender } = renderPicker({ lat: 47.05, lng: 8.3 })
    const map = await ready()

    // Under the credits, yet inside the map: the old picker left it there.
    map.project = () => ({ x: 300, y: 290 })
    rerender({ lat: 47.0516, lng: 8.3074, onPlace: vi.fn(), onFailed: vi.fn() })

    await waitFor(() => expect(map.easeTo).toHaveBeenCalledTimes(1))
    expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [8.3074, 47.0516], zoom: 16.5, offset: OFFSET }))
  })

  it('keeps the zoom when a link comes while the person has zoomed in closer', async () => {
    const { rerender } = renderPicker({ lat: 47.05, lng: 8.3 })
    const map = await ready()

    map.zoom = 18
    rerender({ lat: 47.0516, lng: 8.3074 })

    await waitFor(() => expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 18 })))
  })

  it('leaves the camera alone when the person moves the pin on the map and it stays in the clear part', async () => {
    const onPlace = vi.fn()
    const { rerender } = renderPicker({ lat: 47.05, lng: 8.3, onPlace })
    const map = await ready()

    map.project = () => ({ x: 300, y: 150 })
    const pin = await screen.findByRole('button', { name: en['places.map.marker'] })

    fireEvent.keyDown(pin, { key: 'ArrowRight' })
    rerender({ lat: 47.05, lng: 8.30005, onPlace })

    expect(map.easeTo).not.toHaveBeenCalled()
  })

  it('brings a pin the person moved into the clear part when it ends under the controls or the credits', async () => {
    const onPlace = vi.fn()
    const { rerender } = renderPicker({ lat: 47.05, lng: 8.3, onPlace })
    const map = await ready()

    map.project = () => ({ x: 590, y: 150 })
    const pin = await screen.findByRole('button', { name: en['places.map.marker'] })

    fireEvent.keyDown(pin, { key: 'ArrowRight' })
    rerender({ lat: 47.05, lng: 8.30005, onPlace })

    await waitFor(() => expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [8.30005, 47.05], offset: OFFSET })))
  })

  it('recenters on the pin with the same clearance, and on Lucerne while there is no pin', async () => {
    const { rerender } = renderPicker({ lat: 47.05, lng: 8.3 })
    const map = await ready()

    await userEvent.click(screen.getByRole('button', { name: en['places.map.recenter'] }))
    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [8.3, 47.05], zoom: 16.5, offset: OFFSET }))
    rerender({ lat: null, lng: null })
    await userEvent.click(screen.getByRole('button', { name: en['places.map.recenter'] }))

    expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [8.3068, 47.0535], zoom: 15.2, offset: [0, 0] }))
  })

  it('shows Remove the position, with the destructive look, only while there is a position', async () => {
    const { onRemove, rerender } = renderPicker({ lat: null, lng: null })

    await ready()
    expect(screen.queryByRole('button', { name: en['places.map.clear'] })).toBeNull()
    rerender({ lat: 47.05, lng: 8.3 })
    const remove = await screen.findByRole('button', { name: en['places.map.clear'] })

    expect(remove.className).toContain('--danger-soft-hover')
    await userEvent.click(remove)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('tells the step when the map cannot load, so it shows the coordinate fields', async () => {
    const { onFailed } = renderPicker({ lat: null, lng: null })

    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))

    await waitFor(() => expect(onFailed).toHaveBeenCalled())
  })
})
