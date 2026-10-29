import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MapCredits } from '@/components/aerial-map/map-credits'
import { useAerialMap } from '@/components/aerial-map/use-aerial-map'
import { FakeMap, resetFakeMaps } from './support/fake-maplibre'

vi.mock('maplibre-gl', async () => (await import('./support/fake-maplibre')).fakeMaplibre)
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/worker.mjs' }))

function Probe({ terrain = false, options = {} }: { terrain?: boolean, options?: Record<string, unknown> }) {
  const { containerRef, state, retry } = useAerialMap({ options, terrain })

  return (
    <div>
      <div ref={containerRef} />
      <p data-testid="state">{state}</p>
      <button type="button" onClick={retry}>retry</button>
    </div>
  )
}

beforeEach(() => {
  resetFakeMaps()
  // The OpenFreeMap names are unreachable: the style falls back to the photo alone, which still has the 3D parts to strip.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('[E4.6][G11] the shared aerial map', () => {
  it('draws a flat map: no elevation source, no sky, no tilt, no rotation', async () => {
    render(<Probe />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const { options } = FakeMap.instances[0]!
    const style = options.style as { sources: Record<string, { type: string }>, sky?: unknown }

    expect(Object.keys(style.sources)).toContain('photo')
    expect(Object.values(style.sources).some(source => source.type === 'raster-dem')).toBe(false)
    expect(style).not.toHaveProperty('sky')
    expect(options).toMatchObject({ pitch: 0, maxPitch: 0, dragRotate: false, pitchWithRotate: false, touchPitch: false })
    expect(JSON.stringify(style)).not.toContain('terrarium')
  })

  it('is ready once the style has loaded, and does not set terrain', async () => {
    render(<Probe />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    expect(screen.getByTestId('state')).toHaveTextContent('loading')
    act(() => FakeMap.instances[0]!.emit('load'))

    expect(screen.getByTestId('state')).toHaveTextContent('ready')
    expect(FakeMap.instances[0]!.setTerrain).not.toHaveBeenCalled()
  })

  it('keeps the 3D parts only when a map asks for terrain (the tour route map until E4.12)', async () => {
    render(<Probe terrain options={{ pitch: 55, maxPitch: 65 }} />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    const style = FakeMap.instances[0]!.options.style as { sources: Record<string, unknown>, sky?: unknown }

    expect(style.sources).toHaveProperty('dem')
    expect(style).toHaveProperty('sky')
    expect(FakeMap.instances[0]!.options).toMatchObject({ pitch: 55, maxPitch: 65 })
    act(() => FakeMap.instances[0]!.emit('load'))
    expect(FakeMap.instances[0]!.setTerrain).toHaveBeenCalledWith({ source: 'dem', exaggeration: 1.3 })
  })

  it('fails when the style cannot be loaded, and builds a new map on retry', async () => {
    render(<Probe />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0]!.emit('error'))

    expect(screen.getByTestId('state')).toHaveTextContent('error')
    await userEvent.click(screen.getByRole('button', { name: 'retry' }))

    await waitFor(() => expect(FakeMap.instances).toHaveLength(2))
    expect(FakeMap.instances[0]!.remove).toHaveBeenCalled()
    expect(screen.getByTestId('state')).toHaveTextContent('loading')
  })

  it('removes the map when the screen goes away', async () => {
    const { unmount } = render(<Probe />)
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    unmount()

    expect(FakeMap.instances[0]!.remove).toHaveBeenCalled()
  })
})

describe('[E4.6][G11] map credits', () => {
  it('links swisstopo, OpenFreeMap, OpenMapTiles and OpenStreetMap', () => {
    render(<MapCredits />)

    expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual([
      '© swisstopo',
      'OpenFreeMap',
      '© OpenMapTiles',
      '© OpenStreetMap',
    ])
  })
})
