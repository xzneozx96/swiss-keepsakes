import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hiddenLabels } from '@/components/map/label-collisions'
import { MapView } from '@/components/map/map-view'
import { PhotoPin, TeardropPin } from '@/components/map/pin-faces'
import { PinLayer } from '@/components/map/pin-layer'
import { LocaleProvider } from '@/contexts/locale-context'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

const box = (id: string, left: number, top = 0, width = 100, height = 16) => ({ id, left, top, right: left + width, bottom: top + height })

describe('hiddenLabels', () => {
  it('keeps the first label of two that overlap heavily, and every label that is clear', () => {
    expect(hiddenLabels([box('a', 0), box('b', 20), box('c', 400)])).toEqual(new Set(['b']))
  })

  it('keeps two labels that only touch at the edge or overlap a little', () => {
    expect(hiddenLabels([box('a', 0), box('b', 100), box('c', 190)])).toEqual(new Set())
  })
})

describe('the title above a pin', () => {
  beforeEach(() => {
    resetFakeMaps()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  })

  it('is a picture of the name: the pin button keeps its own label, the title takes no pointer events', () => {
    render(
      <LocaleProvider>
        <PhotoPin dimmed={false} emphasized={false} id="a" label="Chapel Bridge" selected={false} title="Chapel Bridge" onPress={() => undefined} />
        <TeardropPin label="Pin position" title="Lion Monument" />
      </LocaleProvider>,
    )

    expect(screen.getByRole('button', { name: 'Chapel Bridge' })).toBeInTheDocument()
    const labels = document.querySelectorAll('[data-pin-label]')

    expect(labels).toHaveLength(2)
    labels.forEach((label) => {
      expect(label).toHaveAttribute('aria-hidden', 'true')
      expect(label).toHaveClass('pointer-events-none', 'max-w-[140px]', 'truncate')
    })
  })

  it('has no label without a title', () => {
    render(<TeardropPin label="Pin position" />)

    expect(document.querySelector('[data-pin-label]')).toBeNull()
  })

  it('is switched off below the layer\'s zoom and back on above it, and cleaned up with the layer', async () => {
    const { unmount } = render(
      <LocaleProvider>
        <MapView label="Map" view={{ center: [8.3, 47.05], zoom: 12 }}>
          <PinLayer pins={[{ id: 'a', coordinates: [8.3, 47.05] }]} renderPin={() => <TeardropPin label="Pin" title="Alpha" />} />
        </MapView>
      </LocaleProvider>,
    )

    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const map = FakeMap.instances[0]!
    const container = map.getContainer()

    await waitFor(() => expect(container).toHaveClass('pin-labels-off'))
    map.zoom = 16
    act(() => map.emit('moveend'))
    expect(container).not.toHaveClass('pin-labels-off')
    map.zoom = 13
    act(() => map.emit('moveend'))
    expect(container).toHaveClass('pin-labels-off')
    unmount()
  })
})
