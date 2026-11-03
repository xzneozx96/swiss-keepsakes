import type { LngLat } from '@/components/map/map-context'

import { act, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MapView } from '@/components/map/map-view'
import { RouteLayer } from '@/components/map/route-layer'
import { LocaleProvider } from '@/contexts/locale-context'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

const first: LngLat[] = [[8.3, 47.05], [8.31, 47.06]]
const second: LngLat[] = [[8.3, 47.05], [8.31, 47.06], [8.32, 47.07]]

function RouteMap({ coordinates }: { coordinates: LngLat[] }) {
  return (
    <LocaleProvider>
      <MapView label="Map" view={{ center: first[0], zoom: 15 }}>
        <RouteLayer coordinates={coordinates} />
      </MapView>
    </LocaleProvider>
  )
}

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

describe('[E4.6][shared-map] the route layer', () => {
  it('draws the halo and the dashed red line once the style has loaded, and not before', async () => {
    render(<RouteMap coordinates={first} />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!

    expect(map.addSource).not.toHaveBeenCalled()
    act(() => map.emit('load'))

    await waitFor(() => expect(map.addSource).toHaveBeenCalledTimes(1))
    const [halo, line] = map.addLayer.mock.calls.map(([layer]) => layer)

    expect(halo).toMatchObject({ id: 'tour-route-halo', paint: { 'line-color': '#fffaf4' } })
    expect(line).toMatchObject({ id: 'tour-route-line', paint: { 'line-color': '#d52b1e', 'line-dasharray': [2, 1] } })
  })

  it('follows a changed list through the source instead of adding it again', async () => {
    const setData = vi.fn()
    const { rerender } = render(<RouteMap coordinates={first} />)

    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!

    act(() => map.emit('load'))
    await waitFor(() => expect(map.addSource).toHaveBeenCalledTimes(1))
    map.getSource.mockReturnValue({ setData })
    rerender(<RouteMap coordinates={second} />)

    await waitFor(() => expect(setData).toHaveBeenCalledWith(expect.objectContaining({ geometry: { type: 'LineString', coordinates: second } })))
    expect(map.addSource).toHaveBeenCalledTimes(1)
  })

  it('comes back on the new map after a retry', async () => {
    render(<RouteMap coordinates={first} />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))
    await userEvent.click(document.querySelector<HTMLButtonElement>('[role="alert"] button')!)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
    act(() => FakeMap.instances[1]!.emit('load'))

    await waitFor(() => expect(FakeMap.instances[1]!.addSource).toHaveBeenCalledTimes(1))
  })
})
