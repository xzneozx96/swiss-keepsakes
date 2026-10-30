import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MapView } from '@/components/map/map-view'
import { PinLayer } from '@/components/map/pin-layer'
import { LocaleProvider } from '@/contexts/locale-context'
import { FakeMap, FakeMarker, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

interface Pin { id: string, coordinates: [number, number], name: string }

const pin = (id: string, name: string, lng: number): Pin => ({ id, name, coordinates: [lng, 47.05] })
const ranked = [pin('a', 'Alpha', 8.3), pin('b', 'Bravo', 8.31), pin('c', 'Charlie', 8.32)]

function renderLayer(props: Partial<React.ComponentProps<typeof PinLayer<Pin>>> = {}) {
  const onSelect = vi.fn()

  render(
    <LocaleProvider>
      <MapView label="Map" view={{ center: [8.3, 47.05], zoom: 15 }}>
        <PinLayer
          pins={ranked}
          renderPin={(pin, state) => (
            <button aria-pressed={state.selected} data-dimmed={state.dimmed} type="button" onClick={state.select}>{pin.name}</button>
          )}
          onSelect={onSelect}
          {...props}
        />
      </MapView>
    </LocaleProvider>,
  )

  return { onSelect }
}

async function ready() {
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  const map = FakeMap.instances[0]!

  await waitFor(() => expect(map.listeners.get('click')).toHaveLength(1))
  act(() => map.emit('load'))

  return map
}

beforeEach(() => {
  resetFakeMaps()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

describe('[E4.6][AC91] the pin layer', () => {
  it('draws one marker button per pin, in the tab order of the ranking', async () => {
    renderLayer()
    await ready()
    const names = await screen.findAllByRole('button', { name: /Alpha|Bravo|Charlie/ })

    expect(names.map(button => button.textContent)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    expect(FakeMarker.instances).toHaveLength(3)
  })

  it('puts a re-ranked pin first in the tab order', async () => {
    renderLayer({ pins: [ranked[2]!, ranked[0]!, ranked[1]!] })
    await ready()
    const names = await screen.findAllByRole('button', { name: /Alpha|Bravo|Charlie/ })

    expect(names.map(button => button.textContent)).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })

  it('dims a pin and never removes it, and marks the selected one', async () => {
    renderLayer({ dimmedIds: new Set(['b']), selectedId: 'c' })
    await ready()

    expect(await screen.findByRole('button', { name: 'Bravo' })).toHaveAttribute('data-dimmed', 'true')
    expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute('data-dimmed', 'false')
    expect(screen.getByRole('button', { name: 'Charlie' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: /Alpha|Bravo|Charlie/ })).toHaveLength(3)
  })

  it('selects a pin by its id', async () => {
    const { onSelect } = renderLayer()
    await ready()
    await userEvent.click(await screen.findByRole('button', { name: 'Bravo' }))

    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('merges close pins into one cluster, never the selected one, and keeps the others apart', async () => {
    const close = [pin('a', 'Alpha', 8.3), pin('b', 'Bravo', 8.30001), pin('c', 'Charlie', 8.32)]

    renderLayer({
      pins: close,
      renderCluster: members => <button type="button">{`${members.length} here`}</button>,
    })
    await ready()

    expect(await screen.findByRole('button', { name: '2 here' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bravo' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Charlie' })).toBeInTheDocument()
  })

  it('does not cluster when the screen gives no cluster look', async () => {
    renderLayer({ pins: [pin('a', 'Alpha', 8.3), pin('b', 'Bravo', 8.30001)] })
    await ready()

    expect(await screen.findByRole('button', { name: 'Bravo' })).toBeInTheDocument()
  })

  it('frames the first pins that arrive once, and brings a selected pin into the clear part of the map', async () => {
    const { onSelect } = renderLayer({ fit: 'first-load', followSelected: true, selectedId: 'a' })
    const map = await ready()

    await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [8.3, 47.05], zoom: 16 })))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('makes a draggable pin report where it was dropped', async () => {
    const onMove = vi.fn()

    renderLayer({ draggable: true, onMove })
    await ready()
    await screen.findByRole('button', { name: 'Alpha' })
    const marker = FakeMarker.instances[0]!
    const dragEnd = marker.on.mock.calls.find(([event]) => event === 'dragend')![1] as () => void

    marker.lngLat = [8.301, 47.051]
    dragEnd()

    expect(onMove).toHaveBeenCalledWith('a', [8.301, 47.051])
  })
})
